// ─────────────────────────────────────────────
// プランマスター型定義
// ─────────────────────────────────────────────

export type PlanType = "MNO" | "sub_brand" | "online_only" | "MVNO";
export type StoreSupport = "full" | "limited" | "none";
export type PlanStatus = "draft" | "review" | "published" | "archived";
export type PlanAvailability = "active" | "ended" | "existing_only" | "unknown";

export interface PriceTier {
  up_to_gb: number | "unlimited";
  monthly_fee_yen: number;
  label: string; // 例: "3GBまで"
}

export interface Discount {
  name: string;
  monthly_discount_yen: number;
  condition: string;
  exclusive_group?: string; // 同一グループ内の割引は最も大きい1つだけ適用
  condition_structured: {
    min_lines?: number;
    requires_fixed_line?: boolean;
    requires_card?: string;
    requires_electricity?: boolean;
    age_max?: number;
  };
  is_permanent: boolean;
  expires_at?: string;
}

export interface PointEconomy {
  point_type: "d_point" | "au_point" | "paypay" | "rakuten" | "other";
  monthly_point_estimate: number; // 円換算
  condition: string;
}

export interface PlanRecord {
  id: string;
  carrier_id: string;
  brand_id: string;
  plan_name: string;
  plan_type: PlanType;

  billing: {
    base_fee_yen: number; // 基本月額（割引なし・最低段階）
    tiers: PriceTier[];
    call_option_unlimited_yen: number | null; // かけ放題オプション料金（null=含む or なし）
    call_option_limited_yen: number | null;   // 5分かけ放題など
    initial_fee_yen: number;
    cancellation_fee_yen: number;
  };

  discounts: Discount[];
  point_economy: PointEconomy | null;

  data: {
    monthly_gb: number | "unlimited";
    throttle_speed_kbps: number;
    tethering_gb: number | "same" | "not_supported";
  };

  constraints: {
    online_only: boolean;
    store_support: StoreSupport;
    esim_available: boolean;
    sim_only_available: boolean;
    age_condition?: { min?: number; max?: number };
    payment_methods: string[];
  };

  device: {
    bundled_sales: boolean;
    installment_available: boolean;
  };

  evidence: {
    source_url: string;
    fetched_at: string;
    published_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    snapshot_path: string;
    notes_hash: string;
  };

  status: PlanStatus;
  plan_status?: PlanAvailability; // 新規申込の受付状態。status は公開ワークフロー用。
  last_verified_at?: string;      // 公式情報を人間または監視で最後に確認した日時。
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// 診断回答型定義
// ─────────────────────────────────────────────

export type CallFrequency = "none" | "few_monthly" | "few_weekly" | "daily";
export type MigrationTolerance = "self" | "support_needed" | "impossible";
export type PointEcosystemType = "d_point" | "au_point" | "paypay" | "rakuten" | "none";
export type FixedLineCarrier = "docomo" | "au" | "softbank" | "rakuten" | "other" | "none";

export interface DiagnosisAnswers {
  current_carrier: string;           // "docomo" | "au" | "softbank" | "rakuten" | "other"
  current_monthly_fee_yen: number;
  data_usage_gb: number | "unknown";
  call_frequency: CallFrequency;
  family_lines_count: number;        // 0 = 家族なし
  family_all_switching: boolean;     // 家族全員で変える予定か
  fixed_line_carrier: FixedLineCarrier; // 自宅の固定回線（光セット割の判定に使用）
  device_installment_remaining_months: number; // 0 = 完済
  store_support_priority: 1 | 2 | 3 | 4;      // 1=どうでもよい, 4=必須
  quality_sensitivity: 1 | 2 | 3 | 4;         // 1=気にしない, 4=とても重要
  point_ecosystems: PointEcosystemType[];
  migration_tolerance: MigrationTolerance;
}

// ─────────────────────────────────────────────
// 診断結果型定義
// ─────────────────────────────────────────────

export type Verdict = "switch_now" | "switch_next_cycle" | "keep_current";
export type RecommendedAction = 1 | 2 | 3 | 4;
// 1: 現状維持, 2: 同一キャリア内プラン変更, 3: オンライン専用/サブブランドへ移行, 4: MVNOへ移行

export type PersonaType =
  | "steady_saver"      // 堅実節約派
  | "hassle_free"       // 手間なし安定派
  | "point_hunter"      // ポイント経済圏重視派
  | "data_hungry"       // ギガ不安ゼロ派
  | "family_optimizer"; // 家族最適化派

export interface PlanRecommendation {
  plan: PlanRecord;
  rank: 1 | 2 | 3;
  total_score: number;
  cash_saving_per_month: number;   // 現金支出ベースの月間節約額
  annual_saving: number;            // 初年度の現金節約額（初期費用を差し引いた額）
  effective_saving_per_month: number; // ポイント込み実質節約額
  recommended_tier: PriceTier | null; // ユーザーのGB使用量に適した段階
  applicable_discounts: Discount[];  // ユーザーに適用可能な割引
  effective_monthly_fee: number;     // 割引適用後の現金支出
  installment_remaining_months: number; // 端末残債の残り月数（0=完済または節約なし）
  fit_reasons: string[];             // 「この人に合う理由」3点
  caveats: string[];                 // 「注意点」2点
  axis_scores: {
    savings: number;
    fit: number;
    friction: number; // 低いほど乗り換えしやすい
    stability: number;
    ecosystem: number;
    psychology: number;
  };
}

export interface DiagnosisResult {
  verdict: Verdict;
  recommended_action: RecommendedAction;
  persona_type: PersonaType;
  persona_label: string;
  persona_description: string;
  verdict_reason: string;
  recommendations: PlanRecommendation[];
  generated_at: string;
  plan_data_freshness: string;
}

export interface DiagnosisSession {
  session_id: string;
  answers: DiagnosisAnswers;
  result: DiagnosisResult;
  created_at: string;
  feedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    submitted_at: string;
  };
}
