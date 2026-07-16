import { z } from "zod";

export const currencySchema = z.object({
  code: z.string().length(3),
  symbol: z.string().min(1),
  name: z.string().min(1),
  decimals: z.number().int().min(0).max(4),
});
export type Currency = z.infer<typeof currencySchema>;

export const currencies: readonly Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "GBP", symbol: "£", name: "Pound Sterling", decimals: 2 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", decimals: 2 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2 },
] as const;

export function getCurrency(code: string): Currency | undefined {
  return currencies.find((c) => c.code === code.toUpperCase());
}

export function formatMoney(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });
  return formatter.format(amount);
}
