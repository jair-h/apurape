"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Globe } from "lucide-react";
import PublicNavAuthSection from "@/components/PublicNavAuthSection";
import { useTranslation, SUPPORTED_LANGS } from "@/lib/i18n";

function LangToggle({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <Globe className={`h-3.5 w-3.5 flex-shrink-0 ${dark ? "text-white/50" : "text-gray-400"}`} />
      {SUPPORTED_LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span className={`text-xs mx-0.5 ${dark ? "text-white/20" : "text-gray-300"}`}>/</span>
          )}
          <button
            onClick={() => setLang(l)}
            className={`text-xs font-bold transition-colors px-0.5 ${
              lang === l
                ? dark ? "text-[#FDA29B]" : "text-[#D92D20]"
                : dark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { t } = useTranslation();

  const NAV_LINKS = [
    { href: "/servicios",       label: t("nav.services") },
    { href: "/#como-funciona",  label: t("nav.howItWorks") },
    { href: "/#planes",         label: t("nav.plans") },
    { href: "/sobre-nosotros",  label: t("nav.about") },
    { href: "/blog",            label: t("nav.blog") },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <img src="/images/apurape-mark.svg" alt="Apurape" className="h-10 w-auto object-contain flex-shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg text-gray-900 leading-none">Apurape</span>
              <span className="text-[10px] text-[#D92D20] font-medium italic leading-none mt-0.5 hidden sm:block">
                {t("landing.slogan")}
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-gray-600 hover:text-[#D92D20] text-sm font-medium transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right side: lang + auth | Mobile: hamburger */}
          <div className="flex items-center gap-3">
            {/* Desktop only */}
            <div className="hidden md:flex items-center gap-3">
              <LangToggle />
              <PublicNavAuthSection />
            </div>
            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={t("nav.openMenu")}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#FEF3F2] hover:text-[#B42318] transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 mt-1 border-t border-gray-100 space-y-1">
            <div className="px-3 py-1">
              <LangToggle />
            </div>
            <PublicNavAuthSection mobile onNavigate={close} />
          </div>
        </div>
      )}
    </nav>
  );
}
