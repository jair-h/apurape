/* ─── Exchange rate table (fixed, updated manually) ─────── */
export type CurrencyEntry = {
  countryCode: string;   // ISO 3166-1 alpha-2
  countryName: string;   // Name in Spanish (matches profiles.country)
  currency: string;      // e.g. "PEN"
  symbol: string;        // e.g. "S/"
  rate: number;          // 1 USD = X local units
};

export const CURRENCY_TABLE: CurrencyEntry[] = [
  { countryCode: "PE", countryName: "Perú",       currency: "PEN", symbol: "S/",  rate: 3.80 },
  { countryCode: "CO", countryName: "Colombia",   currency: "COP", symbol: "$",   rate: 4100 },
  { countryCode: "CL", countryName: "Chile",      currency: "CLP", symbol: "$",   rate: 950 },
  { countryCode: "AR", countryName: "Argentina",  currency: "ARS", symbol: "$",   rate: 1000 },
  { countryCode: "MX", countryName: "México",     currency: "MXN", symbol: "$",   rate: 18 },
  { countryCode: "BR", countryName: "Brasil",     currency: "BRL", symbol: "R$",  rate: 5.1 },
  { countryCode: "BO", countryName: "Bolivia",    currency: "BOB", symbol: "Bs",  rate: 6.9 },
  { countryCode: "EC", countryName: "Ecuador",    currency: "USD", symbol: "$",   rate: 1 },
  { countryCode: "UY", countryName: "Uruguay",    currency: "UYU", symbol: "$",   rate: 40 },
  { countryCode: "PY", countryName: "Paraguay",   currency: "PYG", symbol: "₲",   rate: 7300 },
  { countryCode: "NI", countryName: "Nicaragua",  currency: "NIO", symbol: "C$",  rate: 36.5 },
  { countryCode: "GT", countryName: "Guatemala",  currency: "GTQ", symbol: "Q",   rate: 7.8 },
  { countryCode: "US", countryName: "USA",        currency: "USD", symbol: "$",   rate: 1 },
  { countryCode: "EU", countryName: "Europa",     currency: "EUR", symbol: "€",   rate: 0.92 },
];

export const DEFAULT_CURRENCY = CURRENCY_TABLE[0]; // Perú

/* ─── Lookup helpers ─────────────────────────────────────── */

/** Find entry by ISO country code (e.g. "PE") */
export function currencyByCode(code: string): CurrencyEntry {
  return CURRENCY_TABLE.find(e => e.countryCode.toUpperCase() === code.toUpperCase())
    ?? DEFAULT_CURRENCY;
}

/** Find entry by Spanish country name (e.g. "Perú") — from profiles.country */
export function currencyByCountryName(name: string): CurrencyEntry {
  const n = name.trim().toLowerCase();
  return CURRENCY_TABLE.find(e => e.countryName.toLowerCase() === n)
    ?? DEFAULT_CURRENCY;
}

/** Detect from browser navigator.language ("es-PE" → PE → Perú) */
export function detectCurrencyFromBrowser(): CurrencyEntry {
  if (typeof navigator === "undefined") return DEFAULT_CURRENCY;
  const lang = navigator.language ?? navigator.languages?.[0] ?? "es-PE";
  const region = lang.split("-")[1]?.toUpperCase() ?? "";
  return CURRENCY_TABLE.find(e => e.countryCode === region) ?? DEFAULT_CURRENCY;
}

/* ─── Format daily local price ───────────────────────────── */

/**
 * (annualUsd / 365) × rate, formatted with symbol.
 * Large currencies (rate ≥ 10) show no decimals.
 */
export function formatDailyLocal(annualUsd: number, entry: CurrencyEntry): string {
  const daily = (annualUsd / 365) * entry.rate;
  const formatted = entry.rate >= 10
    ? Math.round(daily).toLocaleString("es-PE")
    : daily.toFixed(2);
  return `≈ ${entry.symbol}${formatted}`;
}

/* ─── Flag images (flagcdn.com — works cross-platform) ────── */

/** Returns a flagcdn.com URL for a 20×15 flag image given ISO country code */
export function flagUrlByCode(code: string): string {
  return `https://flagcdn.com/20x15/${code.toLowerCase()}.png`;
}

/** Returns flagcdn.com URL from Spanish country name via COUNTRIES lookup */
export function flagUrlByCountryName(
  name: string,
  countries: { code: string; name: string }[]
): string | null {
  if (!name) return null;
  const found = countries.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  return found ? flagUrlByCode(found.code) : null;
}

/* ─── IP-based geolocation ───────────────────────────────── */

/** Detect currency from visitor's IP using ipapi.co (free, no key needed) */
export async function detectCurrencyFromIP(): Promise<CurrencyEntry> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    if (!res.ok) throw new Error("non-ok");
    const data = await res.json();
    const code = (data.country_code as string | undefined)?.toUpperCase();
    if (code) {
      const found = CURRENCY_TABLE.find(e => e.countryCode === code);
      if (found) return found;
    }
  } catch {
    // timeout, network error, or country not in table → fall through
  } finally {
    clearTimeout(timer);
  }
  return detectCurrencyFromBrowser();
}
