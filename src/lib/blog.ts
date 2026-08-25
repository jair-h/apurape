/* Shared blog config — used by admin editor and public article page */

export interface Faq { question: string; answer: string; }

export const CAT_LABEL: Record<string, string> = {
  productos: "Productos", logistica: "Logística", mercados: "Mercados",
  exportacion: "Exportación", certificaciones: "Certificaciones",
  financiamiento: "Financiamiento", normativa: "Normativa", tecnologia: "Tecnología & IA",
};

/* ─── Reusable CTAs ───────────────────────────────────────── */
export type CtaKey = "productores" | "exportadores" | "logistica" | "compradores" | "general";

export const CTA_PRESETS: Record<CtaKey, { label: string; title: string; description: string; button: string; link: string }> = {
  productores: {
    label: "Productores",
    title: "¿Eres productor agrícola?",
    description: "Crea tu perfil y empieza a recibir oportunidades comerciales.",
    button: "Crear perfil de productor",
    link: "/register",
  },
  exportadores: {
    label: "Exportadores",
    title: "¿Eres exportador?",
    description: "Encuentra proveedores verificados y solicita cotizaciones.",
    button: "Buscar proveedores",
    link: "/register",
  },
  logistica: {
    label: "Logística / Forwarder",
    title: "¿Ofreces servicios logísticos?",
    description: "Recibe RFQs reales y conecta con empresas que necesitan transporte.",
    button: "Recibir RFQs",
    link: "/register",
  },
  compradores: {
    label: "Compradores",
    title: "¿Buscas proveedores en LATAM?",
    description: "Publica una solicitud y compara ofertas de productores y exportadores.",
    button: "Publicar solicitud",
    link: "/register",
  },
  general: {
    label: "General",
    title: "Únete a MARKARU",
    description: "Únete a Markaru y conecta con el ecosistema agroexportador.",
    button: "Crear cuenta gratis",
    link: "/register",
  },
};

export const CTA_ORDER: CtaKey[] = ["productores", "exportadores", "logistica", "compradores", "general"];

/* ─── Related tools ───────────────────────────────────────── */
export interface BlogTool { key: string; label: string; href: string; icon: string; }

export const BLOG_TOOLS: BlogTool[] = [
  { key: "buscar_compradores",     label: "Buscar compradores",     href: "/directorio", icon: "users" },
  { key: "cotizar_logistica",      label: "Cotizar logística",      href: "/dashboard/logistica/cotizar", icon: "ship" },
  { key: "buscar_forwarders",      label: "Buscar forwarders",      href: "/directorio", icon: "truck" },
  { key: "buscar_certificadoras",  label: "Buscar certificadoras",  href: "/directorio", icon: "shield" },
  { key: "buscar_financiamiento",  label: "Buscar financiamiento",  href: "/directorio", icon: "banknote" },
  { key: "crear_perfil_productor", label: "Crear perfil productor", href: "/register",   icon: "sprout" },
  { key: "crear_perfil_exportador",label: "Crear perfil exportador",href: "/register",   icon: "building" },
];

export const BLOG_TOOLS_MAP: Record<string, BlogTool> = Object.fromEntries(BLOG_TOOLS.map((t) => [t.key, t]));

/* ─── Word count + reading time from HTML (words / 200) ──── */
export function contentStats(html: string) {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.round(words / 200)) };
}
