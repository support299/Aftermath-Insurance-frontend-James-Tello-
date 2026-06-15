export const CARRIERS = [
  "UnitedHealth",
  "Anthem",
  "Cigna",
  "Aetna",
  "Humana",
  "Blue Cross Blue Shield",
  "Kaiser Permanente",
  "Molina Healthcare",
];

export const PRODUCTS = [
  "Medical",
  "Dental-only",
  "Vision-only",
  "Medical + Dental Bundle",
  "Medical + Dental + Vision Bundle",
  "Short-term Medical",
];

export const ADD_ONS = ["Dental", "Vision", "Accident", "Critical Illness", "Life"];

export const LEAD_SOURCES = [
  "Direct",
  "Referral",
  "Online",
  "Broker Network",
  "Cold Call",
  "Social Media",
];

export function generateSaleId(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SALE-${yyyy}${mm}${dd}-${rand}`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export type LineItemKind = "health" | "life" | "addon";

export interface SaleLineItem {
  kind: LineItemKind;
  carrier: string;
  product: string;
  amount: number;
}

export interface SaleRow {
  id: string;
  sale_id: string;
  agent_id: string;
  agent_name: string;
  team_id: string | null;
  team_name: string | null;
  sale_date: string;
  customer_name: string | null;
  deal_size: number;
  carrier: string;
  product: string;
  add_ons: string[];
  lead_source: string | null;
  cost_per_lead: number | null;
  notes: string | null;
  line_items?: SaleLineItem[] | null;
}
