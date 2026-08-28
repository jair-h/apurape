/* Shared blog config — used by admin editor and public article page */

export interface Faq { question: string; answer: string; }

export const CAT_LABEL: Record<string, string> = {
  guias: "Guías para Proveedores", crecer: "Cómo Crecer tu Negocio",
  historias: "Historias de Éxito", atencion: "Atención al Cliente",
  precios: "Precios y Cotización", apurape: "Novedades de Apurape",
};

/* ─── Reusable CTAs ───────────────────────────────────────── */
export type CtaKey = "proveedores" | "clientes" | "concurso" | "general";

export const CTA_PRESETS: Record<CtaKey, { label: string; title: string; description: string; button: string; link: string }> = {
  proveedores: {
    label: "Proveedores",
    title: "¿Ofreces un servicio?",
    description: "Publica tus servicios y empieza a recibir clientes de tu distrito. 0% de comisión.",
    button: "Crear perfil de proveedor",
    link: "/register?rol=proveedor",
  },
  clientes: {
    label: "Clientes",
    title: "¿Necesitas que te resuelvan algo?",
    description: "Cuenta qué necesitas y recibe cotizaciones sin costo. Contratar en Apurape es gratis.",
    button: "Publicar una solicitud",
    link: "/register?rol=cliente",
  },
  concurso: {
    label: "Concurso mensual",
    title: "Trabajar bien tiene premio",
    description: "Cada mes premiamos a los proveedores con más servicios confirmados y mejores calificaciones.",
    button: "Ver las bases del concurso",
    link: "/concurso",
  },
  general: {
    label: "General",
    title: "Únete a Apurape",
    description: "Tú me ayudas, yo te ayudo. Crea tu cuenta gratis y empieza hoy.",
    button: "Crear cuenta gratis",
    link: "/register",
  },
};

export const CTA_ORDER: CtaKey[] = ["proveedores", "clientes", "concurso", "general"];

/* ─── Related tools ───────────────────────────────────────── */
export interface BlogTool { key: string; label: string; href: string; icon: string; }

export const BLOG_TOOLS: BlogTool[] = [
  { key: "buscar_servicios",       label: "Buscar servicios",        href: "/servicios", icon: "search" },
  { key: "publicar_solicitud",     label: "Publicar una solicitud",  href: "/dashboard/cliente/solicitud/nueva", icon: "clipboard" },
  { key: "crear_perfil_proveedor", label: "Ofrecer mis servicios",   href: "/register?rol=proveedor", icon: "wrench" },
  { key: "crear_cuenta_cliente",   label: "Crear cuenta de cliente", href: "/register?rol=cliente",   icon: "users" },
];

export const BLOG_TOOLS_MAP: Record<string, BlogTool> = Object.fromEntries(BLOG_TOOLS.map((t) => [t.key, t]));

/* ─── Word count + reading time from HTML (words / 200) ──── */
export function contentStats(html: string) {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.round(words / 200)) };
}
