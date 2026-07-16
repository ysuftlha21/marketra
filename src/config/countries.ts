import { z } from "zod";

export const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/)
  .transform((s) => s.toUpperCase());
export type CountryCode = z.infer<typeof countryCodeSchema>;

export const regionSchema = z.enum([
  "europe",
  "north-america",
  "asia-pacific",
  "latin-america",
  "middle-east-africa",
]);
export type Region = z.infer<typeof regionSchema>;

export const outreachLanguageSchema = z.enum([
  "en",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "pt",
  "pt-BR",
  "tr",
  "ja",
]);
export type OutreachLanguage = z.infer<typeof outreachLanguageSchema>;

export const countrySchema = z.object({
  code: countryCodeSchema,
  name: z.string().min(1),
  region: regionSchema,
  currency: z.string().length(3),
  primaryLanguage: outreachLanguageSchema,
  flagEmoji: z.string().min(1),
});
export type Country = z.infer<typeof countrySchema>;

export const countries: readonly Country[] = [
  {
    code: "US",
    name: "United States",
    region: "north-america",
    currency: "USD",
    primaryLanguage: "en",
    flagEmoji: "🇺🇸",
  },
  {
    code: "CA",
    name: "Canada",
    region: "north-america",
    currency: "CAD",
    primaryLanguage: "en",
    flagEmoji: "🇨🇦",
  },
  {
    code: "GB",
    name: "United Kingdom",
    region: "europe",
    currency: "GBP",
    primaryLanguage: "en",
    flagEmoji: "🇬🇧",
  },
  {
    code: "DE",
    name: "Germany",
    region: "europe",
    currency: "EUR",
    primaryLanguage: "de",
    flagEmoji: "🇩🇪",
  },
  {
    code: "FR",
    name: "France",
    region: "europe",
    currency: "EUR",
    primaryLanguage: "fr",
    flagEmoji: "🇫🇷",
  },
  {
    code: "NL",
    name: "Netherlands",
    region: "europe",
    currency: "EUR",
    primaryLanguage: "nl",
    flagEmoji: "🇳🇱",
  },
  {
    code: "ES",
    name: "Spain",
    region: "europe",
    currency: "EUR",
    primaryLanguage: "es",
    flagEmoji: "🇪🇸",
  },
  {
    code: "IT",
    name: "Italy",
    region: "europe",
    currency: "EUR",
    primaryLanguage: "it",
    flagEmoji: "🇮🇹",
  },
  {
    code: "TR",
    name: "Turkey",
    region: "middle-east-africa",
    currency: "TRY",
    primaryLanguage: "tr",
    flagEmoji: "🇹🇷",
  },
  {
    code: "AU",
    name: "Australia",
    region: "asia-pacific",
    currency: "AUD",
    primaryLanguage: "en",
    flagEmoji: "🇦🇺",
  },
  {
    code: "JP",
    name: "Japan",
    region: "asia-pacific",
    currency: "JPY",
    primaryLanguage: "ja",
    flagEmoji: "🇯🇵",
  },
  {
    code: "IN",
    name: "India",
    region: "asia-pacific",
    currency: "INR",
    primaryLanguage: "en",
    flagEmoji: "🇮🇳",
  },
  {
    code: "BR",
    name: "Brazil",
    region: "latin-america",
    currency: "BRL",
    primaryLanguage: "pt-BR",
    flagEmoji: "🇧🇷",
  },
] as const;

export function getCountry(code: string): Country | undefined {
  const target = code.toUpperCase();
  return countries.find((c) => c.code === target);
}

export function getCountriesByRegion(region: Region): readonly Country[] {
  return countries.filter((c) => c.region === region);
}
