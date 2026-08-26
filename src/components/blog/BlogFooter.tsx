"use client";

import { useTranslation } from "@/lib/i18n";

export default function BlogFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-900 py-8 mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
          <span className="font-bold text-sm text-white">Apurape</span>
          <span className="text-gray-500 text-xs italic ml-1">{t("landing.slogan")}</span>
        </div>
        <p className="text-xs text-gray-600">{t("landing.footer.allRights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
