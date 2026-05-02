export type DiscountType = "percentage" | "fixed";

export interface LineItem {
  quantity: number;
  unit_price: number;
}

export interface PricingInput {
  items: LineItem[];
  gstEnabled: boolean;
  gstPercentage: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export function computePricing(input: PricingInput): PricingResult {
  const subtotal = input.items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  );
  const discountAmount =
    input.discountType === "percentage"
      ? (subtotal * (Number(input.discountValue) || 0)) / 100
      : Math.min(Number(input.discountValue) || 0, subtotal);
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const gstAmount = input.gstEnabled
    ? (taxableAmount * (Number(input.gstPercentage) || 0)) / 100
    : 0;
  const total = taxableAmount + gstAmount;
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxableAmount: round2(taxableAmount),
    gstAmount: round2(gstAmount),
    total: round2(total),
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}
