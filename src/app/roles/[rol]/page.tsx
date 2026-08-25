"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Sprout, Building2, Truck, Globe, Award,
  CheckCircle2, ArrowRight, ArrowLeft,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";

/* ─── Role visual config ──────────────────────────────────── */
const ROLE_STYLES: Record<string, {
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  heroBg: string;
  featureBg: string;
}> = {
  productor: {
    Icon: Sprout,
    iconColor: "text-[#1D9E75]",
    iconBg: "bg-green-100",
    heroBg: "from-[#0d6b4f] via-[#1D9E75] to-[#2dd4a0]",
    featureBg: "bg-green-100",
  },
  exportador: {
    Icon: Building2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    heroBg: "from-blue-950 via-blue-700 to-blue-500",
    featureBg: "bg-blue-100",
  },
  forwarder: {
    Icon: Truck,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
    heroBg: "from-orange-950 via-orange-700 to-orange-500",
    featureBg: "bg-orange-100",
  },
  comprador: {
    Icon: Globe,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    heroBg: "from-purple-950 via-purple-700 to-purple-500",
    featureBg: "bg-purple-100",
  },
  certificadora: {
    Icon: Award,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-100",
    heroBg: "from-teal-950 via-teal-700 to-teal-500",
    featureBg: "bg-teal-100",
  },
};

const VALID_ROLES = ["productor", "exportador", "forwarder", "comprador", "certificadora"];

/* ─── Page ────────────────────────────────────────────────── */
export default function RolPage() {
  const params = useParams();
  const rol = typeof params.rol === "string" ? params.rol : "";
  const { t, ta } = useTranslation();

  const config = ROLE_STYLES[rol];

  if (!VALID_ROLES.includes(rol) || !config) {
    return (
      <>
        <LandingNavbar />
        <main className="pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-gray-500 mb-6">Página no encontrada.</p>
            <Link href="/" className="text-[#1D9E75] font-semibold hover:underline">
              {t("rolePage.backToHome")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { Icon } = config;
  const roleTitle = t(`landing.soy.cards.${rol}.title`) !== `landing.soy.cards.${rol}.title`
    ? t(`landing.soy.cards.${rol}.title`)
    : t(`landing.roles.${rol}.title`);
  const featureTitles = ta(`rolePage.${rol}.featureTitles`);
  const featureDescs  = ta(`rolePage.${rol}.featureDescs`);
  const benefits      = ta(`rolePage.${rol}.benefits`);
  const whoFor        = ta(`rolePage.${rol}.whoFor`);
  const features = featureTitles.map((title, i) => ({ title, desc: featureDescs[i] ?? "" }));

  return (
    <>
      <LandingNavbar />
      <main className="pt-16">

        {/* ── Hero */}
        <section className={`bg-gradient-to-br ${config.heroBg} py-24`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("rolePage.backToHome")}
            </Link>

            <div className={`inline-flex items-center justify-center ${config.iconBg} bg-opacity-25 p-4 rounded-2xl mb-6`}>
              <Icon className="h-10 w-10 text-white" />
            </div>

            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
              {t("landing.soy.iAm")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              {roleTitle}
            </h1>
            <p className="text-xl text-white/80 font-medium mb-4">
              {t(`rolePage.${rol}.headline`)}
            </p>
            <p className="text-base text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              {t(`rolePage.${rol}.description`)}
            </p>

            <Link
              href={`/register?rol=${rol}`}
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl text-base font-bold hover:bg-gray-100 transition-colors shadow-lg"
            >
              {t("rolePage.registerAs", { role: roleTitle })}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Qué puedes hacer */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-12">
              {t("rolePage.whatYouCanDo")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border-2 border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <div className={`inline-flex p-2 rounded-xl ${config.featureBg} mb-3`}>
                    <CheckCircle2 className={`h-5 w-5 ${config.iconColor}`} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Es para ti si... */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">
              {t("rolePage.whoIsItFor")}
            </h2>
            <ul className="space-y-3">
              {whoFor.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 ${config.featureBg} rounded-full p-0.5 mt-0.5`}>
                    <CheckCircle2 className={`h-5 w-5 ${config.iconColor}`} />
                  </div>
                  <span className="text-gray-700 text-base leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Por qué unirte */}
        <section className="py-20 bg-[#E1F5EE]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#085041] mb-8">
              {t("rolePage.benefits")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-[#1D9E75] flex-shrink-0" />
                  <span className="text-[#085041] font-medium text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final */}
        <section className="bg-[#085041] py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              {t("rolePage.ctaTitle")}
            </h2>
            <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
              {t("rolePage.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/register?rol=${rol}`}
                className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-8 py-4 rounded-xl text-base font-bold hover:bg-[#2dd4a0] transition-colors shadow-lg"
              >
                <Icon className="h-5 w-5" />
                {t("rolePage.registerAs", { role: roleTitle })}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl text-base font-bold hover:bg-white/20 transition-colors"
              >
                {t("rolePage.alreadyHaveAccount")} {t("rolePage.signIn")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Mini footer */}
        <footer className="bg-gray-900 py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm text-white">MARKARU</span>
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
