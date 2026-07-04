export const SERVICE_TYPES = [
  { value: "painting", label: "Boya" },
  { value: "bodywork", label: "Kaporta" },
  { value: "pdr", label: "PDR" },
  { value: "detailing", label: "Detaylı Temizlik" },
  { value: "polishing", label: "Pasta Cila" },
  { value: "ceramic", label: "Seramik Kaplama" },
  { value: "ppf", label: "PPF" },
  { value: "mechanical", label: "Mekanik" },
];

export const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPES.map(({ value, label }) => [value, label])
);

export const PAYMENT_METHODS = [
  { value: "cash", label: "Nakit" },
  { value: "havale", label: "Havale" },
  { value: "kredi_karti", label: "Kredi Kartı" },
  { value: "cek", label: "Çek" },
];

export const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHODS.map(({ value, label }) => [value, label])
);

export const NAV_ITEMS = [
  { label: "Panel", href: "/dashboard" },
  { label: "Yeni Ziyaret", href: "/visits/new" },
  { label: "Personel Avansları", href: "/staff-loans" },
  { label: "Raporlar", href: "/reports" },
];
