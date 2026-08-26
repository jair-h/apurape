"use client";

import Link from "next/link";
import { Check, ArrowRight, HelpCircle, X, Star, Leaf } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Pricing from "@/components/landing/pricing";
import { useTranslation } from "@/lib/i18n";

export default function PlanesPage() {
  const { t } = useTranslation();

  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`planesPage.faq${n}q`),
    a: t(`planesPage.faq${n}a`),
  }));

  return (
    <>
      <LandingNavbar />
      <main className="pt-16">

        {/* ── SECTION 1 · Hero ── */}
        <section className="bg-[#B42318] py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 bg-[#FEF3F2] text-[#B42318] text-xs font-bold px-4 py-1.5 rounded-full mb-6">
              {t("planesPage.heroBadge")}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              {t("planesPage.heroTitle")}
            </h1>
            <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto mb-8">
              {t("planesPage.heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              {[t("planesPage.trust1"), t("planesPage.trust2"), t("planesPage.trust3")].map((tr) => (
                <div key={tr} className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#D92D20]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {tr}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2 + 3 · Role tabs + plan cards (reuses landing Pricing) ── */}
        <Pricing />

        {/* ── SECTION 4 · Why Apurape (value comparison) ── */}
        <section className="py-20 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#B42318] mb-3">{t("planesPage.whyTitle")}</h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">{t("planesPage.whySubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Alibaba */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col">
                <p className="text-lg font-bold text-gray-800 mb-4">{t("planesPage.compAlibabaName")}</p>
                <p className="inline-flex items-start gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <X className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /> {t("planesPage.compAlibabaPrice")}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-auto">{t("planesPage.compAlibabaExample")}</p>
              </div>

              {/* Apurape — highlighted */}
              <div className="relative rounded-2xl bg-[#B42318] text-white p-6 flex flex-col shadow-2xl ring-2 ring-[#D92D20] md:-mt-3 md:mb-3">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-[#D92D20] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow whitespace-nowrap">
                  <Star className="h-3 w-3" /> {t("planesPage.compMarkaruBadge")}
                </span>
                <p className="text-lg font-extrabold mb-4">Apurape</p>
                <p className="inline-flex items-start gap-2 text-sm font-bold text-white mb-3">
                  <Check className="h-4 w-4 text-[#FDA29B] flex-shrink-0 mt-0.5" /> {t("planesPage.compMarkaruPrice")}
                </p>
                <p className="text-sm text-red-100 leading-relaxed mb-4">{t("planesPage.compMarkaruExample")}</p>
                <div className="mt-auto inline-flex items-center justify-center gap-2 bg-[#D92D20] rounded-xl py-2.5 text-sm font-extrabold">
                  {t("planesPage.compMarkaruSaving")}
                </div>
              </div>

              {/* Other marketplaces */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col">
                <p className="text-lg font-bold text-gray-800 mb-4">{t("planesPage.compOtherName")}</p>
                <p className="inline-flex items-start gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <X className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /> {t("planesPage.compOtherPrice")}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-auto">{t("planesPage.compOtherExample")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5 · FAQ ── */}
        <section className="py-20 sm:py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="inline-flex items-center gap-2 text-3xl sm:text-4xl font-extrabold text-[#B42318]">
                <HelpCircle className="h-7 w-7" /> {t("planesPage.faqTitle")}
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={i} className="group bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-bold text-[#1E293B]">
                    {f.q}
                    <ArrowRight className="h-4 w-4 text-[#D92D20] flex-shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6 · Final CTA ── */}
        <section className="py-20 bg-gradient-to-br from-[#7A271A] via-[#D92D20] to-[#F97066] text-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{t("planesPage.ctaTitle")}</h2>
            <p className="text-white/90 mb-8">{t("planesPage.ctaSubtitle")}</p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#B42318] px-8 py-4 rounded-xl text-base font-extrabold hover:bg-gray-100 transition-colors shadow-xl">
              {t("planesPage.ctaButton")} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm text-white">Apurape</span>
            </div>
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} Apurape</p>
          </div>
        </footer>
      </main>
    </>
  );
}
