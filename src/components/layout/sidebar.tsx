"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Package,
  TrendingUp,
  MessageCircle,
  CreditCard,
  Search,
  Users,
  DollarSign,
  LogOut,
  Shield,
  ClipboardList,
  Plus,
  Star,
  PenSquare,
  Image,
  AlertCircle,
  Settings,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation, SUPPORTED_LANGS } from "@/lib/i18n";
import { Globe } from "lucide-react";

/* ─── Types ───────────────────────────────────────────────── */

type NavItem = {
  icon: React.ElementType;
  labelKey: string;
  href: string;
  comingSoon?: boolean;
};

/* ─── Navigation per role ─────────────────────────────────── */

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  proveedor: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",              href: "/dashboard/proveedor" },
    { icon: User,            labelKey: "sidebar.myProfile",         href: "/dashboard/proveedor/perfil" },
    { icon: Package,         labelKey: "sidebar.myServices",        href: "/dashboard/proveedor/servicios" },
    { icon: Search,          labelKey: "sidebar.availableRequests", href: "/dashboard/proveedor/solicitudes" },
    { icon: ClipboardList,   labelKey: "sidebar.myQuotes",          href: "/dashboard/proveedor/cotizaciones" },
    { icon: TrendingUp,      labelKey: "sidebar.myJobs",            href: "/dashboard/proveedor/trabajos" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",          href: "/dashboard/mensajes" },
    { icon: Star,            labelKey: "sidebar.raffle",            href: "/dashboard/sorteo" },
    { icon: CreditCard,      labelKey: "sidebar.myPlan",            href: "/dashboard/plan" },
  ],
  cliente: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",           href: "/dashboard/cliente" },
    { icon: User,            labelKey: "sidebar.myProfile",      href: "/dashboard/cliente/perfil" },
    { icon: Search,          labelKey: "sidebar.findServices",   href: "/servicios" },
    { icon: Plus,            labelKey: "sidebar.publishRequest", href: "/dashboard/cliente/solicitud/nueva" },
    { icon: ClipboardList,   labelKey: "sidebar.myRequests",     href: "/dashboard/cliente/solicitudes" },
    { icon: TrendingUp,      labelKey: "sidebar.myHires",        href: "/dashboard/cliente/trabajos" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",       href: "/dashboard/mensajes" },
    { icon: Star,            labelKey: "sidebar.myPoints",       href: "/dashboard/cliente/puntos" },
  ],
  admin: [
    { icon: LayoutDashboard, labelKey: "sidebar.dashboard",    href: "/dashboard/admin" },
    { icon: Users,           labelKey: "sidebar.users",        href: "/dashboard/admin/usuarios" },
    { icon: Star,            labelKey: "sidebar.raffles",      href: "/dashboard/admin/sorteos" },
    { icon: PenSquare,       labelKey: "sidebar.blog",         href: "/dashboard/admin/blog" },
    { icon: Image,           labelKey: "sidebar.banners",      href: "/dashboard/admin/banners" },
    { icon: AlertCircle,     labelKey: "sidebar.complaints",   href: "/dashboard/admin/reclamaciones" },
    { icon: Settings,        labelKey: "sidebar.settings",     href: "/dashboard/admin/configuracion" },
    { icon: Shield,          labelKey: "sidebar.verification", href: "/dashboard/admin/verificacion" },
    { icon: DollarSign,      labelKey: "sidebar.billing",      href: "/dashboard/admin/cobros" },
    { icon: Home,            labelKey: "sidebar.backToHome",   href: "/" },
  ],
};

const DEFAULT_NAV: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "sidebar.dashboard", href: "/dashboard" },
  { icon: User,            labelKey: "sidebar.myProfile", href: "/dashboard/perfil" },
];

/* ─── Sidebar ─────────────────────────────────────────────── */

export default function DashboardSidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useTranslation();
  const [role,             setRole]             = useState<string | null>(null);
  const [userName,         setUserName]         = useState<string>("");
  const [loading,          setLoading]          = useState(true);
  const [userId,           setUserId]           = useState<string | null>(null);
  const [totalUnread,      setTotalUnread]      = useState(0);
  const [trabajosBadge,    setTrabajosBadge]    = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Usuario");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? null);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    async function fetchUnread() {
      const { data } = await supabase
        .from("conversations")
        .select("participant_1, unread_count_p1, unread_count_p2")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
      if (data) {
        const total = data.reduce(
          (sum: number, c: { participant_1: string; unread_count_p1: number; unread_count_p2: number }) =>
            sum + (c.participant_1 === userId ? c.unread_count_p1 : c.unread_count_p2),
          0
        );
        setTotalUnread(total);
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  // Badge de trabajos: para el Cliente son los servicios que el
  // Proveedor marcó como completados y esperan su confirmación —
  // el paso que sostiene todo el ranking del sorteo, así que tiene
  // que verse. Para el Proveedor, los que aún están agendados.
  useEffect(() => {
    if (!userId || !role) return;
    const supabase = createClient();
    async function fetchJobsBadge() {
      const query = supabase.from("jobs").select("id", { count: "exact", head: true });
      const { count } = role === "cliente"
        ? await query.eq("client_id", userId).eq("status", "pendiente_confirmar")
        : await query.eq("provider_id", userId).eq("status", "agendado");
      setTrabajosBadge(count ?? 0);
    }
    fetchJobsBadge();
    const interval = setInterval(fetchJobsBadge, 10000);
    return () => clearInterval(interval);
  }, [userId, role]);

  const handleLogout = () => {
    createClient().auth.signOut();
    router.push("/login");
  };

  const isAdmin = role === "admin";
  const bg = isAdmin ? "bg-[#7A271A]" : "bg-[#B42318]";
  const navItems = role ? (NAV_BY_ROLE[role] ?? DEFAULT_NAV) : DEFAULT_NAV;

  return (
    <aside className={`w-56 flex-shrink-0 ${bg} flex flex-col h-full`}>
      {/* Logo */}
      <Link href="/" onClick={onClose} className="flex items-center gap-2 px-4 h-14 border-b border-white/10 hover:bg-white/5 transition-colors">
        <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain flex-shrink-0" />
        <span className="font-bold text-sm text-white leading-tight">
          Apurape
          <span className="block text-[10px] font-normal text-white/50">LATAM</span>
        </span>
      </Link>

      {/* User info */}
      <div className="px-4 py-3 border-b border-white/10">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="h-2.5 bg-white/10 rounded animate-pulse w-24" />
              <div className="h-2 bg-white/10 rounded animate-pulse w-16" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D92D20] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              {role && (
                <span className="inline-block text-[10px] bg-white/15 text-white/80 px-1.5 py-0.5 rounded mt-0.5">
                  {t(`roles.${role}`)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {loading ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          navItems.map((item) => {
            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/35 cursor-not-allowed select-none"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0 text-white/25" />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  <span className="text-[9px] font-bold bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {t("sidebar.comingSoon")}
                  </span>
                </div>
              );
            }

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const isMensajes  = item.href === "/dashboard/mensajes";
            const isTrabajos  = item.href.endsWith("/trabajos");
            const badge = isMensajes && totalUnread > 0
              ? totalUnread
              : isTrabajos && trabajosBadge > 0
              ? trabajosBadge
              : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-100 ${
                  active
                    ? "bg-[#D92D20] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-white" : "text-white/60"}`} />
                <span className="flex-1">{t(item.labelKey)}</span>
                {badge > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#B42318] text-[9px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* Language + Logout */}
      <div className="px-2 py-3 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-1 px-3 py-1.5">
          <Globe className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
          {SUPPORTED_LANGS.map((l, i) => (
            <span key={l} className="flex items-center">
              {i > 0 && <span className="text-white/20 text-xs mx-0.5">/</span>}
              <button
                onClick={() => setLang(l)}
                className={`text-xs font-bold px-0.5 transition-colors ${
                  lang === l ? "text-[#FDA29B]" : "text-white/40 hover:text-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all duration-100"
        >
          <LogOut className="h-4 w-4" />
          {t("sidebar.signOut")}
        </button>
      </div>
    </aside>
  );
}
