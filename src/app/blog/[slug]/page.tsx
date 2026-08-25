import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Leaf, Calendar, Tag, ChevronLeft, Clock, User, ArrowRight, List,
  Package, Building2, Ship, RefreshCw, Users, Truck, ShieldCheck, Banknote, Sprout, Wrench, HelpCircle,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import ShareButtons from "@/components/blog/ShareButtons";
import BlogFooter from "@/components/blog/BlogFooter";
import { createServerSupabase } from "@/lib/supabase-server";
import { CAT_LABEL, CTA_PRESETS, BLOG_TOOLS_MAP, contentStats, type Faq } from "@/lib/blog";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://markaru.com";

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  meta_title: string | null;
  meta_description: string | null;
  faqs: Faq[] | null;
  cta_type: string | null;
  cta_link: string | null;
  related_ids: string[] | null;
  tools: string[] | null;
  published_at: string;
  updated_at: string | null;
}

interface CardPost {
  id: string; title: string; slug: string; image_url: string | null;
  category: string | null; published_at: string; content: string | null; tags: string[] | null;
}

type IconCmp = React.ComponentType<{ className?: string }>;
const TOOL_ICON: Record<string, IconCmp> = {
  users: Users, ship: Ship, truck: Truck, shield: ShieldCheck,
  banknote: Banknote, sprout: Sprout, building: Building2,
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

const slugifyHeading = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

/* Server-safe: inject ids into <h2>/<h3> and build the table of contents */
function processContent(html: string) {
  const toc: { id: string; text: string; level: number }[] = [];
  const used = new Set<string>();
  const out = (html || "").replace(/<(h[23])\b([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
    if (!text) return m;
    let id = slugifyHeading(text) || `sec-${toc.length + 1}`;
    const base = id;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    toc.push({ id, text, level: tag.toLowerCase() === "h3" ? 3 : 2 });
    if (/\bid\s*=/.test(attrs)) return m;
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("blog_posts").select("*")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Post | null) ?? null;
}

/* ─── SEO metadata (server-side) ──────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Artículo no encontrado · MARKARU Blog" };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.summary || post.title;
  const url = `${SITE_URL}/blog/${post.slug}`;
  const images = post.image_url ? [post.image_url] : [];

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} · MARKARU Blog`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article", title, description, url, images,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at || post.published_at,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

/* ─── Related card ────────────────────────────────────────── */
function RelatedCard({ p }: { p: CardPost }) {
  return (
    <Link href={`/blog/${p.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative aspect-video overflow-hidden bg-[#E1F5EE]">
        {p.image_url
          ? <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-8 w-8 text-[#1D9E75]" /></div>}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1 text-[10px] font-bold">
          {p.category && <span className="text-[#1D9E75]">{CAT_LABEL[p.category] ?? p.category}</span>}
          <span className="inline-flex items-center gap-1 text-gray-400"><Clock className="h-3 w-3" /> {contentStats(p.content ?? "").mins} min</span>
        </div>
        <h4 className="text-sm font-bold text-[#1E293B] line-clamp-2 group-hover:text-[#085041] transition-colors">{p.title}</h4>
      </div>
    </Link>
  );
}

/* ─── Page (Server Component) ─────────────────────────────── */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const supabase = createServerSupabase();
  const { data: pool } = await supabase
    .from("blog_posts")
    .select("id, title, slug, image_url, category, published_at, content, tags")
    .eq("status", "published").neq("id", post.id)
    .order("published_at", { ascending: false }).limit(20);
  const list = (pool ?? []) as CardPost[];
  const recent = list.slice(0, 3);

  let related: CardPost[] = [];
  if (post.related_ids?.length) {
    const { data: rel } = await supabase
      .from("blog_posts")
      .select("id, title, slug, image_url, category, published_at, content, tags")
      .in("id", post.related_ids).eq("status", "published");
    related = (rel ?? []) as CardPost[];
  } else {
    const scored = list.map((p) => {
      let s = 0;
      if (p.category && p.category === post.category) s += 2;
      s += (p.tags ?? []).filter((tag) => (post.tags ?? []).includes(tag)).length;
      return { p, s };
    }).sort((a, b) => b.s - a.s);
    const top = scored.filter((x) => x.s > 0).slice(0, 3).map((x) => x.p);
    related = top.length ? top : list.slice(0, 3);
  }

  const { html, toc } = processContent(post.content ?? "");
  const readMins = contentStats(post.content ?? "").mins;
  const catLabel = post.category ? (CAT_LABEL[post.category] ?? post.category) : null;
  const showUpdated = post.updated_at && new Date(post.updated_at).toDateString() !== new Date(post.published_at).toDateString();
  const faqs = (post.faqs ?? []).filter((f) => f.question && f.answer);
  const tools = (post.tools ?? []).map((k) => BLOG_TOOLS_MAP[k]).filter(Boolean);
  const cta = post.cta_type ? CTA_PRESETS[post.cta_type as keyof typeof CTA_PRESETS] : null;

  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = post.meta_title || post.title;
  const desc = post.meta_description || post.summary || post.title;
  const logo = `${SITE_URL}/favicon.ico`;

  const crumbs: { "@type": string; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
  ];
  if (catLabel) crumbs.push({ "@type": "ListItem", position: 3, name: catLabel, item: `${SITE_URL}/blog` });
  crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: post.title, item: url });

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: title, description: desc,
      image: post.image_url ? [post.image_url] : undefined,
      author: { "@type": "Organization", name: post.author || "Markaru Insights" },
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      publisher: { "@type": "Organization", name: "MARKARU", logo: { "@type": "ImageObject", url: logo } },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs },
    { "@context": "https://schema.org", "@type": "Organization", name: "MARKARU", url: SITE_URL, logo },
  ];
  if (faqs.length) {
    jsonLd.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    });
  }

  return (
    <>
      <LandingNavbar />
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <main className="pt-16 min-h-screen bg-gray-50">

        {/* Featured image */}
        <div className="relative aspect-video max-h-[420px] w-full overflow-hidden bg-[#085041]">
          {post.image_url ? (
            <>
              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#085041] to-[#1D9E75]" />
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-[1fr_320px] gap-10">

          {/* ── Left · Article ── */}
          <article className="min-w-0">
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-5">
              <Link href="/" className="hover:text-[#1D9E75] transition-colors">Inicio</Link>
              <span className="text-gray-300">›</span>
              <Link href="/blog" className="hover:text-[#1D9E75] transition-colors">Blog</Link>
              {catLabel && (<><span className="text-gray-300">›</span><Link href="/blog" className="hover:text-[#1D9E75] transition-colors">{catLabel}</Link></>)}
              <span className="text-gray-300">›</span>
              <span className="text-gray-700 truncate max-w-[40ch]">{post.title}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-[#6B7280]">
              {catLabel && (
                <span className="inline-flex items-center gap-1 bg-[#E1F5EE] text-[#085041] font-bold px-2.5 py-1 rounded-full">
                  <Tag className="h-3 w-3" /> {catLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.author || "Markaru Insights"}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {readMins} min de lectura</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] mb-4 leading-tight">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-6">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Publicado el {fmtDate(post.published_at)}</span>
              {showUpdated && (
                <span className="inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Última actualización: {fmtDate(post.updated_at!)}</span>
              )}
            </div>

            {post.summary && (
              <p className="text-lg text-[#6B7280] mb-6 leading-relaxed border-l-4 border-[#1D9E75] pl-4">{post.summary}</p>
            )}

            {/* Share */}
            <div className="mb-8 pb-6 border-b border-gray-200">
              <ShareButtons title={post.title} />
            </div>

            {/* TOC (mobile) */}
            {toc.length > 1 && (
              <div className="lg:hidden bg-white rounded-2xl border border-gray-200 p-5 mb-8">
                <p className="flex items-center gap-2 text-sm font-bold text-[#085041] mb-3"><List className="h-4 w-4" /> Contenido</p>
                <ul className="space-y-1.5">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a href={`#${h.id}`} className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors">{h.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content */}
            <div className="rich-content max-w-[68ch]" dangerouslySetInnerHTML={{ __html: html }} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">#{tag}</span>
                ))}
              </div>
            )}

            {/* Related tools */}
            {tools.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="flex items-center gap-2 text-xl font-extrabold text-[#085041] mb-5"><Wrench className="h-5 w-5" /> Herramientas relacionadas</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {tools.map((tool) => {
                    const Icon = TOOL_ICON[tool.icon] ?? Wrench;
                    return (
                      <Link key={tool.key} href={tool.href}
                        className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:border-[#1D9E75] hover:shadow-md transition-all">
                        <span className="p-2.5 rounded-xl bg-[#E1F5EE] text-[#1D9E75]"><Icon className="h-5 w-5" /></span>
                        <span className="text-sm font-bold text-gray-800 flex-1">{tool.label}</span>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#1D9E75] transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FAQ */}
            {faqs.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="flex items-center gap-2 text-xl font-extrabold text-[#085041] mb-5"><HelpCircle className="h-5 w-5" /> Preguntas frecuentes</h3>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <details key={i} className="group bg-white rounded-2xl border border-gray-200 p-4">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-bold text-[#1E293B]">
                        {f.question}
                        <ArrowRight className="h-4 w-4 text-[#1D9E75] flex-shrink-0 transition-transform group-open:rotate-90" />
                      </summary>
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {cta && (
              <div className="mt-12 rounded-3xl bg-gradient-to-br from-[#0d6b4f] via-[#1D9E75] to-[#2dd4a0] p-8 sm:p-10 text-center">
                <h3 className="text-2xl font-extrabold text-white mb-2">{cta.title}</h3>
                <p className="text-white/90 mb-6 max-w-lg mx-auto">{cta.description}</p>
                <Link href={post.cta_link || cta.link}
                  className="inline-flex items-center gap-2 bg-white text-[#085041] px-7 py-3.5 rounded-xl text-sm font-extrabold hover:bg-gray-100 transition-colors shadow-lg">
                  {cta.button} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Related articles */}
            {related.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-extrabold text-[#085041] mb-6">Artículos relacionados</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {related.map((p) => <RelatedCard key={p.id} p={p} />)}
                </div>
              </div>
            )}

            <div className="mt-10">
              <Link href="/blog" className="inline-flex items-center gap-1 text-[#1D9E75] text-sm font-semibold hover:text-[#085041] transition-colors">
                <ChevronLeft className="h-4 w-4" /> Volver al Blog
              </Link>
            </div>
          </article>

          {/* ── Right · Sidebar ── */}
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">

            {toc.length > 1 && (
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-[#085041] mb-3"><List className="h-4 w-4" /> Tabla de contenidos</p>
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a href={`#${h.id}`} className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors block">{h.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm font-bold text-[#085041] mb-4">Accesos rápidos</p>
              <div className="space-y-2">
                {[
                  { href: "/servicios", icon: Package, label: "Buscar servicios" },
                  { href: "/dashboard/cliente/solicitud/nueva", icon: Building2, label: "Publicar solicitud" },
                  { href: "/register?rol=proveedor", icon: Ship, label: "Ofrecer mis servicios" },
                ].map((tool) => (
                  <Link key={tool.href} href={tool.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#E1F5EE] text-gray-700 hover:text-[#085041] transition-colors group">
                    <span className="p-2 rounded-lg bg-[#E1F5EE] text-[#1D9E75]"><tool.icon className="h-4 w-4" /></span>
                    <span className="text-sm font-semibold flex-1">{tool.label}</span>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#1D9E75] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-[#085041] rounded-2xl p-6 text-center shadow-sm">
              <h4 className="text-base font-extrabold text-white mb-2">Crea tu cuenta gratis</h4>
              <p className="text-xs text-white/75 mb-4">Únete a la red agroexportadora de LATAM.</p>
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 w-full bg-white text-[#085041] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                Crear cuenta gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {recent.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-sm font-bold text-[#085041] mb-4">Artículos recientes</p>
                <div className="space-y-4">
                  {recent.map((p) => (
                    <Link key={p.id} href={`/blog/${p.slug}`} className="flex gap-3 group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#E1F5EE] flex-shrink-0">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Leaf className="h-5 w-5 text-[#1D9E75]" /></div>}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#1E293B] line-clamp-2 group-hover:text-[#085041] transition-colors">{p.title}</h5>
                        <span className="text-[10px] text-gray-400">{fmtDate(p.published_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <BlogFooter />
      </main>
    </>
  );
}
