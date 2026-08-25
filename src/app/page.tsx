"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Package, Truck, Globe, ArrowRight, Sprout, Ship,
  FileCheck, TrendingUp, Users, Building2, Star,
  ChevronRight, ChevronLeft as ChevronLeftIcon, Check,
} from "lucide-react";
import Pricing from "@/components/landing/pricing";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";

/* ─── Config types ─────────────────────────────────────────── */
interface HeroContent {
  title1?: string; title2?: string; subtitle?: string;
  ctaProducer?: string; ctaExporter?: string; bg_image_url?: string;
}

interface SectionConfig {
  title?: string; subtitle?: string; body?: string;
  image_url?: string; cta_text?: string; cta_link?: string; active?: boolean;
}

interface LandingSections {
  products?: SectionConfig;
  producerStory?: SectionConfig;
  export?: SectionConfig;
}

interface Banner {
  id: string; title: string; subtitle: string | null; image_url: string;
  link_url: string | null; button_text: string | null; order_num: number;
}

/* ─── Static Hero fallback ────────────────────────────────── */
function StaticHero({ content }: { content?: HeroContent }) {
  const { t } = useTranslation();
  const title1      = content?.title1      || t("landing.hero.title1");
  const title2      = content?.title2      || t("landing.hero.title2");
  const subtitle    = content?.subtitle    || t("landing.hero.subtitle");
  const ctaProducer = content?.ctaProducer || t("landing.hero.ctaProducer");
  const ctaExporter = content?.ctaExporter || t("landing.hero.ctaExporter");
  const bgImg       = content?.bg_image_url;

  return (
    <section
      className={`relative pt-16 min-h-screen flex items-center ${
        !bgImg ? "bg-gradient-to-br from-[#0d6b4f] via-[#1D9E75] to-[#2dd4a0]" : "bg-[#085041]"
      }`}
    >
      {bgImg && (
        <>
          <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#085041]/75" />
        </>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center w-full">
        <span className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Star className="h-4 w-4" />
          {t("landing.hero.badge")}
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
          {title1}<br />
          <span className="text-[#b8f5e1]">{title2}</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/85 max-w-2xl mx-auto mb-10">{subtitle}</p>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#085041] px-10 py-4 rounded-xl text-lg font-extrabold hover:bg-gray-50 transition-colors shadow-xl">
            {t("landing.hero.ctaPrimary")}<ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-sm text-white/75">{t("landing.hero.ctaHelper")}</p>

          {/* Secondary role shortcuts */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
            <Link href="/roles/productor"
              className="inline-flex items-center gap-2 bg-transparent border border-white/60 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors">
              <Sprout className="h-4 w-4" />{ctaProducer}
            </Link>
            <Link href="/roles/exportador"
              className="inline-flex items-center gap-2 bg-transparent border border-white/60 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors">
              <Globe className="h-4 w-4" />{ctaExporter}
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: "100%",      labelKey: "landing.stats.digital" },
            { value: "0%",        labelKey: "landing.stats.commission" },
            { value: "15+",       labelKey: "landing.stats.countries" },
            { value: "Multi-rol", labelKey: null },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</p>
              {stat.labelKey && <p className="text-sm text-white/70 mt-1">{t(stat.labelKey)}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Hero / Banner carousel ──────────────────────────────── */
function HeroSection({ heroContent }: { heroContent?: HeroContent }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [idx,     setIdx]     = useState(0);
  const [paused,  setPaused]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("banners")
      .select("id,title,subtitle,image_url,link_url,button_text,order_num")
      .eq("active", true)
      .order("order_num")
      .then(({ data }) => { setBanners(data ?? []); setLoaded(true); });
  }, []);

  /* auto-rotate every 5 s — paused on hover */
  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [paused, banners.length]);

  /* keep index in range if banners list shrinks */
  useEffect(() => {
    if (banners.length > 0 && idx >= banners.length) setIdx(0);
  }, [banners.length, idx]);

  /* fallback while loading or when no banners */
  if (!loaded || banners.length === 0) return <StaticHero content={heroContent} />;

  const safeIdx = idx % banners.length;
  const current = banners[safeIdx];
  const prev = () => setIdx((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIdx((i) => (i + 1) % banners.length);

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative pt-16 min-h-[85vh] flex items-center bg-[#085041] overflow-hidden">
      {/* Stacked images — fade between them */}
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === safeIdx ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={b.image_url}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
          {current.title}
        </h1>
        {current.subtitle && (
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 drop-shadow">
            {current.subtitle}
          </p>
        )}
        {current.link_url && current.button_text && (
          <Link
            href={current.link_url}
            className="inline-flex items-center gap-2 bg-white text-[#085041] px-8 py-4 rounded-xl text-base font-bold hover:bg-gray-100 transition-colors shadow-xl"
          >
            {current.button_text} <ArrowRight className="h-5 w-5" />
          </Link>
        )}
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            type="button" onClick={prev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-all"
            aria-label="Anterior"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button" onClick={next}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i} type="button" onClick={() => setIdx(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === safeIdx ? "w-8 bg-white" : "w-2.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Sección A — Productos del agro ─────────────────────── */
const AGRO_PRODUCTS = [
  { key: "avocado", img: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600", badge: "demand" },
  { key: "coffee",  img: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600", badge: "demand" },
  { key: "cacao",   img: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600", badge: "export" },
  { key: "maca",    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",   badge: "export" },
];

function ProductsSection({ config }: { config?: SectionConfig }) {
  const { t } = useTranslation();
  if (config?.active === false) return null;
  const title   = config?.title    || t("landing.products.title");
  const subtitle = config?.subtitle || t("landing.products.subtitle");
  const ctaText = config?.cta_text || t("landing.products.cta");
  const ctaLink = config?.cta_link || "/catalogo";
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {AGRO_PRODUCTS.map((p) => (
            <div key={p.key} className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white">
              <div className="relative aspect-square overflow-hidden bg-[#E1F5EE]">
                <img src={p.img} alt={t(`landing.products.items.${p.key}`)} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E1F5EE] text-[#085041]">
                  {p.badge === "demand" ? t("landing.products.badgeDemand") : t("landing.products.badgeExport")}
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-extrabold text-[#085041]">{t(`landing.products.items.${p.key}`)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={ctaLink}
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors shadow-sm">
            {ctaText} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Soy... ──────────────────────────────────────────────── */
const SOY_ROLES = [
  { id: "productor",  icon: Sprout,    href: "/roles/productor",  cardClass: "hover:border-[#1D9E75]", iconClass: "text-[#1D9E75] bg-green-100" },
  { id: "exportador", icon: Building2, href: "/roles/exportador", cardClass: "hover:border-blue-500",   iconClass: "text-blue-600 bg-blue-100" },
  { id: "forwarder",  icon: Truck,     href: "/roles/forwarder",  cardClass: "hover:border-orange-500", iconClass: "text-orange-600 bg-orange-100" },
  { id: "comprador",  icon: Globe,     href: "/roles/comprador",  cardClass: "hover:border-purple-500", iconClass: "text-purple-600 bg-purple-100" },
];

function SoySection() {
  const { t } = useTranslation();
  return (
    <section id="soy" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{t("landing.soy.title")}</h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">{t("landing.soy.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SOY_ROLES.map((role) => (
            <Link key={role.id} href={role.href}
              className={`group flex flex-col items-start p-6 bg-white rounded-2xl border-2 border-gray-200 ${role.cardClass} transition-all duration-200 hover:shadow-lg hover:-translate-y-1`}>
              <div className={`p-3 rounded-xl ${role.iconClass} mb-4`}><role.icon className="h-6 w-6" /></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("landing.soy.iAm")} {t(`landing.soy.cards.${role.id}.title`)}</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">{t(`landing.soy.cards.${role.id}.description`)}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#1D9E75] group-hover:gap-2 transition-all">
                {t("landing.soy.start")} <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Sección B — Del productor al mundo ─────────────────── */
const DEFAULT_PRODUCER_IMG = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800";

function ProducerStory({ config }: { config?: SectionConfig }) {
  const { t } = useTranslation();
  if (config?.active === false) return null;
  const title   = config?.title    || t("landing.producerStory.title");
  const body    = config?.body     || t("landing.producerStory.body");
  const ctaText = config?.cta_text || t("landing.producerStory.cta");
  const ctaLink = config?.cta_link || "/roles/productor";
  const imgSrc  = config?.image_url || DEFAULT_PRODUCER_IMG;
  const points  = [t("landing.producerStory.point1"), t("landing.producerStory.point2"), t("landing.producerStory.point3")];
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-3xl overflow-hidden shadow-xl bg-[#1D9E75]">
            <div className="aspect-[4/3]">
              <img src={imgSrc} alt={title} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
          <div className="space-y-6">
            <span className="inline-block bg-[#E1F5EE] text-[#085041] text-xs font-bold px-3.5 py-1.5 rounded-full">{t("landing.producerStory.badge")}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">{title}</h2>
            <p className="text-base text-gray-600 leading-relaxed">{body}</p>
            <ul className="space-y-3">
              {points.map((pt) => (
                <li key={pt} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-[#1D9E75] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{pt}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaLink} className="inline-flex items-center gap-2 bg-[#085041] text-white px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Cómo funciona ───────────────────────────────────────── */
const STEP_ICONS = [Users, FileCheck, Package, Ship];
const STEP_IDS = ["01", "02", "03", "04"] as const;

function ComoFunciona() {
  const { t } = useTranslation();
  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{t("landing.howItWorks.title")}</h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">{t("landing.howItWorks.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEP_IDS.map((id, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={id} className="relative flex flex-col items-start">
                {i < STEP_IDS.length - 1 && <div className="hidden lg:block absolute top-7 left-[calc(100%-8px)] w-full h-0.5 bg-gray-200 z-0" />}
                <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D9E75] text-white mb-5 shadow-md"><Icon className="h-6 w-6" /></div>
                <span className="text-xs font-bold text-[#1D9E75] uppercase tracking-wider mb-1">{t("landing.howItWorks.stepLabel")} {id}</span>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`landing.howItWorks.steps.${id}.title`)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t(`landing.howItWorks.steps.${id}.description`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Sección C — Exportación completa ───────────────────── */
const DEFAULT_EXPORT_IMG = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800";

function ExportSection({ config }: { config?: SectionConfig }) {
  const { t } = useTranslation();
  if (config?.active === false) return null;
  const title   = config?.title    || t("landing.export.title");
  const body    = config?.body     || t("landing.export.body");
  const ctaText = config?.cta_text || t("landing.export.cta");
  const ctaLink = config?.cta_link || "/#como-funciona";
  const imgSrc  = config?.image_url || DEFAULT_EXPORT_IMG;
  const points  = [t("landing.export.point1"), t("landing.export.point2"), t("landing.export.point3"), t("landing.export.point4")];
  return (
    <section className="py-24 bg-[#085041]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <span className="inline-block bg-white/15 text-white text-xs font-bold px-3.5 py-1.5 rounded-full">{t("landing.export.badge")}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">{title}</h2>
            <p className="text-base text-white/80 leading-relaxed">{body}</p>
            <ul className="space-y-3">
              {points.map((pt) => (
                <li key={pt} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-white/90">{pt}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaLink} className="inline-flex items-center gap-2 bg-white text-[#085041] px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors shadow-sm">
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl order-1 lg:order-2 bg-[#1D9E75]">
            <div className="aspect-[4/3]">
              <img src={imgSrc} alt={title} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
              <span className="font-bold text-white text-sm">MARKARU</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{t("landing.footer.tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.platform")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/catalogo"      className="hover:text-[#1D9E75] transition-colors">{t("nav.catalog")}</Link></li>
              <li><Link href="/directorio"    className="hover:text-[#1D9E75] transition-colors">{t("nav.directory")}</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-[#1D9E75] transition-colors">{t("nav.howItWorks")}</Link></li>
              <li><Link href="/#planes"       className="hover:text-[#1D9E75] transition-colors">{t("nav.plans")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.company")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sobre-nosotros" className="hover:text-[#1D9E75] transition-colors">{t("landing.footer.aboutUs")}</Link></li>
              <li><Link href="/blog"           className="hover:text-[#1D9E75] transition-colors">Blog</Link></li>
              <li><Link href="/contacto"       className="hover:text-[#1D9E75] transition-colors">{t("landing.footer.contact")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("landing.footer.legal")}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terminos"   className="hover:text-[#1D9E75] transition-colors">{t("landing.footer.terms")}</Link></li>
              <li><Link href="/privacidad" className="hover:text-[#1D9E75] transition-colors">{t("landing.footer.privacy")}</Link></li>
              <li><Link href="/cookies"    className="hover:text-[#1D9E75] transition-colors">{t("landing.footer.cookiesPolicy")}</Link></li>
              <li>
                <Link href="/reclamos" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#1D9E75] transition-colors">
                  <span aria-hidden>📋</span> {t("reclamos.footerLink")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">{t("landing.footer.allRights", { year })}</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <TrendingUp className="h-3 w-3 text-[#1D9E75]" />{t("landing.footer.madeIn")}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page export ─────────────────────────────────────────── */
export default function HomePage() {
  const [heroContent,     setHeroContent]     = useState<HeroContent | undefined>();
  const [landingSections, setLandingSections] = useState<LandingSections | undefined>();

  const loadConfig = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("config").select("key,value")
      .in("key", ["hero_content", "landing_sections"]);
    const map: Record<string, unknown> = {};
    (data ?? []).forEach((r) => { map[r.key] = r.value; });
    if (map.hero_content)     setHeroContent(map.hero_content as HeroContent);
    if (map.landing_sections) setLandingSections(map.landing_sections as LandingSections);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  return (
    <>
      <LandingNavbar />
      <main>
        <HeroSection heroContent={heroContent} />
        <ProductsSection   config={landingSections?.products} />
        <SoySection />
        <ProducerStory     config={landingSections?.producerStory} />
        <ComoFunciona />
        <ExportSection     config={landingSections?.export} />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
