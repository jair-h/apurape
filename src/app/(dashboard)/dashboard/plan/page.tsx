"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, Loader2, Zap,
  AlertCircle, Clock, Lock, Receipt,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";
import { useCurrency } from "@/lib/CurrencyContext";
import { currencyByCountryName } from "@/lib/currencies";
import { CurrencyHint } from "@/components/CurrencySelector";

/* ─── Types ───────────────────────────────────────────────── */

type DashPlan = {
  id: string;
  nameKey: string;
  price: string;
  periodKey: string;
  descKey: string;
  featuresKey: string;
  annualUsd?: number;
  trialDays?: number;
  isFree?: boolean;
  recommended?: boolean;
};

/* ─── Plan data por rol (usa claves de traducción) ─────────── */
const ROLE_PLANS: Record<string, DashPlan[]> = {
  productor: [
    {
      id: "productor-free",
      nameKey: "plans.productor.free.name",
      price: "USD 0",
      periodKey: "plans.productor.free.period",
      descKey: "plans.productor.free.description",
      isFree: true,
      featuresKey: "plans.productor.free.features",
    },
    {
      id: "productor-paid",
      nameKey: "plans.productor.paid.name",
      price: "USD 120",
      periodKey: "plans.productor.paid.period",
      descKey: "plans.productor.paid.description",
      recommended: true,
      annualUsd: 120,
      featuresKey: "plans.productor.paid.features",
    },
  ],
  exportador: [
    {
      id: "exportador-basic",
      nameKey: "plans.exportador.basic.name",
      price: "USD 360",
      periodKey: "plans.exportador.basic.period",
      descKey: "plans.exportador.basic.description",
      annualUsd: 360,
      trialDays: 3,
      featuresKey: "plans.exportador.basic.features",
    },
    {
      id: "exportador-pro",
      nameKey: "plans.exportador.pro.name",
      price: "USD 960",
      periodKey: "plans.exportador.pro.period",
      descKey: "plans.exportador.pro.description",
      recommended: true,
      annualUsd: 960,
      trialDays: 3,
      featuresKey: "plans.exportador.pro.features",
    },
  ],
  forwarder: [
    {
      id: "forwarder-basic",
      nameKey: "plans.forwarder.basic.name",
      price: "USD 600",
      periodKey: "plans.forwarder.basic.period",
      descKey: "plans.forwarder.basic.description",
      annualUsd: 600,
      trialDays: 3,
      featuresKey: "plans.forwarder.basic.features",
    },
    {
      id: "forwarder-pro",
      nameKey: "plans.forwarder.pro.name",
      price: "USD 1,200",
      periodKey: "plans.forwarder.pro.period",
      descKey: "plans.forwarder.pro.description",
      recommended: true,
      annualUsd: 1200,
      trialDays: 3,
      featuresKey: "plans.forwarder.pro.features",
    },
  ],
  certificadora: [
    {
      id: "certif-basic",
      nameKey: "plans.certificadora.basic.name",
      price: "USD 720",
      periodKey: "plans.certificadora.basic.period",
      descKey: "plans.certificadora.basic.description",
      annualUsd: 720,
      trialDays: 3,
      featuresKey: "plans.certificadora.basic.features",
    },
    {
      id: "certif-premium",
      nameKey: "plans.certificadora.premium.name",
      price: "USD 1,200",
      periodKey: "plans.certificadora.premium.period",
      descKey: "plans.certificadora.premium.description",
      recommended: true,
      annualUsd: 1200,
      trialDays: 3,
      featuresKey: "plans.certificadora.premium.features",
    },
  ],
  comprador: [
    {
      id: "comprador-free",
      nameKey: "plans.comprador.free.name",
      price: "Gratis",
      periodKey: "plans.comprador.free.period",
      descKey: "plans.comprador.free.description",
      isFree: true,
      featuresKey: "plans.comprador.free.features",
    },
  ],
};

/* ─── Trial banner ────────────────────────────────────────── */
function TrialBanner({
  trialEndsAt,
  planStatus,
}: {
  trialEndsAt: string | null;
  planStatus: string;
}) {
  const { t } = useTranslation();
  const now      = new Date();
  const endsAt   = trialEndsAt ? new Date(trialEndsAt) : null;
  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000))
    : 0;
  const isExpired =
    planStatus === "expired" ||
    (endsAt && endsAt < now && planStatus === "trial");

  if (planStatus === "active" || planStatus === "free") return null;

  if (isExpired) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-900">{t("myPlan.trialEnded")}</p>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">{t("myPlan.trialEndedDesc")}</p>
        </div>
      </div>
    );
  }

  const remainingText = daysLeft === 0
    ? t("myPlan.trialLastDay")
    : t("myPlan.trialDaysLeft", { n: daysLeft, s: daysLeft !== 1 ? "s" : "" });

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 border ${
        daysLeft <= 3
          ? "bg-red-50 border-red-200"
          : daysLeft <= 7
          ? "bg-amber-50 border-amber-200"
          : "bg-[#E1F5EE] border-[#1D9E75]/30"
      }`}
    >
      <Clock
        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
          daysLeft <= 3 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-[#1D9E75]"
        }`}
      />
      <div>
        <p
          className={`text-sm font-bold ${
            daysLeft <= 3 ? "text-red-900" : daysLeft <= 7 ? "text-amber-900" : "text-[#085041]"
          }`}
        >
          {t("myPlan.trialActive", { remaining: remainingText })}
        </p>
        <p
          className={`text-xs mt-1 leading-relaxed ${
            daysLeft <= 3 ? "text-red-700" : daysLeft <= 7 ? "text-amber-700" : "text-[#085041]/70"
          }`}
        >
          {daysLeft <= 3
            ? t("myPlan.trialActivateUrgent")
            : t("myPlan.trialEndsOn", {
                date: endsAt?.toLocaleDateString("es-PE", { day: "numeric", month: "long" }) ?? "",
              })}
        </p>
      </div>
    </div>
  );
}

/* ─── Checkout link per paid plan (→ /activar-plan) ────────── */
const ACTIVATE_HREF: Record<string, string> = {
  "productor-paid":  "/activar-plan?rol=productor&plan=productor",
  "exportador-basic": "/activar-plan?rol=exportador&plan=basic",
  "exportador-pro":   "/activar-plan?rol=exportador&plan=pro",
  "forwarder-basic":  "/activar-plan?rol=forwarder&plan=basic",
  "forwarder-pro":    "/activar-plan?rol=forwarder&plan=pro",
  "certif-basic":     "/activar-plan?rol=certificadora&plan=basic",
  "certif-premium":   "/activar-plan?rol=certificadora&plan=premium",
};

/* ─── Plan card ───────────────────────────────────────────── */
function PlanCard({
  plan,
  planStatus,
}: {
  plan: DashPlan;
  planStatus: string;
}) {
  const { t, ta } = useTranslation();
  const { formatDaily } = useCurrency();
  const isActive     = planStatus === "active";
  const isComprador  = plan.id === "comprador-free";
  const isProducFree = plan.id === "productor-free";
  const localDailyText = plan.annualUsd ? formatDaily(plan.annualUsd) : null;
  const dark = plan.recommended;
  const features = ta(plan.featuresKey);

  return (
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden border-2 h-full ${
        dark ? "bg-[#085041] border-[#1D9E75]" : "bg-white border-gray-200"
      } shadow-md`}
    >
      {plan.recommended && (
        <span className="absolute top-0 right-4 bg-[#1D9E75] text-white text-[10px] font-bold px-3 py-1 rounded-b-lg shadow">
          {t("myPlan.mostPopular")}
        </span>
      )}

      {/* Header */}
      <div className={`px-6 pt-7 pb-5 ${dark ? "bg-[#0a3d2e]" : "bg-gray-50"}`}>
        <h3 className={`text-lg font-extrabold mb-0.5 ${dark ? "text-white" : "text-[#085041]"}`}>
          {t(plan.nameKey)}
        </h3>
        <p className={`text-xs leading-relaxed ${dark ? "text-green-300" : "text-gray-500"}`}>
          {t(plan.descKey)}
        </p>

        <div className="mt-4">
          <span className={`text-3xl font-extrabold ${dark ? "text-white" : "text-[#085041]"}`}>
            {plan.price}
          </span>
          <span className={`text-sm ml-1 ${dark ? "text-green-300" : "text-gray-400"}`}>
            {t(plan.periodKey)}
          </span>
          {localDailyText && (
            <p className={`mt-1 text-xs font-semibold ${dark ? "text-white" : "text-[#1D9E75]"}`}>
              {t("myPlan.approxPerDay", { amount: localDailyText })}
              {plan.trialDays && (
                <span className="ml-1.5 opacity-75">
                  · {t("myPlan.trialBadge", { n: plan.trialDays })}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-5 flex-1">
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${dark ? "text-[#4CD9A4]" : "text-[#1D9E75]"}`} />
              <span className={dark ? "text-green-50" : "text-[#1E293B]"}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        {isComprador && (
          <div className={`text-center py-2.5 rounded-xl text-xs font-semibold border ${dark ? "border-white/20 text-white bg-white/10" : "border-gray-200 text-[#6B7280]"}`}>
            {t("myPlan.cta.activeFree")}
          </div>
        )}
        {isProducFree && (
          <div className={`text-center py-2.5 rounded-xl text-xs font-semibold border ${dark ? "border-white/20 text-white bg-white/10" : "border-gray-200 text-[#6B7280]"}`}>
            {t("myPlan.cta.currentTrial")}
          </div>
        )}
        {!plan.isFree && isActive && (
          <div className={`text-center py-2.5 rounded-xl text-xs font-semibold ${dark ? "bg-white/20 text-white border border-white/20" : "bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/30"}`}>
            {t("myPlan.cta.planActive")}
          </div>
        )}
        {!plan.isFree && !isActive && (
          <Link
            href={ACTIVATE_HREF[plan.id] ?? "/planes"}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              dark
                ? "bg-[#1D9E75] text-white hover:bg-[#167a5a]"
                : "bg-[#E1F5EE] text-[#085041] hover:bg-[#1D9E75] hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" />
            {t("myPlan.cta.activate")}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function MiPlanPage() {
  const { t } = useTranslation();
  const { setCurrency } = useCurrency();
  const [loading,       setLoading]       = useState(true);
  const [role,          setRole]          = useState<string>("productor");
  const [planStatus,    setPlanStatus]    = useState<string>("trial");
  const [trialEndsAt,   setTrialEndsAt]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan_status, trial_ends_at, country")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        setRole(profile.role ?? "productor");
        setTrialEndsAt(profile.trial_ends_at ?? null);
        let status = profile.plan_status ?? "trial";
        if (status === "trial" && profile.trial_ends_at) {
          if (new Date(profile.trial_ends_at) < new Date()) status = "expired";
        }
        setPlanStatus(status);
        // Set currency from profile country (only if not manually overridden)
        if (profile.country) {
          const entry = currencyByCountryName(profile.country);
          setCurrency(entry);
        }
      }
      setLoading(false);
    }
    load();
  }, [setCurrency]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  const isComprador = role === "comprador";
  const plans = ROLE_PLANS[role] ?? ROLE_PLANS.productor;

  const faqItems = [
    { q: t("myPlan.faq.q1"), a: t("myPlan.faq.a1") },
    { q: t("myPlan.faq.q2"), a: t("myPlan.faq.a2") },
    { q: t("myPlan.faq.q3"), a: t("myPlan.faq.a3") },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">{t("myPlan.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          {isComprador
            ? t("myPlan.subtitleFree")
            : t("myPlan.subtitleRole", { role: t(`roles.${role}`) })}
        </p>
        <CurrencyHint className="mt-2 items-start" />
      </div>

      {/* Trial banner */}
      {!isComprador && (
        <TrialBanner trialEndsAt={trialEndsAt} planStatus={planStatus} />
      )}

      {/* Plan cards */}
      <div
        className={`grid gap-6 items-stretch ${
          plans.length === 1 ? "max-w-sm" : "grid-cols-1 sm:grid-cols-2 max-w-2xl"
        }`}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            planStatus={planStatus}
          />
        ))}
      </div>

      {/* FAQ */}
      {!isComprador && (
        <section className="max-w-lg">
          <h2 className="text-base font-bold text-[#085041] mb-4">{t("myPlan.faq.title")}</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-sm font-bold text-[#085041] mb-1">{item.q}</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment history */}
      {!isComprador && (
        <section className="max-w-lg pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#085041]">{t("myPlan.paymentHistory.title")}</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <Lock className="h-3.5 w-3.5" /> {t("myPlan.paymentHistory.processedBy")}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-12 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Receipt className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-[#085041]">{t("myPlan.paymentHistory.noPayments")}</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xs leading-relaxed">
                {t("myPlan.paymentHistory.noPaymentsDesc")}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
