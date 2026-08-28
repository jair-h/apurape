"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Wrench,
  Search,
  AlertCircle,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCurrency } from "@/lib/CurrencyContext";

/* ─── Types ───────────────────────────────────────────────── */
type Plan = {
  nameKey: string;
  price: string;
  periodKey: string;
  descKey: string;
  featured: boolean;
  featuresKey: string;
  ctaKey: string;
  href?: string;
  annualUsd?: number;
  trial?: string;
  isFree?: boolean;
};

type Tab = {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  plans: Plan[];
};

/* ─── Datos de planes ─────────────────────────────────────── */
const TABS: Tab[] = [
  {
    id: "proveedores",
    labelKey: "plans.tabs.proveedores",
    icon: Wrench,
    plans: [
      {
        nameKey: "plans.proveedor.basico.name",
        price: "Gratis",
        periodKey: "plans.proveedor.basico.period",
        descKey: "plans.proveedor.basico.description",
        featured: false,
        isFree: true,
        href: "/register?rol=proveedor",
        featuresKey: "plans.proveedor.basico.features",
        ctaKey: "plans.cta.registerFree",
      },
      {
        nameKey: "plans.proveedor.proPersona.name",
        price: "S/ 120",
        periodKey: "plans.proveedor.pro.period",
        descKey: "plans.proveedor.proPersona.description",
        featured: true,
        href: "/register?rol=proveedor&plan=pro&tipo=persona",
        featuresKey: "plans.proveedor.pro.features",
        ctaKey: "plans.cta.startNow",
      },
      {
        nameKey: "plans.proveedor.proNegocio.name",
        price: "S/ 330",
        periodKey: "plans.proveedor.pro.period",
        descKey: "plans.proveedor.proNegocio.description",
        featured: false,
        href: "/register?rol=proveedor&plan=pro&tipo=negocio",
        featuresKey: "plans.proveedor.proNegocio.features",
        ctaKey: "plans.cta.startNow",
      },
    ],
  },
  {
    id: "clientes",
    labelKey: "plans.tabs.clientes",
    icon: Search,
    plans: [
      {
        nameKey: "plans.cliente.free.name",
        price: "Gratis",
        periodKey: "plans.cliente.free.period",
        descKey: "plans.cliente.free.description",
        featured: true,
        isFree: true,
        href: "/register?rol=cliente",
        featuresKey: "plans.cliente.free.features",
        ctaKey: "plans.cta.registerBuyer",
      },
    ],
  },
];

/* ─── Plan card ───────────────────────────────────────────── */
function PlanCard({ plan, icon: Icon, onComingSoon }: { plan: Plan; icon: React.ElementType; onComingSoon: () => void }) {
  const { t, ta } = useTranslation();
  const { formatDaily } = useCurrency();

  const localDailyText = plan.annualUsd ? formatDaily(plan.annualUsd) : null;

  const features = ta(plan.featuresKey);

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 h-full ${
        plan.featured
          ? "bg-[#B42318] text-white shadow-2xl ring-2 ring-[#D92D20]"
          : "bg-white border border-gray-200 shadow-sm"
      }`}
    >
      {plan.featured && !plan.isFree && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#D92D20] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow whitespace-nowrap">
          {t("plans.mostPopular")}
        </span>
      )}

      <div className="mb-5">
        <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl mb-3 ${plan.featured ? "bg-white/15 text-[#FDA29B]" : "bg-[#FEF3F2] text-[#D92D20]"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className={`text-xl font-bold mb-1 ${plan.featured ? "text-white" : "text-[#B42318]"}`}>
          {t(plan.nameKey)}
        </h3>
        <p className={`text-sm leading-relaxed ${plan.featured ? "text-red-100" : "text-gray-500"}`}>
          {t(plan.descKey)}
        </p>
      </div>

      <div className="mb-7">
        <span className={`text-4xl font-extrabold ${plan.featured ? "text-white" : "text-[#B42318]"}`}>
          {plan.price}
        </span>
        <span className={`text-sm ml-1 ${plan.featured ? "text-red-200" : "text-gray-400"}`}>
          {t(plan.periodKey)}
        </span>
        {localDailyText && (
          <p className={`mt-1 text-xs font-semibold ${plan.featured ? "text-white" : "text-[#D92D20]"}`}>
            {t("plans.approxPerDay", { amount: localDailyText })}
            {plan.trial && (
              <span className="ml-1.5 opacity-80">
                · {t("plans.trialDays", { n: plan.trial })}
              </span>
            )}
          </p>
        )}
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                plan.featured ? "text-[#FDA29B]" : "text-[#D92D20]"
              }`}
            />
            <span className={plan.featured ? "text-red-50" : "text-gray-700"}>{f}</span>
          </li>
        ))}
      </ul>

      {plan.href ? (
        <Link
          href={plan.href}
          className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
            plan.featured
              ? "bg-[#D92D20] text-white hover:bg-[#912018]"
              : "bg-[#FEF3F2] text-[#B42318] hover:bg-[#D92D20] hover:text-white"
          }`}
        >
          {t(plan.ctaKey)}
        </Link>
      ) : (
        <button
          onClick={onComingSoon}
          className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
            plan.featured
              ? "bg-[#D92D20] text-white hover:bg-[#912018]"
              : "bg-[#FEF3F2] text-[#B42318] hover:bg-[#D92D20] hover:text-white"
          }`}
        >
          {t(plan.ctaKey)}
        </button>
      )}
    </div>
  );
}

/* ─── Pricing tabs ────────────────────────────────────────── */
export default function Pricing() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [showComingSoon, setShowComingSoon] = useState(false);
  // Fallback a la primera pestaña: si el id guardado no existe, `current`
  // quedaba undefined y el prerender de "/" reventaba al leer .plans.
  const current = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <section id="planes" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#B42318] mb-4">
            {t("plans.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("plans.subtitle")}
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowComingSoon(false); }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-[#D92D20] text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#D92D20] hover:text-[#D92D20]"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Coming-soon banner */}
        {showComingSoon && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 max-w-3xl mx-auto">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">
                {t("plans.comingSoon.title")}
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                {t("plans.comingSoon.description")}
              </p>
            </div>
            <button
              onClick={() => setShowComingSoon(false)}
              className="text-amber-400 hover:text-amber-600 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Plan cards */}
        <div
          className={`grid gap-8 items-stretch mx-auto ${
            current.plans.length === 1
              ? "grid-cols-1 max-w-sm"
              : current.plans.length === 2
              ? "grid-cols-1 md:grid-cols-2 max-w-3xl"
              : "grid-cols-1 md:grid-cols-3 max-w-5xl"
          }`}
        >
          {current.plans.map((plan) => (
            <PlanCard
              key={plan.nameKey}
              plan={plan}
              icon={current.icon}
              onComingSoon={() => setShowComingSoon(true)}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-10">
          {t("plans.allPricesNote")}
        </p>
      </div>
    </section>
  );
}
