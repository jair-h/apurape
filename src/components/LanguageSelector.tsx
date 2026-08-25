"use client";

import { useTranslation, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { Globe } from "lucide-react";

const FLAG: Record<Lang, string> = {
  es: "ES",
  en: "EN",
};

export default function LanguageSelector({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const { lang, setLang } = useTranslation();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Globe className={`h-3.5 w-3.5 flex-shrink-0 ${dark ? "text-white/40" : "text-gray-400"}`} />
      {SUPPORTED_LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span className={`text-xs mx-0.5 ${dark ? "text-white/20" : "text-gray-300"}`}>/</span>
          )}
          <button
            onClick={() => setLang(l)}
            className={`text-xs font-semibold transition-colors ${
              lang === l
                ? dark
                  ? "text-[#4CD9A4]"
                  : "text-[#1D9E75]"
                : dark
                ? "text-white/40 hover:text-white/70"
                : "text-gray-400 hover:text-gray-700"
            }`}
            aria-label={`Switch to ${l.toUpperCase()}`}
          >
            {FLAG[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
