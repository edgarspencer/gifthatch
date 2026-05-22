const ISO_4217_ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function formatMoney(cents: number, currencyCode = "GBP", locale = "en-GB") {
  const isZeroDecimal = ISO_4217_ZERO_DECIMAL.has(currencyCode);
  const amount = isZeroDecimal ? cents : cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(isZeroDecimal ? 0 : 2)} ${currencyCode}`;
  }
}

export function parseMoneyInput(value: string, currencyCode = "GBP"): number | null {
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  const isZeroDecimal = ISO_4217_ZERO_DECIMAL.has(currencyCode);
  return isZeroDecimal ? Math.round(parsed) : Math.round(parsed * 100);
}
