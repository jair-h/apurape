import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase-server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.apurape.com";

// Regenerate the sitemap at most once an hour (ISR)
export const revalidate = 3600;

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

const STATIC_PAGES: { path: string; priority: number; freq: Freq }[] = [
  { path: "",                priority: 1.0, freq: "daily" },
  { path: "/servicios",      priority: 0.9, freq: "daily" },
  { path: "/blog",           priority: 0.9, freq: "daily" },
  { path: "/sobre-nosotros", priority: 0.7, freq: "monthly" },
  { path: "/planes",         priority: 0.8, freq: "monthly" },
  { path: "/como-funciona",  priority: 0.7, freq: "monthly" },
  { path: "/reclamos",       priority: 0.5, freq: "yearly" },
  { path: "/terminos",       priority: 0.3, freq: "yearly" },
  { path: "/privacidad",     priority: 0.3, freq: "yearly" },
  { path: "/contacto",       priority: 0.5, freq: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServerSupabase();

    // Una entrada por categoría de servicio y una por perfil público de
    // proveedor. Los servicios sueltos no tienen página propia todavía.
    const [blog, categories, providers] = await Promise.all([
      supabase.from("blog_posts").select("slug, updated_at").eq("status", "published"),
      supabase.from("service_categories").select("slug").eq("active", true),
      supabase.from("profiles").select("id, updated_at").eq("role", "proveedor").eq("suspended", false),
    ]);

    const blogEntries: MetadataRoute.Sitemap = (blog.data ?? []).map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryEntries: MetadataRoute.Sitemap = (categories.data ?? []).map((c) => ({
      url: `${BASE}/servicios?categoria=${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const providerEntries: MetadataRoute.Sitemap = (providers.data ?? []).map((p) => ({
      url: `${BASE}/perfil/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    dynamicEntries = [...blogEntries, ...categoryEntries, ...providerEntries];
  } catch {
    // If Supabase is unreachable at build time, still return the static pages.
    dynamicEntries = [];
  }

  return [...staticEntries, ...dynamicEntries];
}
