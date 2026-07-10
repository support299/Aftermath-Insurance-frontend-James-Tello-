import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/sales";
import { PRODUCT_ADDITIONAL_PRICING_ENABLED } from "@/lib/feature-flags";
import {
  additionalMonthlyAmount,
  effectiveMonthlyPremium,
  type LineKind,
  type ProductWithPricing,
  type SaleLineItem,
} from "@/lib/line-items";

interface CarrierOpt {
  id: string;
  name: string;
  carrier_type: string;
}

interface AddOnOpt {
  id: string;
  name: string;
}

interface Props {
  index: number;
  item: SaleLineItem;
  carriers: CarrierOpt[];
  products: ProductWithPricing[];
  addOns: AddOnOpt[];
  canRemove: boolean;
  onKindChange: (v: LineKind) => void;
  onCarrierChange: (v: string) => void;
  onProductChange: (v: string) => void;
  onMonthlyPremiumChange: (v: string) => void;
  onRemove: () => void;
}

export function SaleLineItemRow({
  index,
  item,
  carriers,
  products,
  addOns,
  canRemove,
  onKindChange,
  onCarrierChange,
  onProductChange,
  onMonthlyPremiumChange,
  onRemove,
}: Props) {
  const isAddon = item.kind === "addon";
  const filteredCarriers =
    item.kind && item.kind !== "addon" ? carriers.filter((c) => c.carrier_type === item.kind) : [];
  const selectedCarrier = carriers.find((c) => c.name === item.carrier);
  const filteredProducts = isAddon
    ? addOns.map((a) => ({ id: a.id, name: a.name }))
    : selectedCarrier
      ? products.filter((p) => p.carrier_id === selectedCarrier.id)
      : [];

  const extraMonthly = additionalMonthlyAmount(item.additional_price);
  const effectiveMonthly = item.monthly_premium !== "" ? effectiveMonthlyPremium(item) : null;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs">Type</Label>
          <Select value={item.kind || undefined} onValueChange={(v) => onKindChange(v as LineKind)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health">Health Insurance</SelectItem>
              <SelectItem value="life">Life Insurance</SelectItem>
              <SelectItem value="addon">Add-on</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isAddon && (
          <div>
            <Label className="mb-1 block text-xs">Carrier</Label>
            <Select value={item.carrier || undefined} onValueChange={onCarrierChange} disabled={!item.kind}>
              <SelectTrigger>
                <SelectValue placeholder={item.kind ? "Select carrier" : "Pick a type first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCarriers.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                {item.kind && filteredCarriers.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No carriers for this type</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px]">
        <div>
          <Label className="mb-1 block text-xs">{isAddon ? "Add-on" : "Product"}</Label>
          <Select
            value={item.product || undefined}
            onValueChange={onProductChange}
            disabled={isAddon ? !item.kind : !item.carrier}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isAddon
                    ? item.kind
                      ? "Select add-on"
                      : "Pick a type first"
                    : item.carrier
                      ? "Select product"
                      : "Pick a carrier first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
              {((isAddon && item.kind && filteredProducts.length === 0) ||
                (!isAddon && item.carrier && filteredProducts.length === 0)) && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {isAddon ? "No add-ons available" : "No products for this carrier"}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Monthly Premium ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={item.monthly_premium}
            onChange={(e) => onMonthlyPremiumChange(e.target.value)}
            disabled={!item.product}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Annual Premium ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={item.amount}
            readOnly
            title={
              PRODUCT_ADDITIONAL_PRICING_ENABLED
                ? "Auto-calculated as (Monthly Premium + additional price) × 12"
                : "Auto-calculated as Monthly Premium × 12"
            }
          />
        </div>
      </div>
      {PRODUCT_ADDITIONAL_PRICING_ENABLED && extraMonthly > 0 && (
        <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Additional:</span>
            <span className="num font-medium">+{formatCurrency(extraMonthly)}/mo</span>
            {effectiveMonthly != null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Effective monthly:</span>
                <span className="num font-medium">{formatCurrency(effectiveMonthly)}</span>
              </>
            )}
          </div>
          {item.additional_includes && (
            <p className="mt-1 text-xs text-muted-foreground">Includes: {item.additional_includes}</p>
          )}
        </div>
      )}
    </div>
  );
}
