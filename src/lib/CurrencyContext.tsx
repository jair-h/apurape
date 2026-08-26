"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  CURRENCY_TABLE,
  DEFAULT_CURRENCY,
  type CurrencyEntry,
  detectCurrencyFromIP,
  formatDailyLocal,
} from "@/lib/currencies";

const LS_KEY = "apurape_currency";

type CurrencyContextValue = {
  currency: CurrencyEntry;
  setCurrency: (entry: CurrencyEntry) => void;
  /** Returns "≈ S/1.04" style string for given annual USD amount */
  formatDaily: (annualUsd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyEntry>(DEFAULT_CURRENCY);

  useEffect(() => {
    // 1) Respect previous explicit choice saved in localStorage
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const found = CURRENCY_TABLE.find(e => e.countryCode === stored);
        if (found) { setCurrencyState(found); return; }
      }
    } catch {}
    // 2) Detect from IP (async) — best automatic source
    detectCurrencyFromIP().then(setCurrencyState);
  }, []);

  const setCurrency = useCallback((entry: CurrencyEntry) => {
    setCurrencyState(entry);
    try { localStorage.setItem(LS_KEY, entry.countryCode); } catch {}
  }, []);

  const formatDaily = useCallback(
    (annualUsd: number) => formatDailyLocal(annualUsd, currency),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatDaily }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: DEFAULT_CURRENCY,
      setCurrency: (_: CurrencyEntry) => {},
      formatDaily: (annualUsd: number) => formatDailyLocal(annualUsd, DEFAULT_CURRENCY),
    };
  }
  return ctx;
}
