"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Package,
  Award,
  FileText,
  Truck,
  TrendingUp,
  MessageCircle,
  BookOpen,
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
  Building2,
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
  productor: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",             href: "/dashboard/productor" },
    { icon: User,            labelKey: "sidebar.myProfile",        href: "/dashboard/productor/perfil" },
    { icon: Package,         labelKey: "sidebar.myCatalog",        href: "/dashboard/productor/catalogo" },
    { icon: ClipboardList,   labelKey: "sidebar.purchaseRequests", href: "/dashboard/productor/rfqs" },
    { icon: Truck,           labelKey: "sidebar.freightQuote",     href: "/dashboard/logistica/cotizar" },
    { icon: FileText,        labelKey: "sidebar.myFreight",        href: "/dashboard/logistica/mis-solicitudes" },
    { icon: TrendingUp,      labelKey: "sidebar.myOperations",     href: "/dashboard/productor/operaciones" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",         href: "/dashboard/mensajes" },
    { icon: Award,           labelKey: "sidebar.certifications",   href: "/dashboard/certificaciones",        comingSoon: true },
    { icon: BookOpen,        labelKey: "sidebar.courses",          href: "/dashboard/cursos",                 comingSoon: true },
    { icon: CreditCard,      labelKey: "sidebar.myPlan",           href: "/dashboard/plan" },
  ],
  exportador: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",              href: "/dashboard/exportador" },
    { icon: User,            labelKey: "sidebar.myProfile",         href: "/dashboard/exportador/perfil" },
    { icon: Package,         labelKey: "sidebar.myProducts",        href: "/dashboard/exportador/productos" },
    { icon: Search,          labelKey: "sidebar.searchProducers",   href: "/dashboard/exportador/productores" },
    { icon: ClipboardList,   labelKey: "sidebar.myRequests",        href: "/dashboard/exportador/solicitudes" },
    { icon: Plus,            labelKey: "sidebar.publishRequest",    href: "/dashboard/exportador/rfq/nuevo" },
    { icon: Search,          labelKey: "sidebar.availableRequests", href: "/dashboard/exportador/disponibles" },
    { icon: Truck,           labelKey: "sidebar.freightQuote",      href: "/dashboard/logistica/cotizar" },
    { icon: FileText,        labelKey: "sidebar.myFreight",         href: "/dashboard/logistica/mis-solicitudes" },
    { icon: TrendingUp,      labelKey: "sidebar.myOperations",      href: "/dashboard/exportador/operaciones" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",          href: "/dashboard/mensajes" },
    { icon: CreditCard,      labelKey: "sidebar.myPlan",            href: "/dashboard/plan" },
  ],
  comprador: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",             href: "/dashboard/comprador" },
    { icon: User,            labelKey: "sidebar.myProfile",        href: "/dashboard/comprador/perfil" },
    { icon: Search,          labelKey: "sidebar.exploreCatalog",   href: "/catalogo" },
    { icon: Users,           labelKey: "sidebar.searchSuppliers",  href: "/directorio" },
    { icon: Plus,            labelKey: "sidebar.publishRequest",   href: "/dashboard/comprador/solicitud/nueva" },
    { icon: ClipboardList,   labelKey: "sidebar.myRequests",       href: "/dashboard/comprador/solicitudes" },
    { icon: TrendingUp,      labelKey: "sidebar.myOperations",     href: "/dashboard/comprador/operaciones" },
    { icon: Truck,           labelKey: "sidebar.freightQuote",     href: "/dashboard/logistica/cotizar" },
    { icon: FileText,        labelKey: "sidebar.myFreight",        href: "/dashboard/logistica/mis-solicitudes" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",         href: "/dashboard/mensajes" },
    { icon: CreditCard,      labelKey: "sidebar.myPlan",           href: "/dashboard/plan" },
  ],
  forwarder: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",           href: "/dashboard/forwarder" },
    { icon: User,            labelKey: "sidebar.myProfile",      href: "/dashboard/forwarder/perfil" },
    { icon: FileText,        labelKey: "sidebar.availableRFQs",  href: "/dashboard/forwarder/rfqs" },
    { icon: ClipboardList,   labelKey: "sidebar.myQuotes",       href: "/dashboard/forwarder/cotizaciones" },
    { icon: MessageCircle,   labelKey: "sidebar.messages",       href: "/dashboard/mensajes" },
    { icon: TrendingUp,      labelKey: "sidebar.operations",     href: "/dashboard/forwarder/operaciones" },
  ],
  certificadora: [
    { icon: LayoutDashboard, labelKey: "sidebar.home",            href: "/dashboard/certificadora" },
    { icon: Award,           labelKey: "sidebar.certifications",  href: "/dashboard/certificadora/certificaciones" },
    { icon: Users,           labelKey: "sidebar.producers",       href: "/dashboard/certificadora/productores",    comingSoon: true },
    { icon: FileText,        labelKey: "sidebar.reports",         href: "/dashboard/certificadora/informes",       comingSoon: true },
  ],
  admin: [
    { icon: LayoutDashboard, labelKey: "sidebar.dashboard",          href: "/dashboard/admin" },
    { icon: Users,           labelKey: "sidebar.users",              href: "/dashboard/admin/usuarios" },
    { icon: PenSquare,       labelKey: "sidebar.blog",               href: "/dashboard/admin/blog" },
    { icon: Image,           labelKey: "sidebar.banners",            href: "/dashboard/admin/banners" },
    { icon: AlertCircle,     labelKey: "sidebar.complaints",         href: "/dashboard/admin/reclamaciones" },
    { icon: Building2,       labelKey: "sidebar.cooperatives",       href: "/dashboard/admin/cooperativas" },
    { icon: Settings,        labelKey: "sidebar.settings",           href: "/dashboard/admin/configuracion" },
    { icon: Shield,          labelKey: "sidebar.verification",       href: "/dashboard/admin/verificacion" },
    { icon: TrendingUp,      labelKey: "sidebar.operations",         href: "/dashboard/admin/operaciones" },
    { icon: DollarSign,      labelKey: "sidebar.billing",            href: "/dashboard/admin/cobros" },
    { icon: Home,            labelKey: "sidebar.backToHome",         href: "/" },
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
  const [freightBadge,     setFreightBadge]     = useState(0);
  const [operacionesBadge, setOperacionesBadge] = useState(0);

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
        .eq("user_id", user.id)
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

  useEffect(() => {
    const rolesWithFletes = ["productor", "exportador", "comprador"];
    if (!userId || !role || !rolesWithFletes.includes(role)) return;
    const supabase = createClient();
    async function fetchFreightBadge() {
      const { data: rfqs } = await supabase
        .from("rfq_logistics")
        .select("id")
        .eq("requester_id", userId);
      if (!rfqs || rfqs.length === 0) { setFreightBadge(0); return; }
      const { count } = await supabase
        .from("logistics_quotes")
        .select("id", { count: "exact", head: true })
        .in("rfq_id", rfqs.map(r => r.id))
        .eq("status", "pending");
      setFreightBadge(count ?? 0);
    }
    fetchFreightBadge();
    const interval = setInterval(fetchFreightBadge, 5000);
    return () => clearInterval(interval);
  }, [userId, role]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    async function fetchOpsBadge() {
      const { count } = await supabase
        .from("operations")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId},forwarder_id.eq.${userId}`)
        .gte("created_at", sevenDaysAgo)
        .eq("status", "confirmed");
      setOperacionesBadge(count ?? 0);
    }
    fetchOpsBadge();
    const interval = setInterval(fetchOpsBadge, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleLogout = () => {
    createClient().auth.signOut();
    router.push("/login");
  };

  const isAdmin = role === "admin";
  const bg = isAdmin ? "bg-[#0D2B1F]" : "bg-[#085041]";
  const navItems = role ? (NAV_BY_ROLE[role] ?? DEFAULT_NAV) : DEFAULT_NAV;

  return (
    <aside className={`w-56 flex-shrink-0 ${bg} flex flex-col h-full`}>
      {/* Logo */}
      <Link href="/" onClick={onClose} className="flex items-center gap-2 px-4 h-14 border-b border-white/10 hover:bg-white/5 transition-colors">
        <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain flex-shrink-0" />
        <span className="font-bold text-sm text-white leading-tight">
          MARKARU
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
            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
            const isMensajes    = item.href === "/dashboard/mensajes";
            const isMisFletes   = item.href === "/dashboard/logistica/mis-solicitudes";
            const isOperaciones = item.href.endsWith("/operaciones");
            const badge = isMensajes && totalUnread > 0
              ? totalUnread
              : isMisFletes && freightBadge > 0
              ? freightBadge
              : isOperaciones && operacionesBadge > 0
              ? operacionesBadge
              : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-100 ${
                  active
                    ? "bg-[#1D9E75] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-white" : "text-white/60"}`} />
                <span className="flex-1">{t(item.labelKey)}</span>
                {badge > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#085041] text-[9px] font-bold flex items-center justify-center">
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
                  lang === l ? "text-[#4CD9A4]" : "text-white/40 hover:text-white"
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
