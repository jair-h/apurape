"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import es from "@/locales/es.json";
import en from "@/locales/en.json";

/* ─── Types ───────────────────────────────────────────────── */
export type Lang = "es" | "en";

type Translations = typeof es;

/* ─── Supported languages ─────────────────────────────────── */
// Add "pt" here when src/locales/pt.json is ready
export const SUPPORTED_LANGS: Lang[] = ["es", "en"];

const LOCALES: Record<Lang, Record<string, unknown>> = {
  es: es as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const LS_KEY = "markaru_lang";

/* ─── Context ─────────────────────────────────────────────── */
type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ta: (key: string) => string[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

/* ─── Helper: resolve nested key e.g. "auth.login.signIn" ─── */
function resolve(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as object)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/* ─── Helper: interpolate {{var}} placeholders ────────────── */
function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

/* ─── Detect initial lang from localStorage / browser ─────── */
function detectLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as Lang)) return stored as Lang;
  } catch {
    // localStorage blocked (private mode etc.)
  }
  const browser = navigator.language ?? "";
  return browser.startsWith("en") ? "en" : "es";
}

/* Espeja el idioma en una cookie para que el servidor (p. ej. el sync de contactos Brevo)
 * pueda leer el IDIOMA del usuario. No afecta la UI. */
function writeLangCookie(l: Lang) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${LS_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore
  }
}

/* ─── Provider ────────────────────────────────────────────── */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const detected = detectLang();
    setLangState(detected);
    writeLangCookie(detected);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLangCookie(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const primary = resolve(LOCALES[lang], key);
      if (typeof primary === "string") return interpolate(primary, vars);
      // Fallback to Spanish
      const fallback = resolve(LOCALES["es"], key);
      if (typeof fallback === "string") return interpolate(fallback, vars);
      return key;
    },
    [lang]
  );

  const ta = useCallback(
    (key: string): string[] => {
      const primary = resolve(LOCALES[lang], key);
      if (Array.isArray(primary)) return primary as string[];
      const fallback = resolve(LOCALES["es"], key);
      if (Array.isArray(fallback)) return fallback as string[];
      return [];
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, ta }}>
      {children}
    </I18nContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────── */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback: provider missing — return Spanish directly, never throw
    const fallbackT = (key: string, vars?: Record<string, string | number>) => {
      const val = resolve(LOCALES["es"], key);
      if (typeof val === "string") return interpolate(val, vars);
      return key;
    };
    return {
      lang: "es" as Lang,
      setLang: (_l: Lang) => {},
      t: fallbackT,
      ta: (key: string): string[] => {
        const val = resolve(LOCALES["es"], key);
        return Array.isArray(val) ? (val as string[]) : [];
      },
    };
  }
  return ctx;
}
