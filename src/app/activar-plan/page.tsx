"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { Loader2 as SpinnerFallback, Loader2, Lock, CheckCircle2, CreditCard, ArrowRight, AlertCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getPlanInfo, type PlanInfo } from "@/lib/plans";

/* ─── Culqi v4 globals ────────────────────────────────────── */
declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      settings: (opts: { title: string; currency: string; description: string; amount: number }) => void;
      open: () => void;
      close?: () => void;
      token?: { id: string; email: string };
      error?: { user_message?: string };
    };
    culqi?: () => void;
  }
}

/* ─── Card brand marks (visual) ───────────────────────────── */
function VisaMark() {
  return <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[13px] font-extrabold italic tracking-tight text-[#1A1F71]">VISA</span>;
}
function MastercardMark() {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-gray-200">
      <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
      <span className="h-4 w-4 rounded-full bg-[#F79E1B] -ml-2 mix-blend-multiply" />
    </span>
  );
}
function CulqiMark() {
  return <span className="font-extrabold text-[#00A8A8]">Culqi</span>;
}

type Status = "idle" | "processing" | "done" | "error";

function CheckoutInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const info = getPlanInfo(params.get("rol"), params.get("plan"));

  const [status, setStatus]       = useState<Status>("idle");
  const [chargeId, setChargeId]   = useState("");
  const [error, setError]         = useState("");

  // Debug: confirm we're a client component and whether the public key reached the browser.
  useEffect(() => {
    console.log("Culqi script loading...");
    const rawPk = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
    // length helps spot an invisible trailing space/newline in the env var
    console.log("PK:", rawPk, "length:", rawPk?.length);
  }, []);

  // Keep the latest plan available to the global Culqi callback.
  const infoRef = useRef<PlanInfo | null>(info);
  infoRef.current = info;

  useEffect(() => {
    // Culqi calls window.culqi() once the customer submits the card in the modal.
    window.culqi = async () => {
      const C = window.Culqi;
      if (C?.token) {
        const token = C.token.id;
        const email = C.token.email;
        console.log("Token received:", token);
        C.close?.();
        setError("");
        setStatus("processing");
        try {
          const res = await fetch("/api/culqi/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email, plan: infoRef.current?.plan, rol: infoRef.current?.rol }),
          });
          const data = await res.json();
          if (data.success) { setChargeId(data.subscription_id ?? data.charge_id ?? ""); setStatus("done"); }
          else { setError(data.error || t("checkout.errorTitle")); setStatus("error"); }
        } catch {
          setError(t("checkout.errorTitle"));
          setStatus("error");
        }
      } else if (C?.error) {
        setError(C.error.user_message || t("checkout.errorTitle"));
        setStatus("error");
      }
    };
    return () => { window.culqi = undefined; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCheckout = () => {
    console.log("Opening Culqi modal...", { amount: info?.amountCents, plan: info?.plan });
    if (!window.Culqi) {
      alert("Cargando sistema de pago, intenta de nuevo");
      return;
    }
    if (!info) return;

    // Culqi Checkout v4: the public key is a PROPERTY of the Culqi object,
    // assigned before settings() and open() — never inside settings().
    // .trim() guards against an invisible trailing space/newline in the env value.
    const pk = (process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || "").trim();
    console.log("PK:", pk);
    window.Culqi.publicKey = pk;

    window.Culqi.settings({
      title: "MARKARU",
      currency: "USD",
      description: `Plan ${info.name}`,
      amount: info.amountCents,
    });
    window.Culqi.open();
  };

  /* No plan → invite to pick one */
  if (!info) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center bg-[#E1F5EE] p-4 rounded-2xl mb-4">
            <CreditCard className="h-8 w-8 text-[#1D9E75]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#085041] mb-2">{t("checkout.noPlanTitle")}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("checkout.noPlan")}</p>
          <Link href="/planes" className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#167a5a] transition-colors">
            {t("checkout.seePlans")}
          </Link>
        </div>
      </Shell>
    );
  }

  /* Payment successful */
  if (status === "done") {
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center bg-[#E1F5EE] p-5 rounded-2xl mb-5">
            <CheckCircle2 className="h-12 w-12 text-[#1D9E75]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#085041] mb-2">{t("checkout.successTitle")}</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{t("checkout.activeOneYear", { plan: info.name })}</p>
          {chargeId && (
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-6">
              <span className="text-[11px] text-gray-500">{t("checkout.orderNumber")}</span>
              <p className="text-sm font-bold tracking-wide text-[#085041]">{chargeId}</p>
            </div>
          )}
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#167a5a] transition-colors">
              {t("checkout.goDashboard")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.culqi.com/js/v4"
        strategy="afterInteractive"
        onLoad={() => console.log("Culqi ready:", window.Culqi)}
      />
      <Shell>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("checkout.title")} {info.name}</h1>
            <p className="text-sm text-gray-500">{t("checkout.subtitle")}</p>
          </div>

          {/* Selected plan summary */}
          <div className="mx-6 mt-5 rounded-xl bg-[#085041] text-white p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-green-200">{t("checkout.planLabel")}</p>
              <p className="text-lg font-extrabold">{info.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">{info.priceLabel}</p>
              <p className="text-[11px] text-green-200">{t("checkout.annual")}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {status === "error" && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t("checkout.errorTitle")}</p>
                  {error && <p className="text-xs mt-0.5">{error}</p>}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={openCheckout}
              disabled={status === "processing"}
              className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#167a5a] disabled:opacity-70 transition-colors"
            >
              {status === "processing" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("checkout.processing")}</>
              ) : status === "error" ? (
                <><Lock className="h-4 w-4" /> {t("checkout.retry")}</>
              ) : (
                <><Lock className="h-4 w-4" /> {t("checkout.pay")} {info.priceLabel} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            {/* Trust / Culqi */}
            <div className="pt-1 space-y-3">
              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5 text-[#1D9E75]" /> {t("checkout.secure")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] text-gray-400">{t("checkout.accepted")}:</span>
                <VisaMark />
                <MastercardMark />
                <span className="text-gray-300">·</span>
                <CulqiMark />
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}

/* ─── Page shell ──────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/markaru-logo.png" alt="MARKARU" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">MARKARU</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export default function ActivarPlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SpinnerFallback className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}
