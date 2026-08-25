"use client";

import { useState } from "react";
import { Menu, Globe } from "lucide-react";
import Link from "next/link";
import DashboardSidebar from "./sidebar";
import ProfileBanner from "./ProfileBanner";
import { useTranslation, SUPPORTED_LANGS } from "@/lib/i18n";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />

      {/* Sidebar — drawer on mobile, permanent on desktop */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50",
          "md:relative md:inset-auto md:left-auto md:z-auto",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <DashboardSidebar onClose={close} />
      </div>

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex-shrink-0 flex items-center gap-3 h-12 px-4 bg-[#085041] border-b border-white/10">
          <button
            onClick={() => setOpen(true)}
            className="text-white/80 hover:text-white p-1 -ml-1 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-1.5 flex-1">
            <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain flex-shrink-0" />
            <span className="font-bold text-sm text-white">MARKARU</span>
          </Link>
          {/* Lang toggle mobile */}
          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-white/40" />
            {SUPPORTED_LANGS.map((l, i) => (
              <span key={l} className="flex items-center">
                {i > 0 && <span className="text-white/20 text-xs">/</span>}
                <button
                  onClick={() => setLang(l)}
                  className={`text-xs font-bold px-0.5 transition-colors ${
                    lang === l ? "text-[#4CD9A4]" : "text-white/40 hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              </span>
            ))}
          </div>
        </header>

        <ProfileBanner />
        {children}
      </div>
    </div>
  );
}
