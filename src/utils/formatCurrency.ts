/** INR formatting aligned with web dashboard. */
export function formatInr(amount: number | undefined | null): string {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCount(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return "0";
  return v.toLocaleString("en-IN");
}
