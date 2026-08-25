"use client";

import { LanguageProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import CookieBanner from "@/components/CookieBanner";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        {children}
        <CookieBanner />
      </CurrencyProvider>
    </LanguageProvider>
  );
}
