import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase-server";

const BASE = "https://www.markaru.com";

// Regenerate the sitemap at most once an hour (ISR)
export const revalidate = 3600;

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

const STATIC_PAGES: { path: string; priority: number; freq: Freq }[] = [
  { path: "",                     priority: 1.0, freq: "daily" },
  { path: "/catalogo",            priority: 0.9, freq: "daily" },
  { path: "/directorio",          priority: 0.8, freq: "weekly" },
  { path: "/blog",                priority: 0.9, freq: "daily" },
  { path: "/sobre-nosotros",      priority: 0.7, freq: "monthly" },
  { path: "/planes",              priority: 0.8, freq: "monthly" },
  { path: "/como-funciona",       priority: 0.7, freq: "monthly" },
  { path: "/reclamos",            priority: 0.5, freq: "yearly" },
  { path: "/terminos",            priority: 0.3, freq: "yearly" },
  { path: "/privacidad",          priority: 0.3, freq: "yearly" },
  { path: "/contacto",            priority: 0.5, freq: "monthly" },
  { path: "/roles/productor",     priority: 0.7, freq: "monthly" },
  { path: "/roles/exportador",    priority: 0.7, freq: "monthly" },
  { path: "/roles/forwarder",     priority: 0.7, freq: "monthly" },
  { path: "/roles/comprador",     priority: 0.7, freq: "monthly" },
  { path: "/roles/certificadora", priority: 0.7, freq: "monthly" },
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
    const [blog, products, exporterProducts] = await Promise.all([
      supabase.from("blog_posts").select("slug, updated_at").eq("status", "published"),
      supabase.from("products").select("id").eq("status", "active"),
      supabase.from("exporter_products").select("id").eq("status", "active"),
    ]);

    const blogEntries: MetadataRoute.Sitemap = (blog.data ?? []).map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const productEntries: MetadataRoute.Sitemap = (products.data ?? []).map((p) => ({
      url: `${BASE}/producto/${p.id}?tipo=productor`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const exporterEntries: MetadataRoute.Sitemap = (exporterProducts.data ?? []).map((p) => ({
      url: `${BASE}/producto/${p.id}?tipo=exportador`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    dynamicEntries = [...blogEntries, ...productEntries, ...exporterEntries];
  } catch {
    // If Supabase is unreachable at build time, still return the static pages.
    dynamicEntries = [];
  }

  return [...staticEntries, ...dynamicEntries];
}
