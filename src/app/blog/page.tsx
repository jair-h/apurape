import { createServerSupabase } from "@/lib/supabase-server";
import BlogClient, { type Post } from "./BlogClient";

/* Always render fresh on the server (no stale static HTML with a spinner) */
export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Blog · Centro de Recursos para Proveedores · Apurape",
  description: "Guías prácticas para proveedores de servicios en Perú: cómo conseguir más clientes, cuánto cobrar por tu trabajo y cómo construir una reputación que hable por ti.",
};

export default async function BlogPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, summary, image_url, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return <BlogClient posts={(data ?? []) as Post[]} />;
}
