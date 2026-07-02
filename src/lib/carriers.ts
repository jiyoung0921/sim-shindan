export type CarrierBrandId =
  | "docomo"
  | "au"
  | "softbank"
  | "rakuten"
  | "ymobile"
  | "uqmobile"
  | "ahamo"
  | "povo"
  | "iij"
  | "mineo"
  | "nuro"
  | "other";

export interface CarrierBrand {
  id: CarrierBrandId;
  label: string;
  subLabel: string;
  iconSrc?: string;
}

export const CARRIER_BRANDS: Record<CarrierBrandId, CarrierBrand> = {
  docomo: {
    id: "docomo",
    label: "ドコモ",
    subLabel: "docomo",
    iconSrc: "/assets/carriers/docomo.png",
  },
  au: {
    id: "au",
    label: "au",
    subLabel: "KDDI",
    iconSrc: "/assets/carriers/au.png",
  },
  softbank: {
    id: "softbank",
    label: "ソフトバンク",
    subLabel: "SoftBank",
    iconSrc: "/assets/carriers/softbank.png",
  },
  rakuten: {
    id: "rakuten",
    label: "楽天モバイル",
    subLabel: "Rakuten",
    iconSrc: "/assets/carriers/rakuten.png",
  },
  ymobile: {
    id: "ymobile",
    label: "Y!mobile",
    subLabel: "サブブランド",
    iconSrc: "/assets/carriers/ymobile.png",
  },
  uqmobile: {
    id: "uqmobile",
    label: "UQ mobile",
    subLabel: "サブブランド",
    iconSrc: "/assets/carriers/uqmobile.png",
  },
  ahamo: {
    id: "ahamo",
    label: "ahamo",
    subLabel: "オンライン専用",
    iconSrc: "/assets/carriers/ahamo.png",
  },
  povo: {
    id: "povo",
    label: "povo",
    subLabel: "オンライン専用",
    iconSrc: "/assets/carriers/povo.png",
  },
  iij: {
    id: "iij",
    label: "IIJmio",
    subLabel: "MVNO",
    iconSrc: "/assets/carriers/iij.png",
  },
  mineo: {
    id: "mineo",
    label: "mineo",
    subLabel: "MVNO",
    iconSrc: "/assets/carriers/mineo.png",
  },
  nuro: {
    id: "nuro",
    label: "NUROモバイル",
    subLabel: "MVNO",
    iconSrc: "/assets/carriers/nuro.png",
  },
  other: {
    id: "other",
    label: "その他/格安SIM",
    subLabel: "MVNOなど",
  },
};

export const DIAGNOSIS_CARRIER_OPTIONS = [
  CARRIER_BRANDS.docomo,
  CARRIER_BRANDS.au,
  CARRIER_BRANDS.softbank,
  CARRIER_BRANDS.rakuten,
  CARRIER_BRANDS.ymobile,
  CARRIER_BRANDS.uqmobile,
  CARRIER_BRANDS.ahamo,
  CARRIER_BRANDS.povo,
  CARRIER_BRANDS.other,
];

export const FEATURED_CARRIERS = [
  CARRIER_BRANDS.docomo,
  CARRIER_BRANDS.au,
  CARRIER_BRANDS.softbank,
  CARRIER_BRANDS.rakuten,
  CARRIER_BRANDS.ymobile,
  CARRIER_BRANDS.uqmobile,
  CARRIER_BRANDS.ahamo,
  CARRIER_BRANDS.povo,
  CARRIER_BRANDS.iij,
  CARRIER_BRANDS.mineo,
  CARRIER_BRANDS.nuro,
];

export function getCarrierBrand(id: string): CarrierBrand {
  return CARRIER_BRANDS[id as CarrierBrandId] ?? {
    ...CARRIER_BRANDS.other,
    label: id,
  };
}
