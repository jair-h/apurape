"use client";

import Link from "next/link";
import { BookText } from "lucide-react";
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
        {/* Enlace al Libro de Reclamaciones: la norma (DS 011-2011-PCM) pide
            que sea visible en todas las páginas del sitio, también el blog. */}
        <div className="flex items-center gap-4">
          <Link href="/libro-de-reclamaciones"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[#D92D20] transition-colors">
            <BookText className="h-3.5 w-3.5" /> Libro de Reclamaciones
          </Link>
          <p className="text-xs text-gray-600">{t("landing.footer.allRights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
