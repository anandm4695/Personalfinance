import { THEME } from "../../utils/constants";

export const EXTERNAL_OWNER_ID = "external";

export interface PropertyOwner {
  id: string;
  name?: string;
  sharePct: number | string;
}

export interface RealEstateProperty {
  id: string;
  name: string;
  type: "residential" | "commercial" | "land" | "plot" | "villa" | "other" | string;
  status: "owned" | "under-construction" | "sold" | string;
  location?: string;
  developerName?: string;
  sellerName?: string;
  reraNumber?: string;
  areaSqft?: number | string;
  purchaseDate?: string;
  registrationDate?: string;
  possessionDate?: string;
  agreementValue?: number | string;
  agreementValuePaid?: number | string;
  stampDuty?: number | string;
  stampDutyPaid?: number | string;
  tdsAmount?: number | string;
  tdsValue?: number | string;
  marketValue?: number | string;
  saleDate?: string;
  salePrice?: number | string;
  saleStampDuty?: number | string;
  saleTds?: number | string;
  notes?: string;
  owner?: string;
  owners?: PropertyOwner[];
}

export interface RealEstateDemand {
  id: string;
  propertyId: string;
  demandDate: string;
  dueDate?: string;
  milestone?: string;
  amount: number | string;
  gstAmount?: number | string;
  totalAmount?: number | string;
  status: "pending" | "paid" | "partial" | "overdue" | string;
  notes?: string;
}

export interface RealEstatePayment {
  id: string;
  propertyId: string;
  demandId?: string;
  paymentDate: string;
  amount: number | string;
  paymentMode: "NEFT" | "RTGS" | "UPI" | "Cheque" | "DD" | "Cash" | "Credit Card" | "Debit Card" | "Other" | string;
  referenceNumber?: string;
  note?: string;
  paymentSource?: string;
  linkedTxnId?: string;
  postToAccount?: boolean;
  category?: string;
  autoUpdateAgreementPaid?: boolean;
}

export function realEstateTrackedShare(property: any): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    return (
      property.owners.reduce(
        (s: number, o: any) => (o?.id !== EXTERNAL_OWNER_ID ? s + Number(o.sharePct || 0) : s),
        0
      ) / 100
    );
  }
  return 1;
}

export function realEstateShareForOwner(property: any, profileId: string): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === profileId);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === profileId ? 1 : 0;
}

export const BUILDER_THEMES: Record<string, { gradient: string; color: string }> = {
  lodha: { gradient: "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)", color: "#1e40af" },
  dlf: { gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 100%)", color: "#ea580c" },
  godrej: { gradient: "linear-gradient(135deg,#14532d 0%,#22c55e 100%)", color: "#15803d" },
  prestige: { gradient: "linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)", color: "#7c3aed" },
  brigade: { gradient: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)", color: "#0891b2" },
  sobha: { gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)", color: "#b45309" },
  puravankara: { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  mahindra: { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  tata: { gradient: "linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%)", color: "#1d4ed8" },
  oberoi: { gradient: "linear-gradient(135deg,#0f172a 0%,#334155 100%)", color: "#334155" },
  kolte: { gradient: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#059669" },
  shapoorji: { gradient: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)", color: "#d97706" },
  hiranandani: { gradient: "linear-gradient(135deg,#6d28d9 0%,#c084fc 100%)", color: "#7c3aed" },
  kalpataru: { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
  piramal: { gradient: "linear-gradient(135deg,#0f766e 0%,#2dd4bf 100%)", color: "#0f766e" },
  runwal: { gradient: "linear-gradient(135deg,#1e40af 0%,#60a5fa 100%)", color: "#1e40af" },
  sunteck: { gradient: "linear-gradient(135deg,#7c2d12 0%,#fb923c 100%)", color: "#c2410c" },
  chandak: { gradient: "linear-gradient(135deg,#1e3a8a 0%,#f59e0b 100%)", color: "#1d4ed8" },
};

export function getBuilderTheme(name: string) {
  const key = (name || "").toLowerCase().replace(/[\s\-_.&]+/g, "");
  for (const [k, v] of Object.entries(BUILDER_THEMES)) {
    if (key.includes(k.replace(/[\s\-_.&]+/g, ""))) return v;
  }
  const hue =
    Array.from(name || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const color = `hsl(${hue},55%,42%)`;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`,
    color,
  };
}

export const STATUS_HEX: Record<string, string> = {
  owned: THEME.sage,
  sold: THEME.rust,
  "under-construction": THEME.gold,
};

export const DEMAND_HEX: Record<string, string> = {
  pending: THEME.gold,
  paid: THEME.sage,
  partial: THEME.accent,
  overdue: THEME.rust,
};

export const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
  plot: "Plot",
  villa: "Villa",
  other: "Other",
};
