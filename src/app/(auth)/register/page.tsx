"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 as SpinnerFallback } from "lucide-react";
import {
  Sprout,
  Building2,
  Truck,
  Globe,
  Users,
  Warehouse,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CountryCombobox } from "@/components/CountryCombobox";
import { useTranslation } from "@/lib/i18n";
import GoogleAuthButton from "@/components/GoogleAuthButton";

/* ─── Role icon/style config (no strings — those come from t()) */
const ROLE_CONFIG = [
  { id: "productor",    icon: Sprout,    iconClass: "text-[#1D9E75] bg-green-100",  borderClass: "hover:border-[#1D9E75]" },
  { id: "exportador",   icon: Building2, iconClass: "text-blue-600 bg-blue-100",    borderClass: "hover:border-blue-500" },
  { id: "forwarder",    icon: Truck,     iconClass: "text-orange-600 bg-orange-100",borderClass: "hover:border-orange-500" },
  { id: "comprador",    icon: Globe,     iconClass: "text-purple-600 bg-purple-100",borderClass: "hover:border-purple-500" },
  { id: "certificadora",icon: Users,     iconClass: "text-pink-600 bg-pink-100",    borderClass: "hover:border-pink-500" },
  { id: "banco",        icon: Warehouse, iconClass: "text-amber-600 bg-amber-100",  borderClass: "hover:border-amber-500" },
] as const;

type RoleId = typeof ROLE_CONFIG[number]["id"];

/* ─── Cooperativa auto-detection ──────────────────────────── */
const COOP_PATTERNS: RegExp[] = [
  /\bcooperativa\b/, /\bcoopag\b/, /\bcoop\b/, /\basociacion\b/, /\basoc\b/,
  /\bcentral de\b/, /\bfederacion\b/, /\bcac\b/, /\bcaap\b/,
];
function looksLikeCoop(name: string) {
  const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return COOP_PATTERNS.some((re) => re.test(n));
}

const SOCIOS_OPTIONS = ["25-50", "51-100", "101-200", "más de 200"];

/* ─── Role selector ───────────────────────────────────────── */
function RolSelector({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ROLE_CONFIG.map((role) => {
        const active = selected === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
              active
                ? "border-[#1D9E75] bg-green-50 shadow-sm"
                : `border-gray-200 bg-white ${role.borderClass}`
            }`}
          >
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${role.iconClass}`}>
              <role.icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${active ? "text-[#1D9E75]" : "text-gray-900"}`}>
                {t(`auth.register.roles.${role.id}.label`)}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                {t(`auth.register.roles.${role.id}.description`)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Cooperativa lead form (special plan, no account) ────── */
function CoopForm({ initialName, onBack }: { initialName: string; onBack: () => void }) {
  const [form, setForm] = useState({
    nombre_cooperativa: initialName,
    representante: "",
    num_socios: "",
    whatsapp: "+51 ",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("cooperativa_leads").insert({
      nombre_cooperativa: form.nombre_cooperativa.trim(),
      representante: form.representante.trim(),
      num_socios: form.num_socios,
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim().toLowerCase(),
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center bg-[#E1F5EE] p-5 rounded-2xl mb-5">
          <CheckCircle2 className="h-10 w-10 text-[#1D9E75]" />
        </div>
        <h2 className="text-xl font-extrabold text-[#085041] mb-3">¡Recibimos tu solicitud!</h2>
        <p className="text-gray-600 leading-relaxed max-w-md mx-auto mb-7">
          Te contactaremos en menos de 24 horas para darte acceso como cooperativa fundadora con condiciones especiales.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#167a5a] transition-colors">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-5">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#1D9E75] text-white"><Users className="h-4 w-4" /></div>
          <h1 className="text-xl font-extrabold text-gray-900">Plan Cooperativa / Asociación</h1>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl">
        <p className="text-sm font-semibold text-[#085041] leading-relaxed">
          Tenemos un plan especial para cooperativas y asociaciones. Déjanos tus datos y te contactamos en menos de 24 horas.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre de la cooperativa *</label>
          <input type="text" required placeholder="Cooperativa Agraria..." value={form.nombre_cooperativa}
            onChange={set("nombre_cooperativa")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nombre del representante legal *</label>
          <input type="text" required placeholder="Nombre y apellidos" value={form.representante}
            onChange={set("representante")} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Número de socios *</label>
            <select required value={form.num_socios} onChange={set("num_socios")} className={inputClass}>
              <option value="">Selecciona…</option>
              {SOCIOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input type="tel" required placeholder="+51 999 888 777" value={form.whatsapp}
              onChange={set("whatsapp")} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input type="email" required placeholder="correo@cooperativa.com" value={form.email}
            onChange={set("email")} className={inputClass} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#167a5a] transition-colors disabled:opacity-60">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <>Quiero el plan cooperativa <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </>
  );
}

/* ─── Register form ───────────────────────────────────────── */
type FormData = {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  country: string;
  phone: string;
};

function RegisterForm({
  roleId,
  roleConfig,
  onSubmit,
  loading,
  onCoopDetected,
}: {
  roleId: RoleId;
  roleConfig: typeof ROLE_CONFIG[number];
  onSubmit: (data: FormData) => void;
  loading: boolean;
  onCoopDetected: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    email: "", password: "", fullName: "", companyName: "", country: "", phone: "",
  });

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, companyName: v }));
    if (looksLikeCoop(v)) onCoopDetected(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 mb-2">
        <div className={`p-2 rounded-lg ${roleConfig.iconClass}`}>
          <roleConfig.icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{t("auth.register.step2")}</p>
          <p className="text-sm font-semibold text-gray-800">{t(`auth.register.roles.${roleId}.label`)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("auth.register.fullName")} *</label>
          <input
            type="text"
            required
            placeholder={t("auth.register.fullNamePlaceholder")}
            value={form.fullName}
            onChange={set("fullName")}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            {roleId === "productor" ? "Nombre del campo / finca" : "Empresa / Razón social"} *
          </label>
          <input
            type="text"
            required
            placeholder={roleId === "productor" ? "Finca La Esperanza" : "AgroExport S.A."}
            value={form.companyName}
            onChange={handleCompanyChange}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{t("auth.register.email")} *</label>
        <input
          type="email"
          required
          placeholder={t("auth.register.emailPlaceholder")}
          value={form.email}
          onChange={set("email")}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{t("auth.register.password")} *</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder={t("auth.register.passwordPlaceholder")}
            value={form.password}
            onChange={set("password")}
            className={`${inputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("auth.register.country")} *</label>
          <CountryCombobox
            value={form.country}
            onChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
            required
            className={inputClass}
            placeholder={t("auth.register.countryPlaceholder")}
          />
        </div>
        <div>
          <label className={labelClass}>{t("common.phone")}</label>
          <input
            type="tel"
            placeholder="+51 999 888 777"
            value={form.phone}
            onChange={set("phone")}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {t("auth.register.termsPrefix")}{" "}
        <Link href="/terminos" className="text-[#1D9E75] hover:underline">{t("auth.register.terms")}</Link>{" "}
        {t("auth.register.and")}{" "}
        <Link href="/privacidad" className="text-[#1D9E75] hover:underline">{t("auth.register.privacy")}</Link>.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#167a5a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.register.creatingAccount")}</>
        ) : (
          <>{t("auth.register.createAccount")} <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </form>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
function RegisterPageInner() {
  const { t, lang } = useTranslation();
  const searchParams = useSearchParams();
  const initialRol = searchParams.get("rol") ?? "";
  const initialPlan = searchParams.get("plan") ?? "";

  const [step, setStep]           = useState<1 | 2>(initialRol ? 2 : 1);
  const [selectedRol, setSelectedRol] = useState(initialRol);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const [coopMode, setCoopMode]   = useState(false);
  const [coopName, setCoopName]   = useState("");

  const selectedRoleConfig = ROLE_CONFIG.find((r) => r.id === selectedRol);

  const enterCoop = (name: string) => { setCoopName(name); setCoopMode(true); };

  const handleRolSelect = (id: string) => {
    setSelectedRol(id);
    setStep(2);
  };

  const handleSubmit = async (data: FormData) => {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          company_name: data.companyName,
          country: data.country,
          phone: data.phone,
          role: selectedRol,
        },
      },
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
    } else {
      // Best-effort welcome email via Brevo (never blocks registration)
      console.log("[register] llamando a brevo welcome...");
      try {
        await fetch("/api/brevo/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email, name: data.fullName, rol: selectedRol }),
        });
      } catch { /* ignore — email is best-effort */ }

      // Best-effort CRM sync en Brevo (nunca bloquea el registro)
      try {
        const parts = String(data.fullName || "").trim().split(/\s+/).filter(Boolean);
        await fetch("/api/brevo/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            nombre: parts[0] || data.fullName,
            apellido: parts.slice(1).join(" "),
            empresa: data.companyName,
            pais: data.country,
            rol: selectedRol,
            estadoPlan: "trial",
            fechaRegistro: new Date().toISOString(),
            idioma: lang,
          }),
        });
      } catch { /* best-effort */ }
      setLoading(false);
      // Paid plan selected → go to checkout; free/none → dashboard
      const paid = initialPlan && initialPlan !== "free";
      window.location.href = paid
        ? `/activar-plan?rol=${encodeURIComponent(selectedRol)}&plan=${encodeURIComponent(initialPlan)}`
        : "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/markaru-logo.png" alt="MARKARU" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">
            MARKARU
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {coopMode ? (
            <CoopForm initialName={coopName} onBack={() => setCoopMode(false)} />
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3 mb-8">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 1 ? "bg-[#1D9E75] text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
                <div className={`flex-1 h-0.5 ${step >= 2 ? "bg-[#1D9E75]" : "bg-gray-200"}`} />
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 2 ? "bg-[#1D9E75] text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
              </div>

              {step === 1 && (
                <>
                  <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("auth.register.roleTitle")}</h1>
                  <p className="text-sm text-gray-500 mb-1">{t("auth.register.subtitle")}</p>

                  {/* Google sign-up (above the role/form flow) */}
                  <GoogleAuthButton context="register" />
                  <div className="mb-6" />

                  <RolSelector selected={selectedRol} onSelect={handleRolSelect} />

                  {/* Cooperativa / Asociación */}
                  <button
                    type="button"
                    onClick={() => enterCoop("")}
                    className="mt-4 w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[#1D9E75]/40 bg-[#E1F5EE]/60 text-left hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-all"
                  >
                    <div className="p-2.5 rounded-lg flex-shrink-0 bg-[#1D9E75] text-white">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#085041]">Soy Cooperativa / Asociación</p>
                      <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                        Para cooperativas agrarias, asociaciones de productores y organizaciones agropecuarias
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  </button>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!selectedRol}
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#167a5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t("auth.register.next")}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && selectedRoleConfig && (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                      <h1 className="text-2xl font-extrabold text-gray-900">{t("auth.register.title")}</h1>
                      <p className="text-sm text-gray-500">{t("auth.register.step2")}</p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <RegisterForm
                    roleId={selectedRol as RoleId}
                    roleConfig={selectedRoleConfig}
                    onSubmit={handleSubmit}
                    loading={loading}
                    onCoopDetected={enterCoop}
                  />
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          {t("auth.register.alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-[#1D9E75] font-semibold hover:underline">
            {t("auth.register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SpinnerFallback className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    }>
      <RegisterPageInner />
    </Suspense>
  );
}
