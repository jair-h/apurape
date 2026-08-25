"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/lib/CurrencyContext";
import { CURRENCY_TABLE, flagUrlByCode } from "@/lib/currencies";
import { useTranslation } from "@/lib/i18n";

/* ─── Selector dropdown ───────────────────────────────────── */

interface SelectorProps {
  className?: string;
}

export function CurrencySelector({ className = "" }: SelectorProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrlByCode(currency.countryCode)}
        alt={currency.countryName}
        width={20}
        height={15}
        className="w-5 h-[15px] rounded-[2px] object-cover flex-shrink-0"
      />
      <div className="relative">
        <select
          value={currency.countryCode}
          onChange={e => {
            const found = CURRENCY_TABLE.find(c => c.countryCode === e.target.value);
            if (found) setCurrency(found);
          }}
          className="appearance-none pl-2 pr-6 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-[#1D9E75] focus:outline-none focus:border-[#1D9E75] text-gray-700 transition-colors"
        >
          {CURRENCY_TABLE.map(e => (
            <option key={e.countryCode} value={e.countryCode}>
              {e.countryName} ({e.symbol})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ─── Subtle hint with collapse-to-picker ────────────────── */

interface HintProps {
  className?: string;
}

/**
 * Shows current detected currency (flag + country + symbol) with a small
 * "cambiar" link that expands to a full CurrencySelector. Zero clutter by default.
 */
export function CurrencyHint({ className = "" }: HintProps) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs text-gray-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flagUrlByCode(currency.countryCode)}
          alt={currency.countryName}
          width={16}
          height={12}
          className="w-4 h-3 rounded-[1px] object-cover"
        />
        <span>{currency.countryName} · {currency.symbol}</span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="ml-1 text-[#1D9E75] hover:underline transition-colors"
        >
          {open ? "✕" : t("plans.changeCurrency")}
        </button>
      </p>
      {open && <CurrencySelector />}
    </div>
  );
}
