"use client";

import Link from "next/link";
import { Leaf, Globe, Users, Lightbulb, Target, History, ArrowRight, Sprout } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";

/* ─── Section wrapper ─────────────────────────────────────── */
function Section({
  children,
  light = false,
  green = false,
  className = "",
}: {
  children: React.ReactNode;
  light?: boolean;
  green?: boolean;
  className?: string;
}) {
  const bg = green
    ? "bg-[#FEF3F2]"
    : light
    ? "bg-gray-50"
    : "bg-white";
  return (
    <section className={`py-20 ${bg} ${className}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/* ─── Section heading ─────────────────────────────────────── */
function SectionHeading({
  icon: Icon,
  title,
  iconClass = "text-[#D92D20]",
}: {
  icon: React.ElementType;
  title: string;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-xl bg-[#D92D20]/10 flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
      <h2 className="text-2xl font-extrabold text-[#B42318]">{title}</h2>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function SobreNosotrosPage() {
  const { t } = useTranslation();

  return (
    <>
      <LandingNavbar />

      <main className="pt-16">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-[#7A271A] via-[#D92D20] to-[#F97066] py-24 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Leaf className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-wide">Apurape</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              {t("about.title")}
            </h1>
            <p className="text-xl text-[#FEE4E2] font-medium italic mb-6">
              {t("about.subtitle")}
            </p>
            <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
              {t("about.intro")}
            </p>
          </div>
        </section>

        {/* ── Qué significa Apurape ─────────────────────────── */}
        <Section>
          <SectionHeading icon={Globe} title={t("about.meaning.title")} />
          <p className="text-gray-600 text-lg leading-relaxed">
            {t("about.meaning.body")}
          </p>
        </Section>

        {/* ── Nuestra misión ────────────────────────────────── */}
        <Section light>
          <SectionHeading icon={Target} title={t("about.mission.title")} />
          <p className="text-gray-600 text-lg leading-relaxed">
            {t("about.mission.body")}
          </p>
        </Section>

        {/* ── El problema que resolvemos ────────────────────── */}
        <Section>
          <SectionHeading icon={Lightbulb} title={t("about.problem.title")} />
          <p className="text-gray-600 text-lg leading-relaxed">
            {t("about.problem.body")}
          </p>
        </Section>

        {/* ── Nuestra historia ──────────────────────────────── */}
        {/*
          TEXTO EDITABLE — La sección de historia refleja la motivación fundacional.
          Para actualizar, modifica las claves "about.story.p1" y "about.story.p2"
          en src/locales/es.json y src/locales/en.json.
        */}
        <Section green>
          <SectionHeading icon={History} title={t("about.story.title")} />
          <div className="space-y-5">
            <p className="text-[#B42318]/80 text-lg leading-relaxed">
              {t("about.story.p1")}
            </p>
            <p className="text-[#B42318]/80 text-lg leading-relaxed">
              {t("about.story.p2")}
            </p>
          </div>
        </Section>

        {/* ── Nuestra visión ────────────────────────────────── */}
        <Section light>
          <SectionHeading icon={Users} title={t("about.vision.title")} />
          <p className="text-gray-600 text-lg leading-relaxed">
            {t("about.vision.body")}
          </p>
        </Section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="bg-[#B42318] py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              {t("about.cta.title")}
            </h2>
            <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
              {t("about.cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register?rol=proveedor"
                className="inline-flex items-center gap-2 bg-[#D92D20] text-white px-8 py-4 rounded-xl text-base font-bold hover:bg-[#F97066] transition-colors shadow-lg"
              >
                <Sprout className="h-5 w-5" />
                {t("about.cta.joinProducer")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/servicios"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl text-base font-bold hover:bg-white/20 transition-colors"
              >
                {t("about.cta.explore")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer mini ───────────────────────────────────── */}
        <footer className="bg-gray-900 py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm text-white">Apurape</span>
              <span className="text-gray-500 text-xs italic ml-1">{t("landing.slogan")}</span>
            </div>
            <p className="text-xs text-gray-600">
              {t("landing.footer.allRights", { year: new Date().getFullYear() })}
            </p>
          </div>
        </footer>

      </main>
    </>
  );
}
