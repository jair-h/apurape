"use client";

/* Footer del sitio.
 *
 * Vivía dentro de page.tsx, así que solo aparecía en el landing: las páginas
 * legales no tenían footer y el enlace al Libro de Reclamaciones no se veía
 * desde ellas. El DS 011-2011-PCM exige que el aviso del Libro sea visible
 * en el establecimiento —aquí, en el sitio—, así que el footer se extrajo
 * para poder montarlo en todas las páginas públicas.
 *
 * El markup es el mismo que tenía el landing, para no cambiar su aspecto.
 */

import Link from "next/link";
import { Handshake, BookText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
              <span className="font-bold text-white text-sm">Apurape</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{t("landing.footer.tagline")}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.platform")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/servicios"      className="hover:text-[#D92D20] transition-colors">{t("nav.services")}</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-[#D92D20] transition-colors">{t("nav.howItWorks")}</Link></li>
              <li><Link href="/#planes"        className="hover:text-[#D92D20] transition-colors">{t("nav.plans")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.company")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sobre-nosotros" className="hover:text-[#D92D20] transition-colors">{t("landing.footer.aboutUs")}</Link></li>
              <li><Link href="/blog"           className="hover:text-[#D92D20] transition-colors">Blog</Link></li>
              <li><Link href="/contacto"       className="hover:text-[#D92D20] transition-colors">{t("landing.footer.contact")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.legal")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terminos"   className="hover:text-[#D92D20] transition-colors">{t("landing.footer.terms")}</Link></li>
              <li><Link href="/privacidad" className="hover:text-[#D92D20] transition-colors">{t("landing.footer.privacy")}</Link></li>
              <li><Link href="/cookies"    className="hover:text-[#D92D20] transition-colors">{t("landing.footer.cookiesPolicy")}</Link></li>
              <li><Link href="/concurso"   className="hover:text-[#D92D20] transition-colors">{t("landing.footer.contestRules")}</Link></li>
            </ul>
          </div>
        </div>

        {/* Aviso oficial del Libro de Reclamaciones. Va en su propio bloque,
            con borde y a ancho completo, porque la norma pide que sea
            visible y no una línea más entre los enlaces legales. */}
        <Link href="/libro-de-reclamaciones"
          className="group flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800/50 p-4 mb-8 hover:border-[#D92D20] transition-colors">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white flex items-center justify-center">
            <BookText className="h-6 w-6 text-[#B42318]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white group-hover:text-[#D92D20] transition-colors">
              Libro de Reclamaciones
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Conforme a la Ley 29571 y al DS 011-2011-PCM. Registra tu reclamo
              o queja; respondemos en 15 días hábiles.
            </p>
          </div>
        </Link>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">{t("landing.footer.allRights", { year })}</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Handshake className="h-3 w-3 text-[#D92D20]" />{t("landing.footer.madeIn")}
          </div>
        </div>
      </div>
    </footer>
  );
}
