"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sprout,
  Building2,
  Truck,
  Award,
  Globe,
  AlertCircle,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCurrency } from "@/lib/CurrencyContext";
import { CurrencyHint } from "@/components/CurrencySelector";

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
    id: "productores",
    labelKey: "plans.tabs.productores",
    icon: Sprout,
    plans: [
      {
        nameKey: "plans.productor.free.name",
        price: "USD 0",
        periodKey: "plans.productor.free.period",
        descKey: "plans.productor.free.description",
        featured: false,
        isFree: true,
        href: "/register?plan=free&rol=productor",
        featuresKey: "plans.productor.free.features",
        ctaKey: "plans.cta.registerFree",
      },
      {
        nameKey: "plans.productor.paid.name",
        price: "USD 120",
        periodKey: "plans.productor.paid.period",
        descKey: "plans.productor.paid.description",
        featured: true,
        annualUsd: 120,
        href: "/register?rol=productor&plan=productor",
        featuresKey: "plans.productor.paid.features",
        ctaKey: "plans.cta.startNow",
      },
    ],
  },
  {
    id: "exportadores",
    labelKey: "plans.tabs.exportadores",
    icon: Building2,
    plans: [
      {
        nameKey: "plans.exportador.basic.name",
        price: "USD 360",
        periodKey: "plans.exportador.basic.period",
        descKey: "plans.exportador.basic.description",
        featured: false,
        annualUsd: 360,
        trial: "3",
        href: "/register?rol=exportador&plan=basic",
        featuresKey: "plans.exportador.basic.features",
        ctaKey: "plans.cta.startNow",
      },
      {
        nameKey: "plans.exportador.pro.name",
        price: "USD 960",
        periodKey: "plans.exportador.pro.period",
        descKey: "plans.exportador.pro.description",
        featured: true,
        annualUsd: 960,
        trial: "3",
        href: "/register?rol=exportador&plan=pro",
        featuresKey: "plans.exportador.pro.features",
        ctaKey: "plans.cta.startNow",
      },
    ],
  },
  {
    id: "forwarders",
    labelKey: "plans.tabs.forwarders",
    icon: Truck,
    plans: [
      {
        nameKey: "plans.forwarder.basic.name",
        price: "USD 600",
        periodKey: "plans.forwarder.basic.period",
        descKey: "plans.forwarder.basic.description",
        featured: false,
        annualUsd: 600,
        trial: "3",
        href: "/register?rol=forwarder&plan=basic",
        featuresKey: "plans.forwarder.basic.features",
        ctaKey: "plans.cta.startNow",
      },
      {
        nameKey: "plans.forwarder.pro.name",
        price: "USD 1,200",
        periodKey: "plans.forwarder.pro.period",
        descKey: "plans.forwarder.pro.description",
        featured: true,
        annualUsd: 1200,
        trial: "3",
        href: "/register?rol=forwarder&plan=pro",
        featuresKey: "plans.forwarder.pro.features",
        ctaKey: "plans.cta.startNow",
      },
    ],
  },
  {
    id: "certificadoras",
    labelKey: "plans.tabs.certificadoras",
    icon: Award,
    plans: [
      {
        nameKey: "plans.certificadora.basic.name",
        price: "USD 720",
        periodKey: "plans.certificadora.basic.period",
        descKey: "plans.certificadora.basic.description",
        featured: false,
        annualUsd: 720,
        trial: "3",
        href: "/register?rol=certificadora&plan=basic",
        featuresKey: "plans.certificadora.basic.features",
        ctaKey: "plans.cta.startNow",
      },
      {
        nameKey: "plans.certificadora.premium.name",
        price: "USD 1,200",
        periodKey: "plans.certificadora.premium.period",
        descKey: "plans.certificadora.premium.description",
        featured: true,
        annualUsd: 1200,
        trial: "3",
        href: "/register?rol=certificadora&plan=premium",
        featuresKey: "plans.certificadora.premium.features",
        ctaKey: "plans.cta.startNow",
      },
    ],
  },
  {
    id: "compradores",
    labelKey: "plans.tabs.compradores",
    icon: Globe,
    plans: [
      {
        nameKey: "plans.comprador.free.name",
        price: "Gratis",
        periodKey: "plans.comprador.free.period",
        descKey: "plans.comprador.free.description",
        featured: true,
        isFree: true,
        href: "/register?rol=comprador",
        featuresKey: "plans.comprador.free.features",
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
          ? "bg-[#085041] text-white shadow-2xl ring-2 ring-[#1D9E75]"
          : "bg-white border border-gray-200 shadow-sm"
      }`}
    >
      {plan.featured && !plan.isFree && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#1D9E75] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow whitespace-nowrap">
          {t("plans.mostPopular")}
        </span>
      )}

      <div className="mb-5">
        <div className={`inline-flex items-center justify-center h-11 w-11 rounded-xl mb-3 ${plan.featured ? "bg-white/15 text-[#4CD9A4]" : "bg-[#E1F5EE] text-[#1D9E75]"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className={`text-xl font-bold mb-1 ${plan.featured ? "text-white" : "text-[#085041]"}`}>
          {t(plan.nameKey)}
        </h3>
        <p className={`text-sm leading-relaxed ${plan.featured ? "text-green-200" : "text-gray-500"}`}>
          {t(plan.descKey)}
        </p>
      </div>

      <div className="mb-7">
        <span className={`text-4xl font-extrabold ${plan.featured ? "text-white" : "text-[#085041]"}`}>
          {plan.price}
        </span>
        <span className={`text-sm ml-1 ${plan.featured ? "text-green-300" : "text-gray-400"}`}>
          {t(plan.periodKey)}
        </span>
        {localDailyText && (
          <p className={`mt-1 text-xs font-semibold ${plan.featured ? "text-white" : "text-[#1D9E75]"}`}>
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
                plan.featured ? "text-[#4CD9A4]" : "text-[#1D9E75]"
              }`}
            />
            <span className={plan.featured ? "text-green-50" : "text-gray-700"}>{f}</span>
          </li>
        ))}
      </ul>

      {plan.href ? (
        <Link
          href={plan.href}
          className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
            plan.featured
              ? "bg-[#1D9E75] text-white hover:bg-[#167a5a]"
              : "bg-[#E1F5EE] text-[#085041] hover:bg-[#1D9E75] hover:text-white"
          }`}
        >
          {t(plan.ctaKey)}
        </Link>
      ) : (
        <button
          onClick={onComingSoon}
          className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
            plan.featured
              ? "bg-[#1D9E75] text-white hover:bg-[#167a5a]"
              : "bg-[#E1F5EE] text-[#085041] hover:bg-[#1D9E75] hover:text-white"
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
  const [activeTab, setActiveTab] = useState("productores");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const current = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <section id="planes" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#085041] mb-4">
            {t("plans.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("plans.subtitle")}
          </p>
          <CurrencyHint className="mt-4" />
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
                    ? "bg-[#1D9E75] text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
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
          className={`grid gap-8 items-stretch max-w-3xl mx-auto ${
            current.plans.length === 1
              ? "grid-cols-1 max-w-sm"
              : "grid-cols-1 md:grid-cols-2"
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
