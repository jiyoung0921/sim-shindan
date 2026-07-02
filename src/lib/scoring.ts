import {
  DiagnosisAnswers,
  DiagnosisResult,
  PersonaType,
  PlanRecommendation,
  PlanRecord,
  PriceTier,
  Verdict,
  RecommendedAction,
  Discount,
} from "./types";

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

/** データ使用量に最適なPriceTierを選択 */
function selectTier(plan: PlanRecord, data_usage_gb: number | "unknown"): PriceTier | null {
  if (plan.billing.tiers.length === 0) return null;

  const usage = data_usage_gb === "unknown" ? 10 : data_usage_gb;

  // 使用量をカバーする最小の段階を選ぶ
  const sorted = [...plan.billing.tiers].sort((a, b) => {
    const aMax = a.up_to_gb === "unlimited" ? Infinity : a.up_to_gb;
    const bMax = b.up_to_gb === "unlimited" ? Infinity : b.up_to_gb;
    return aMax - bMax;
  });

  for (const tier of sorted) {
    const max = tier.up_to_gb === "unlimited" ? Infinity : tier.up_to_gb;
    if (usage <= max) return tier;
  }

  return sorted[sorted.length - 1]; // 最大段階
}

/**
 * 回答の current_carrier（ブランド単位: ymobile, povo 等を含む）を
 * plans.json の carrier_id（回線グループ単位）へ正規化する。
 */
const CARRIER_GROUP: Record<string, string> = {
  docomo: "docomo",
  ahamo: "docomo",
  au: "au",
  povo: "au",
  uqmobile: "au",
  softbank: "softbank",
  ymobile: "softbank",
  rakuten: "rakuten",
};

function carrierGroupOf(currentCarrier: string): string | null {
  return CARRIER_GROUP[currentCarrier] ?? null;
}

/**
 * 家族割はブランド単位の条件が多い。
 * 例: SoftBank利用者が自分だけY!mobileへ移る場合、Y!mobileの家族割は原則カウントしない。
 */
const CURRENT_BRAND: Record<string, string> = {
  docomo: "docomo_main",
  ahamo: "ahamo",
  au: "au_main",
  povo: "povo",
  uqmobile: "uq_mobile",
  softbank: "softbank_main",
  ymobile: "ymobile",
  rakuten: "rakuten_mobile",
};

function currentBrandOf(currentCarrier: string): string | null {
  return CURRENT_BRAND[currentCarrier] ?? null;
}

function isSameCurrentBrand(plan: PlanRecord, answers: DiagnosisAnswers): boolean {
  return currentBrandOf(answers.current_carrier) === plan.brand_id;
}

/**
 * ユーザーに適用可能な割引を抽出する。
 * 原則: 回答から適用条件を確認できない割引は「適用しない」。
 * 節約額を盛る方向の誤りは、このサービスの信頼を直接壊すため。
 */
function getApplicableDiscounts(plan: PlanRecord, answers: DiagnosisAnswers): Discount[] {
  const applicable = plan.discounts.filter((d) => {
    const c = d.condition_structured;

    // カード・電気・年齢条件は回答で確認していないため適用しない
    if (c.requires_card) return false;
    if (c.requires_electricity) return false;
    if (c.age_max !== undefined) return false;

    // 家族割: 家族回線が割引対象キャリアに揃う場合のみ必要回線数をカウントする。
    // 自分だけ別キャリアへ移る場合、移行先では1回線扱い。
    if (c.min_lines !== undefined) {
      const targetCarrierLines =
        isSameCurrentBrand(plan, answers) || answers.family_all_switching
          ? answers.family_lines_count + 1
          : 1;
      if (targetCarrierLines < c.min_lines) return false;
    }

    // 光セット割: 該当キャリア系の固定回線を実際に持っている場合のみ
    if (c.requires_fixed_line) {
      if (answers.fixed_line_carrier !== plan.carrier_id) return false;
    }

    return true;
  });

  const selected: Discount[] = [];
  const exclusiveGroups = new Map<string, Discount>();

  for (const discount of applicable) {
    if (!discount.exclusive_group) {
      selected.push(discount);
      continue;
    }

    const current = exclusiveGroups.get(discount.exclusive_group);
    if (!current || discount.monthly_discount_yen > current.monthly_discount_yen) {
      exclusiveGroups.set(discount.exclusive_group, discount);
    }
  }

  return [...selected, ...exclusiveGroups.values()];
}

/** 割引合計額を計算 */
function calcTotalDiscount(discounts: Discount[]): number {
  return discounts.reduce((sum, d) => sum + d.monthly_discount_yen, 0);
}

// ─────────────────────────────────────────────
// 各スコア軸の計算（全て 0〜1 に正規化）
// ─────────────────────────────────────────────

function calcSavingsScore(saving: number): number {
  // 月2000円以上節約 = 1.0、0円 = 0、マイナス = 0
  return Math.max(0, Math.min(1, saving / 2000));
}

function calcFitScore(plan: PlanRecord, answers: DiagnosisAnswers): number {
  let score = 0;
  let weight = 0;

  // データ容量の適合
  const usage = answers.data_usage_gb === "unknown" ? 10 : answers.data_usage_gb;
  const planGb = plan.data.monthly_gb === "unlimited" ? 999 : plan.data.monthly_gb;
  if (planGb >= usage * 0.8) {
    score += 0.4;
  } else if (planGb >= usage * 0.5) {
    score += 0.15;
  }
  weight += 0.4;

  // 通話頻度の適合（かけ放題有無）
  const hasUnlimitedCall = plan.billing.call_option_unlimited_yen !== null;
  if (answers.call_frequency === "daily" && hasUnlimitedCall) {
    score += 0.2;
  } else if (answers.call_frequency !== "daily") {
    score += 0.2;
  } else {
    score += 0.05; // 毎日かけるのにかけ放題なし
  }
  weight += 0.2;

  // 通信品質の適合（MNO/サブブランドvsMVNO）
  const qualityMap: Record<string, number> = {
    MNO: 1.0,
    sub_brand: 0.85,
    online_only: 0.8,
    MVNO: 0.5,
  };
  const qualityFit = qualityMap[plan.plan_type] ?? 0.5;
  const qWeight = (answers.quality_sensitivity - 1) / 3; // 0〜1
  score += qualityFit * qWeight * 0.25 + (1 - qWeight) * 0.25;
  weight += 0.25;

  // 店舗サポートの適合
  const storeFitMap: Record<string, number> = { full: 1.0, limited: 0.5, none: 0.0 };
  const storeFit = storeFitMap[plan.constraints.store_support] ?? 0;
  const storeWeight = (answers.store_support_priority - 1) / 3;
  score += storeFit * storeWeight * 0.15 + (1 - storeWeight) * 0.15;
  weight += 0.15;

  return weight > 0 ? score / weight : 0;
}

function calcFrictionScore(plan: PlanRecord, answers: DiagnosisAnswers): number {
  // 低いほど乗り換えしやすい（0 = 障壁ゼロ、1 = 乗り換え不可）
  let friction = 0;

  // 端末残債（残12ヶ月以上あると摩擦高）
  if (answers.device_installment_remaining_months >= 12) {
    friction += 0.3;
  } else if (answers.device_installment_remaining_months >= 6) {
    friction += 0.15;
  } else if (answers.device_installment_remaining_months > 0) {
    friction += 0.05;
  }

  // オンライン専用×手続き不安
  if (plan.constraints.online_only) {
    if (answers.migration_tolerance === "impossible") {
      friction += 0.5;
    } else if (answers.migration_tolerance === "support_needed") {
      friction += 0.2;
    }
  }

  // 家族割崩れ（家族が残る場合）
  if (
    answers.family_lines_count > 0 &&
    !answers.family_all_switching &&
    plan.plan_type !== "MNO" &&
    !isSameCurrentBrand(plan, answers)
  ) {
    friction += 0.25;
  }

  // eSIM非対応
  if (!plan.constraints.esim_available) {
    friction += 0.05;
  }

  return Math.min(1, friction);
}

function calcStabilityScore(plan: PlanRecord): number {
  // MNO > sub_brand > online_only > MVNO の安定性評価
  const stabilityMap: Record<string, number> = {
    MNO: 0.9,
    sub_brand: 0.8,
    online_only: 0.75,
    MVNO: 0.6,
  };
  return stabilityMap[plan.plan_type] ?? 0.6;
}

function calcEcosystemScore(plan: PlanRecord, answers: DiagnosisAnswers): number {
  if (!plan.point_economy) return 0.3; // ポイントなしでも中立
  const userEcosystems = answers.point_ecosystems;
  if (userEcosystems.includes("none")) return 0.3;
  if (userEcosystems.includes(plan.point_economy.point_type as never)) return 1.0;
  return 0.2;
}

function calcPsychologyScore(plan: PlanRecord, answers: DiagnosisAnswers): number {
  let score = 0.5; // 基本スコア

  // 手間嫌い × オンライン専用は低評価
  if (answers.migration_tolerance === "impossible" && plan.constraints.online_only) {
    score -= 0.4;
  }
  // 店舗重視 × ショップ対応ありは高評価
  if (answers.store_support_priority >= 3 && plan.constraints.store_support === "full") {
    score += 0.3;
  }
  // 節約重視（MVNO/オンライン専用を高評価）
  if (answers.migration_tolerance === "self") {
    if (plan.plan_type === "MVNO") score += 0.2;
    if (plan.plan_type === "online_only") score += 0.15;
  }

  return Math.max(0, Math.min(1, score));
}

// ─────────────────────────────────────────────
// 総合スコアリング
// ─────────────────────────────────────────────

const WEIGHTS = {
  savings: 0.30,
  fit: 0.25,
  friction: 0.20, // 摩擦は「低いほどよい」なので (1 - friction) を使う
  stability: 0.10,
  ecosystem: 0.10,
  psychology: 0.05,
};

function isRecommendablePlan(plan: PlanRecord): boolean {
  return plan.status === "published" && plan.plan_status === "active";
}

function getVerifiedAt(plan: PlanRecord): string {
  return plan.last_verified_at ?? plan.evidence.fetched_at;
}

function scorePlan(
  plan: PlanRecord,
  answers: DiagnosisAnswers
): PlanRecommendation {
  const tier = selectTier(plan, answers.data_usage_gb);
  const applicableDiscounts = getApplicableDiscounts(plan, answers);
  const totalDiscount = calcTotalDiscount(applicableDiscounts);

  const baseMonthlyFee = tier?.monthly_fee_yen ?? plan.billing.base_fee_yen;
  // 通話料金を加算（毎日かける場合はかけ放題オプションを追加）
  let callFee = 0;
  if (answers.call_frequency === "daily" && plan.billing.call_option_unlimited_yen) {
    callFee = plan.billing.call_option_unlimited_yen;
  } else if (
    (answers.call_frequency === "few_monthly" || answers.call_frequency === "few_weekly") &&
    plan.billing.call_option_limited_yen
  ) {
    callFee = plan.billing.call_option_limited_yen;
  }

  const effectiveMonthlyFee = Math.max(0, baseMonthlyFee + callFee - totalDiscount);
  const cashSaving = answers.current_monthly_fee_yen - effectiveMonthlyFee;
  const pointValue = plan.point_economy?.monthly_point_estimate ?? 0;
  const effectiveSaving = cashSaving + pointValue;
  const annualSaving = cashSaving * 12;
  const installmentRemainingMonths = cashSaving > 0 ? answers.device_installment_remaining_months : 0;

  // 各軸スコア
  const savingsScore = calcSavingsScore(cashSaving);
  const fitScore = calcFitScore(plan, answers);
  const frictionScore = calcFrictionScore(plan, answers);
  const stabilityScore = calcStabilityScore(plan);
  const ecosystemScore = calcEcosystemScore(plan, answers);
  const psychologyScore = calcPsychologyScore(plan, answers);

  const totalScore =
    savingsScore * WEIGHTS.savings +
    fitScore * WEIGHTS.fit +
    (1 - frictionScore) * WEIGHTS.friction +
    stabilityScore * WEIGHTS.stability +
    ecosystemScore * WEIGHTS.ecosystem +
    psychologyScore * WEIGHTS.psychology;

  // 理由・注意事項の生成
  const fitReasons: string[] = [];
  const caveats: string[] = [];

  if (cashSaving >= 1000) {
    fitReasons.push(`月${cashSaving.toLocaleString()}円（年間${(annualSaving).toLocaleString()}円）の現金節約余地`);
  }
  const usageGb = answers.data_usage_gb === "unknown" ? 10 : answers.data_usage_gb;
  const planGb = plan.data.monthly_gb === "unlimited" ? "無制限" : `${plan.data.monthly_gb}GB`;
  if (plan.data.monthly_gb === "unlimited" || (typeof plan.data.monthly_gb === "number" && plan.data.monthly_gb >= usageGb)) {
    fitReasons.push(`データ容量 ${planGb} で使い方にフィット`);
  }
  if (plan.constraints.store_support === "full" && answers.store_support_priority >= 3) {
    fitReasons.push("店舗サポートあり・手続きに不安があっても安心");
  }
  if (plan.constraints.online_only && answers.migration_tolerance === "self") {
    fitReasons.push("オンライン完結で契約・変更がスムーズ");
  }
  if (applicableDiscounts.length > 0) {
    fitReasons.push(`${applicableDiscounts[0].name}（月${totalDiscount.toLocaleString()}円引き）が適用可能`);
  }
  if (plan.plan_type === "MNO") {
    fitReasons.push("回線品質が最上位・屋内や地方でも安定");
  }

  if (plan.constraints.online_only && answers.migration_tolerance !== "self") {
    caveats.push("契約・サポートはオンライン中心。店舗での相談は限定的");
  }
  if (
    answers.family_lines_count > 0 &&
    !answers.family_all_switching &&
    !isSameCurrentBrand(plan, answers)
  ) {
    caveats.push("自分だけ乗り換えると、現在の家族割が解除になる可能性があります");
  }
  if (answers.device_installment_remaining_months > 0) {
    caveats.push(`端末残債が残${answers.device_installment_remaining_months}ヶ月ある場合、乗り換え後も支払いが続きます`);
  }
  if (plan.plan_type === "MVNO") {
    caveats.push("MVNOのため昼間や夕方の混雑時間帯は速度が落ちる場合があります");
  }
  if (plan.data.monthly_gb !== "unlimited" && typeof plan.data.monthly_gb === "number" && plan.data.monthly_gb < usageGb) {
    caveats.push(`データ上限${plan.data.monthly_gb}GBを超えると速度制限（${(plan.data.throttle_speed_kbps / 1000).toFixed(1)}Mbps）がかかります`);
  }

  return {
    plan,
    rank: 1, // ランクは後で設定
    total_score: totalScore,
    cash_saving_per_month: cashSaving,
    annual_saving: annualSaving,
    effective_saving_per_month: effectiveSaving,
    recommended_tier: tier,
    applicable_discounts: applicableDiscounts,
    effective_monthly_fee: effectiveMonthlyFee,
    installment_remaining_months: installmentRemainingMonths,
    fit_reasons: fitReasons.slice(0, 3),
    caveats: caveats.slice(0, 2),
    axis_scores: {
      savings: savingsScore,
      fit: fitScore,
      friction: frictionScore,
      stability: stabilityScore,
      ecosystem: ecosystemScore,
      psychology: psychologyScore,
    },
  };
}

// ─────────────────────────────────────────────
// 判定（Verdict）の決定
// ─────────────────────────────────────────────

function determineVerdict(
  best: PlanRecommendation,
  answers: DiagnosisAnswers
): { verdict: Verdict; recommended_action: RecommendedAction; reason: string } {
  const saving = best.cash_saving_per_month;
  const friction = best.axis_scores.friction;
  const hasInstallment = answers.device_installment_remaining_months > 0;
  const familyFriction =
    answers.family_lines_count > 0 &&
    !answers.family_all_switching &&
    !isSameCurrentBrand(best.plan, answers);

  let verdict: Verdict;
  let recommended_action: RecommendedAction;
  let reason: string;

  // 現状維持の判定
  if (saving < 500) {
    verdict = "keep_current";
    recommended_action = 1;
    reason = `現在のプランとの月額差が${Math.abs(saving).toLocaleString()}円と小さく、乗り換えにかかる手間やリスクと釣り合いません。しばらく現状を維持し、半年後に再診断することをおすすめします。`;
    return { verdict, recommended_action, reason };
  }

  // 高摩擦の場合
  if (friction >= 0.5 || (familyFriction && saving < 2000)) {
    verdict = "keep_current";
    recommended_action = 1;
    reason = `月${saving.toLocaleString()}円の節約余地はありますが、現在の${
      familyFriction ? "家族割（解除によって家族の料金が上がる可能性）" : "端末残債や手続きの手間"
    }を考慮すると、今は変えない方が得策です。${hasInstallment ? `端末の支払いが終わる${answers.device_installment_remaining_months}ヶ月後` : "条件が変わったタイミング"}に再診断をおすすめします。`;
    return { verdict, recommended_action, reason };
  }

  // 同一キャリアグループ内の変更が有効な場合
  if (carrierGroupOf(answers.current_carrier) === best.plan.carrier_id) {
    verdict = hasInstallment ? "switch_next_cycle" : "switch_now";
    recommended_action = 2;
    reason = `同じキャリアグループ内の変更で月${saving.toLocaleString()}円（年間${best.annual_saving.toLocaleString()}円）の節約になります。番号そのままで手続きも簡単です。${hasInstallment ? `端末の残債（残${answers.device_installment_remaining_months}ヶ月）は変更後も継続しますが、節約メリットのほうが大きいです。` : ""}`;
    return { verdict, recommended_action, reason };
  }

  // オンライン専用・サブブランドへの移行
  if (best.plan.plan_type === "online_only" || best.plan.plan_type === "sub_brand") {
    if (hasInstallment && saving < 1500) {
      verdict = "switch_next_cycle";
      recommended_action = 3;
      reason = `月${saving.toLocaleString()}円の節約余地があります。端末の支払いが終わる${answers.device_installment_remaining_months}ヶ月後に乗り換えると、そこから年間${best.annual_saving.toLocaleString()}円の削減になります。`;
    } else if (saving >= 1500) {
      verdict = "switch_now";
      recommended_action = 3;
      reason = `月${saving.toLocaleString()}円（年間${best.annual_saving.toLocaleString()}円）の節約余地があります。${best.plan.constraints.store_support !== "none" ? "店舗サポートも使えるため、" : "手続きはオンライン完結ですが、"}乗り換えの障壁は低いと判断できます。`;
    } else {
      verdict = "switch_next_cycle";
      recommended_action = 3;
      reason = `月${saving.toLocaleString()}円の節約余地があります。今すぐでも損はありませんが、次の更新タイミング（月末や請求確定後）に合わせて動くのがスムーズです。`;
    }
    return { verdict, recommended_action, reason };
  }

  // MVNO への移行
  if (best.plan.plan_type === "MVNO") {
    if (answers.migration_tolerance === "impossible") {
      verdict = "keep_current";
      recommended_action = 1;
      reason = `最大月${saving.toLocaleString()}円の節約余地はありますが、MVNOはオンライン手続きのみで、店舗サポートがありません。手続きに不安がある場合は、まずサブブランド（Y!mobile・UQ mobile）を検討するか、今のプランのまま半年後に再診断をおすすめします。`;
    } else if (saving >= 2000) {
      verdict = hasInstallment ? "switch_next_cycle" : "switch_now";
      recommended_action = 4;
      reason = `月${saving.toLocaleString()}円（年間${best.annual_saving.toLocaleString()}円）の大幅な節約余地があります。${hasInstallment ? `端末残債が完済する${answers.device_installment_remaining_months}ヶ月後に乗り換えることで、` : ""}コスト最適化のインパクトが最も大きいプランです。`;
    } else {
      verdict = "switch_next_cycle";
      recommended_action = 4;
      reason = `月${saving.toLocaleString()}円の節約余地があります。データ使用量や通話習慣から見てMVNOでも十分対応できる使い方です。次の請求タイミングで動くのがスムーズです。`;
    }
    return { verdict, recommended_action, reason };
  }

  // デフォルト
  verdict = saving >= 1500 ? "switch_now" : "switch_next_cycle";
  recommended_action = 3;
  reason = `月${saving.toLocaleString()}円（年間${best.annual_saving.toLocaleString()}円）の節約余地があります。`;
  return { verdict, recommended_action, reason };
}

// ─────────────────────────────────────────────
// ペルソナ判定
// ─────────────────────────────────────────────

function determinePersona(answers: DiagnosisAnswers): {
  persona_type: PersonaType;
  persona_label: string;
  persona_description: string;
} {
  if (answers.family_lines_count >= 2) {
    return {
      persona_type: "family_optimizer",
      persona_label: "家族最適化派",
      persona_description: "家族の契約をまとめて賢く節約するタイプ。家族割の恩恵を最大化しつつ、個別の最適化も狙えます。",
    };
  }
  if (answers.data_usage_gb !== "unknown" && typeof answers.data_usage_gb === "number" && answers.data_usage_gb >= 30) {
    return {
      persona_type: "data_hungry",
      persona_label: "ギガ不安ゼロ派",
      persona_description: "データ通信をたっぷり使いたいタイプ。速度制限を気にせず使える大容量・無制限プランが向いています。",
    };
  }
  if (answers.point_ecosystems.length > 0 && !answers.point_ecosystems.includes("none")) {
    return {
      persona_type: "point_hunter",
      persona_label: "ポイント経済圏重視派",
      persona_description: "ポイントを軸に使うサービスをまとめて、実質コストを下げるのが得意なタイプ。経済圏との相性がカギです。",
    };
  }
  if (answers.store_support_priority >= 3 || answers.migration_tolerance === "impossible") {
    return {
      persona_type: "hassle_free",
      persona_label: "手間なし安定派",
      persona_description: "手続きの手間を最小限にしたいタイプ。店舗サポートや安定した通信品質を重視し、コストより安心を取りたい。",
    };
  }
  return {
    persona_type: "steady_saver",
    persona_label: "堅実節約派",
    persona_description: "無理なく、でも着実にコストを下げたいタイプ。条件をきちんと確認しながら、費用対効果の高い選択をします。",
  };
}

// ─────────────────────────────────────────────
// メイン診断関数
// ─────────────────────────────────────────────

export function runDiagnosis(
  plans: PlanRecord[],
  answers: DiagnosisAnswers
): DiagnosisResult {
  // 公開済み、かつ新規申込可能なプランのみ対象。
  // status は編集ワークフロー用、plan_status は実際の受付状態用として分ける。
  const activePlans = plans.filter(isRecommendablePlan);

  // 全プランをスコアリング
  const scored = activePlans
    .map((plan) => scorePlan(plan, answers))
    .sort((a, b) => b.total_score - a.total_score);

  // 上位3件
  const top3 = scored.slice(0, 3).map((r, i) => ({
    ...r,
    rank: (i + 1) as 1 | 2 | 3,
  }));

  const best = top3[0];
  if (!best) {
    return {
      verdict: "keep_current",
      recommended_action: 1,
      ...determinePersona(answers),
      verdict_reason:
        "新規申込可能として確認済みのプランが不足しています。公式情報を確認したうえで再診断してください。",
      recommendations: [],
      generated_at: new Date().toISOString(),
      plan_data_freshness: new Date().toISOString(),
    };
  }

  const { verdict, recommended_action, reason } = determineVerdict(best, answers);
  const persona = determinePersona(answers);

  // データの鮮度（推奨対象のうち最も古い最終確認日を使用）
  const freshness = activePlans
    .map(getVerifiedAt)
    .sort()[0];

  return {
    verdict,
    recommended_action,
    ...persona,
    verdict_reason: reason,
    recommendations: top3,
    generated_at: new Date().toISOString(),
    plan_data_freshness: freshness,
  };
}
