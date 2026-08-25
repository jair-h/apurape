"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface AuthUser {
  name: string;
  email: string;
}

interface Props {
  /** Renders as vertical list items for mobile hamburger dropdowns */
  mobile?: boolean;
  /** Called after a link/button click — use to close the mobile menu */
  onNavigate?: () => void;
}

export default function PublicNavAuthSection({ mobile, onNavigate }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user: u } }) => {
        if (u) {
          setUser({
            name:
              u.user_metadata?.name ??
              u.user_metadata?.full_name ??
              u.email?.split("@")[0] ??
              "Usuario",
            email: u.email ?? "",
          });
        } else {
          setUser(null);
        }
      });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const signOut = async () => {
    await createClient().auth.signOut();
    setUser(null);
    setMenuOpen(false);
    onNavigate?.();
    router.push("/");
  };

  /* ── Not logged in ── */
  if (!user) {
    if (mobile) {
      return (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href="/register"
            onClick={onNavigate}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors"
          >
            {t("nav.register")}
          </Link>
        </>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-xs font-medium text-gray-600 hover:text-[#1D9E75] transition-colors"
        >
          {t("nav.signIn")}
        </Link>
        <Link
          href="/register"
          className="bg-[#1D9E75] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#085041] transition-colors"
        >
          {t("nav.register")}
        </Link>
      </div>
    );
  }

  /* ── Logged in ── */
  const initial = user.name.charAt(0).toUpperCase();

  if (mobile) {
    return (
      <>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
          <span className="truncate">{user.name}</span>
        </Link>
        <button
          onClick={signOut}
          className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {t("nav.signOut")}
        </button>
      </>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initial}
        </div>
        <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate hidden sm:block">
          {user.name}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-[#E1F5EE] hover:text-[#085041] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            {t("nav.myPanel")}
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
