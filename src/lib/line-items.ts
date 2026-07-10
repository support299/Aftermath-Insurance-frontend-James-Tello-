import { PRODUCT_ADDITIONAL_PRICING_ENABLED } from "@/lib/feature-flags";

export type LineKind = "health" | "life" | "addon";

export interface ProductWithPricing {
  id: string;
  name: string;
  carrier_id: string | null;
  additional_price?: number | null;
  additional_includes?: string | null;
}

export interface SaleLineItem {
  id: string;
  kind: LineKind | "";
  carrier: string;
  product: string;
  monthly_premium: string;
  amount: string;
  additional_price: string;
  additional_includes: string;
}

export interface SavedLineItem {
  kind: LineKind;
  carrier: string;
  product: string;
  amount: number;
  additional_price?: number;
  additional_includes?: string;
}

export function newSaleLineItem(): SaleLineItem {
  return {
    id: crypto.randomUUID(),
    kind: "",
    carrier: "",
    product: "",
    monthly_premium: "",
    amount: "",
    additional_price: "",
    additional_includes: "",
  };
}

export function additionalMonthlyAmount(value: string | number | null | undefined): number {
  if (!PRODUCT_ADDITIONAL_PRICING_ENABLED) return 0;
  const n = Number(value);
  return isFinite(n) && n > 0 ? n : 0;
}

export function calcAnnualFromMonthly(baseMonthly: string, additionalMonthly: number): string {
  if (baseMonthly === "") return "";
  const base = Number(baseMonthly);
  if (!isFinite(base)) return "";
  return String(+((base + additionalMonthly) * 12).toFixed(2));
}

export function effectiveMonthlyPremium(
  item: Pick<SaleLineItem, "monthly_premium" | "additional_price">,
): number {
  const base = Number(item.monthly_premium) || 0;
  if (!PRODUCT_ADDITIONAL_PRICING_ENABLED) return +base.toFixed(2);
  return +(base + additionalMonthlyAmount(item.additional_price)).toFixed(2);
}

export function findProductAdditional(
  products: ProductWithPricing[],
  carriers: { id: string; name: string }[],
  carrierName: string,
  productName: string,
): { additional_price: string; additional_includes: string } {
  if (!PRODUCT_ADDITIONAL_PRICING_ENABLED) {
    return { additional_price: "", additional_includes: "" };
  }
  const carrier = carriers.find((c) => c.name === carrierName);
  if (!carrier) return { additional_price: "", additional_includes: "" };
  const product = products.find((p) => p.name === productName && p.carrier_id === carrier.id);
  if (!product?.additional_price) return { additional_price: "", additional_includes: "" };
  return {
    additional_price: String(product.additional_price),
    additional_includes: product.additional_includes ?? "",
  };
}

export function lineItemProductPatch(
  productName: string,
  line: SaleLineItem,
  products: ProductWithPricing[],
  carriers: { id: string; name: string }[],
): Partial<SaleLineItem> {
  const { additional_price, additional_includes } = findProductAdditional(
    products,
    carriers,
    line.carrier,
    productName,
  );
  const extra = additionalMonthlyAmount(additional_price);
  return {
    product: productName,
    additional_price,
    additional_includes,
    amount: calcAnnualFromMonthly(line.monthly_premium, extra),
  };
}

export function lineItemMonthlyPatch(
  baseMonthly: string,
  line: Pick<SaleLineItem, "additional_price">,
): Partial<SaleLineItem> {
  const extra = additionalMonthlyAmount(line.additional_price);
  return {
    monthly_premium: baseMonthly,
    amount: calcAnnualFromMonthly(baseMonthly, extra),
  };
}

export function baseMonthlyFromLineItem(it: {
  amount?: unknown;
  monthly_premium?: unknown;
  additional_price?: unknown;
}): string {
  if (it.monthly_premium != null && it.monthly_premium !== "") {
    return String(it.monthly_premium);
  }
  if (it.amount == null || it.amount === "") return "";
  const annual = Number(it.amount);
  if (!isFinite(annual)) return "";
  const extra = PRODUCT_ADDITIONAL_PRICING_ENABLED
    ? additionalMonthlyAmount(it.additional_price)
    : 0;
  return String(+((annual / 12) - extra).toFixed(2));
}

export function serializeLineItem(li: SaleLineItem): SavedLineItem {
  const item: SavedLineItem = {
    kind: li.kind as LineKind,
    carrier: li.carrier,
    product: li.product,
    amount: Number(li.amount),
  };
  const extra = additionalMonthlyAmount(li.additional_price);
  if (PRODUCT_ADDITIONAL_PRICING_ENABLED && extra > 0) {
    item.additional_price = extra;
    if (li.additional_includes.trim()) item.additional_includes = li.additional_includes.trim();
  }
  return item;
}

export function clearProductFields(): Partial<SaleLineItem> {
  return {
    product: "",
    monthly_premium: "",
    amount: "",
    additional_price: "",
    additional_includes: "",
  };
}
