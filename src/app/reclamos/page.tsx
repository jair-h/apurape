"use client";

import { useState } from "react";
import Link from "next/link";
import { BookText, Loader2, CheckCircle2, AlertCircle, ClipboardList, MessageSquareWarning } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";
import { createClient } from "@/lib/supabase";

type Tipo = "reclamo" | "queja";

export default function ReclamosPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    nombre: "", dni: "", email: "", telefono: "",
    tipo: "" as Tipo | "", descripcion: "", solicitud: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState<{ code: string; tipo: Tipo; email: string } | null>(null);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo) return;
    setError("");
    setLoading(true);

    // Generate the ticket id client-side (anon can INSERT but not SELECT it back)
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reclamaciones").insert({
      id,
      nombre: form.nombre.trim(),
      dni: form.dni.trim(),
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono.trim() || null,
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      solicitud: form.solicitud.trim(),
    });
    setLoading(false);
    if (insertError) { setError(insertError.message || t("reclamos.error")); return; }
    setDone({ code: id.slice(0, 8).toUpperCase(), tipo: form.tipo, email: form.email.trim().toLowerCase() });
  };

  return (
    <>
      <LandingNavbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        {/* Header */}
        <section className="bg-[#B42318] py-14 sm:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center bg-white/10 p-4 rounded-2xl mb-5">
              <BookText className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">{t("reclamos.title")}</h1>
            <p className="text-sm text-[#FEE4E2] font-medium mb-3">{t("reclamos.legalRef")}</p>
            <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto">{t("reclamos.intro")}</p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {done ? (
            /* Confirmation */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center bg-[#FEF3F2] p-5 rounded-2xl mb-5">
                <CheckCircle2 className="h-10 w-10 text-[#D92D20]" />
              </div>
              <h2 className="text-xl font-extrabold text-[#B42318] mb-2">{t("reclamos.successTitle")}</h2>
              <div className="inline-block bg-gray-100 rounded-xl px-5 py-2 my-3">
                <span className="text-xs text-gray-500">Código / Ticket</span>
                <p className="text-lg font-extrabold tracking-wider text-[#B42318]">{done.code}</p>
              </div>
              <p className="text-gray-600 leading-relaxed max-w-md mx-auto mb-7">
                {t("reclamos.successBody", {
                  tipo: done.tipo === "reclamo" ? t("reclamos.reclamoWord") : t("reclamos.quejaWord"),
                  code: done.code,
                  email: done.email,
                })}
              </p>
              <Link href="/" className="inline-flex items-center gap-2 bg-[#D92D20] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#912018] transition-colors">
                {t("reclamos.backHome")}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
              {/* Reclamo vs Queja explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquareWarning className="h-4 w-4 text-[#D92D20]" />
                    <p className="text-sm font-bold text-[#B42318]">{t("reclamos.reclamoTitle")}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t("reclamos.reclamoDesc")}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-bold text-[#B42318]">{t("reclamos.quejaTitle")}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t("reclamos.quejaDesc")}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("reclamos.fullName")} *</label>
                    <input type="text" required value={form.nombre} onChange={set("nombre")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("reclamos.dni")} *</label>
                    <input type="text" required value={form.dni} onChange={set("dni")} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("reclamos.email")} *</label>
                    <input type="email" required value={form.email} onChange={set("email")} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("reclamos.phone")}</label>
                    <input type="tel" value={form.telefono} onChange={set("telefono")} placeholder="+51 999 888 777" className={inputClass} />
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className={labelClass}>{t("reclamos.type")} *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["reclamo", "queja"] as const).map((op) => {
                      const active = form.tipo === op;
                      return (
                        <button key={op} type="button"
                          onClick={() => setForm((p) => ({ ...p, tipo: op }))}
                          className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                            active ? "border-[#D92D20] bg-[#FEF3F2] text-[#B42318]" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}>
                          {op === "reclamo" ? t("reclamos.reclamoTitle") : t("reclamos.quejaTitle")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("reclamos.description")} *</label>
                  <textarea required minLength={20} maxLength={500} rows={4}
                    value={form.descripcion} onChange={set("descripcion")}
                    placeholder={t("reclamos.descriptionPlaceholder")} className={inputClass} />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{form.descripcion.length}/500</p>
                </div>

                <div>
                  <label className={labelClass}>{t("reclamos.request")} *</label>
                  <textarea required maxLength={500} rows={3}
                    value={form.solicitud} onChange={set("solicitud")}
                    placeholder={t("reclamos.requestPlaceholder")} className={inputClass} />
                </div>

                <button type="submit" disabled={loading || !form.tipo}
                  className="w-full flex items-center justify-center gap-2 bg-[#D92D20] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#912018] transition-colors disabled:opacity-60">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("reclamos.sending")}</> : t("reclamos.submit")}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
