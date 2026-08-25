"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen, Calendar, Tag, Loader2, Search, ArrowRight,
  Mail, Check, User, AlertCircle,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";

export interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string;
}

/* ─── Category taxonomy (shared with admin) ───────────────── */
const BLOG_CATEGORIES = [
  { slug: "productos",       label: "Productos",       img: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400" },
  { slug: "logistica",       label: "Logística",       img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400" },
  { slug: "mercados",        label: "Mercados",        img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400" },
  { slug: "exportacion",     label: "Exportación",     img: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400" },
  { slug: "certificaciones", label: "Certificaciones", img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400" },
  { slug: "financiamiento",  label: "Financiamiento",  img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400" },
  { slug: "normativa",       label: "Normativa",       img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400" },
  { slug: "tecnologia",      label: "Tecnología & IA", img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400" },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  BLOG_CATEGORIES.map((c) => [c.slug, c.label]),
);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });

/* ─── Article card (standard) ─────────────────────────────── */
function ArticleCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col">
      <div className="relative aspect-video overflow-hidden bg-[#E1F5EE]">
        {post.image_url ? (
          <img src={post.image_url} alt={post.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E1F5EE] to-[#1D9E75]/20">
            <BookOpen className="h-10 w-10 text-[#1D9E75]" />
          </div>
        )}
        {post.category && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/95 text-[#085041] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            <Tag className="h-3 w-3" /> {CAT_LABEL[post.category] ?? post.category}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-extrabold text-[#1E293B] mb-2 line-clamp-2 group-hover:text-[#085041] transition-colors">
          {post.title}
        </h3>
        {post.summary && (
          <p className="text-sm text-[#6B7280] line-clamp-2 leading-relaxed mb-4">{post.summary}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <User className="h-3.5 w-3.5" /> MARKARU
            <span className="text-gray-300">·</span>
            <Calendar className="h-3.5 w-3.5" /> {fmtDate(post.published_at)}
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1D9E75] group-hover:gap-2 transition-all">
          Leer artículo <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/* ─── Featured large card ─────────────────────────────────── */
function FeaturedCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`}
      className="group lg:col-span-2 lg:row-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col">
      <div className="relative aspect-video lg:aspect-[16/10] overflow-hidden bg-[#E1F5EE]">
        {post.image_url ? (
          <img src={post.image_url} alt={post.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E1F5EE] to-[#1D9E75]/20">
            <BookOpen className="h-14 w-14 text-[#1D9E75]" />
          </div>
        )}
        {post.category && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 bg-white/95 text-[#085041] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            <Tag className="h-3 w-3" /> {CAT_LABEL[post.category] ?? post.category}
          </span>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E293B] mb-3 line-clamp-2 group-hover:text-[#085041] transition-colors">
          {post.title}
        </h3>
        {post.summary && (
          <p className="text-sm sm:text-base text-[#6B7280] line-clamp-3 leading-relaxed mb-4">{post.summary}</p>
        )}
        <div className="mt-auto flex items-center gap-2 text-xs text-[#6B7280]">
          <User className="h-3.5 w-3.5" /> MARKARU
          <span className="text-gray-300">·</span>
          <Calendar className="h-3.5 w-3.5" /> {fmtDate(post.published_at)}
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#1D9E75] group-hover:gap-2 transition-all">
          Leer más <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

/* ─── Newsletter form ─────────────────────────────────────── */
function Newsletter() {
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    const supabase = createClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });
    if (error && error.code !== "23505") { setState("error"); return; }
    setState("done");
    setEmail("");
  };

  return (
    <section className="py-20 bg-[#085041]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center bg-white/10 p-4 rounded-2xl mb-6">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">No te pierdas ningún artículo</h2>
        <p className="text-white/80 mb-8">
          Recibe las últimas guías y novedades sobre agroexportación directamente en tu correo.
        </p>
        {state === "done" ? (
          <div className="inline-flex items-center gap-2 bg-white/15 text-white px-5 py-3 rounded-xl text-sm font-semibold">
            <Check className="h-4 w-4" /> ¡Gracias! Te avisaremos de cada nuevo artículo.
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button type="submit" disabled={state === "loading"}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#085041] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 disabled:opacity-60 transition-colors whitespace-nowrap">
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suscribirme"}
            </button>
          </form>
        )}
        {state === "error" && (
          <p className="mt-3 text-sm text-red-200 flex items-center justify-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> No se pudo completar. Intenta de nuevo.
          </p>
        )}
      </div>
    </section>
  );
}

/* ─── Client blog index (receives posts from the server) ──── */
export default function BlogClient({ posts }: { posts: Post[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [cat, setCat]     = useState("todos");

  const isFiltering = cat !== "todos" || query.trim() !== "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchCat = cat === "todos" || p.category === cat;
      const matchQuery = !q || p.title.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [posts, cat, query]);

  const featured = posts.slice(0, 3);
  const TABS = [{ slug: "todos", label: "Todos" }, ...BLOG_CATEGORIES];

  return (
    <>
      <LandingNavbar />
      <main className="pt-16 min-h-screen bg-gray-50">

        {/* ── SECTION 1 · Header ── */}
        <section className="bg-[#085041] py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 bg-[#E1F5EE] text-[#085041] text-xs font-bold px-4 py-1.5 rounded-full mb-6">
              <BookOpen className="h-3.5 w-3.5" /> Centro de Conocimiento Agroexportador
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              Centro de Conocimiento Agroexportador
            </h1>
            <p className="text-base sm:text-lg text-white/80 mb-8">
              Aprende sobre agroexportación, logística, mercados internacionales, certificaciones y oportunidades de negocio en un solo lugar.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar artículos por título..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50"
                />
              </div>
              <button type="submit"
                className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#12b886] transition-colors">
                <Search className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </form>
          </div>
        </section>

        {/* ── SECTION 2 · Category tabs ── */}
        <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
              {TABS.map((tb) => (
                <button key={tb.slug} type="button" onClick={() => setCat(tb.slug)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                    cat === tb.slug
                      ? "bg-[#085041] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-[#E1F5EE] hover:text-[#085041]"
                  }`}>
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            /* Empty state — no published articles */
            <div className="max-w-md mx-auto text-center py-24">
              <div className="inline-flex items-center justify-center bg-[#E1F5EE] p-5 rounded-2xl mb-5">
                <BookOpen className="h-10 w-10 text-[#1D9E75]" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#085041] mb-3">Próximamente</h2>
              <p className="text-gray-500 mb-7 leading-relaxed">
                Estamos preparando contenido sobre agroexportación, mercados internacionales y guías para exportadores de LATAM.
              </p>
              <Link href="/catalogo"
                className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors shadow-sm">
                Ver catálogo
              </Link>
            </div>
          ) : isFiltering ? (
            /* Filtered results (tab or search active) */
            <section className="py-14">
              <h2 className="text-xl font-extrabold text-[#085041] mb-1">
                {query.trim() ? `Resultados para "${query.trim()}"` : CAT_LABEL[cat] ?? "Artículos"}
              </h2>
              <p className="text-sm text-gray-500 mb-8">{filtered.length} artículo{filtered.length !== 1 && "s"}</p>
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No encontramos artículos con esos criterios.</p>
                  <button type="button" onClick={() => { setQuery(""); setCat("todos"); }}
                    className="mt-4 text-sm font-bold text-[#1D9E75] hover:text-[#085041]">Ver todos los artículos</button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((p) => <ArticleCard key={p.id} post={p} />)}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* ── SECTION 3 · Featured ── */}
              <section className="py-14">
                <div className="flex items-end justify-between mb-8">
                  <h2 className="text-2xl font-extrabold text-[#085041]">Artículos destacados</h2>
                  <a href="#todos-articulos" className="text-sm font-bold text-[#1D9E75] hover:text-[#085041] flex items-center gap-1">
                    Ver todos los artículos <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="grid lg:grid-cols-3 lg:grid-rows-2 gap-6">
                  {featured[0] && <FeaturedCard post={featured[0]} />}
                  {featured[1] && <ArticleCard post={featured[1]} />}
                  {featured[2] && <ArticleCard post={featured[2]} />}
                </div>
              </section>

              {/* ── SECTION 4 · Explore by category ── */}
              <section id="categorias" className="py-14 border-t border-gray-200">
                <div className="flex items-end justify-between mb-8">
                  <h2 className="text-2xl font-extrabold text-[#085041]">Explora por categoría</h2>
                  <button type="button" onClick={() => setCat("todos")}
                    className="text-sm font-bold text-[#1D9E75] hover:text-[#085041] flex items-center gap-1">
                    Ver todas las categorías <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {BLOG_CATEGORIES.map((c) => (
                    <button key={c.slug} type="button" onClick={() => setCat(c.slug)}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
                      <img src={c.img} alt={c.label} loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-[#085041]/70 group-hover:bg-[#085041]/60 transition-colors" />
                      <span className="absolute inset-0 flex items-center justify-center text-white font-extrabold text-sm sm:text-base text-center px-2">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── SECTION 5 · All articles ── */}
              <section id="todos-articulos" className="py-14 border-t border-gray-200">
                <h2 className="text-2xl font-extrabold text-[#085041] mb-8">Todos los artículos</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((p) => <ArticleCard key={p.id} post={p} />)}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ── SECTION 6 · Newsletter ── */}
        <Newsletter />

        {/* ── SECTION 7 · Final CTA ── */}
        <section className="py-20 bg-gradient-to-br from-[#0d6b4f] via-[#1D9E75] to-[#2dd4a0] text-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              ¿Listo para llevar tu negocio al siguiente nivel?
            </h2>
            <p className="text-white/90 mb-8">
              Únete a la red de productores, exportadores y empresas agroexportadoras de LATAM.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-white text-[#085041] px-8 py-4 rounded-xl text-base font-extrabold hover:bg-gray-100 transition-colors shadow-xl">
              Crear cuenta gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm text-white">MARKARU</span>
              <span className="text-gray-500 text-xs italic ml-1">{t("landing.slogan")}</span>
            </div>
            <p className="text-xs text-gray-600">{t("landing.footer.allRights", { year: new Date().getFullYear() })}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
