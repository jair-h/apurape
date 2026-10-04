"use client";

/* Libro de Reclamaciones virtual (DS 011-2011-PCM y modificatorias).
 *
 * En español y sin i18n, como el resto de las páginas legales: es un
 * instrumento de la normativa peruana y su contenido no se traduce.
 *
 * El alta pasa por /api/reclamaciones y no por el navegador. La tabla
 * permite INSERT a cualquiera, como exige la norma, pero no SELECT, así que
 * desde aquí no se podría leer de vuelta el correlativo — y el consumidor
 * tiene derecho a conocerlo. El endpoint lo devuelve y manda los correos.
 */

import { useState } from "react";
import Link from "next/link";
import {
  BookText, Loader2, CheckCircle2, AlertCircle,
  ClipboardList, MessageSquareWarning, Printer,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import SiteFooter from "@/components/landing/SiteFooter";

type Tipo = "reclamo" | "queja";

const DOC_TIPOS = [
  { v: "dni",       label: "DNI" },
  { v: "ce",        label: "Carné de extranjería" },
  { v: "pasaporte", label: "Pasaporte" },
];

const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition";

export default function LibroDeReclamacionesPage() {
  const [form, setForm] = useState({
    nombre: "", doc_tipo: "dni", documento: "", direccion: "",
    telefono: "", email: "",
    es_menor: false, apoderado: "",
    bien_servicio: "" as "" | "producto" | "servicio",
    monto: "", bien_descripcion: "",
    tipo: "" as Tipo | "",
    descripcion: "", pedido: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState<{ codigo: string; fecha: string; tipo: Tipo; email: string; emailEnviado: boolean } | null>(null);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo) { setError("Indica si es un reclamo o una queja."); return; }
    setError("");
    setLoading(true);

    try {
      const res  = await fetch("/api/reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "No se pudo registrar. Intenta de nuevo.");
      } else {
        setDone({
          codigo: data.codigo, fecha: data.fecha,
          tipo: form.tipo as Tipo, email: form.email.trim().toLowerCase(),
          emailEnviado: data.emailEnviado !== false,
        });
      }
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e intenta de nuevo.");
    }
    setLoading(false);
  };

  /* ── Constancia ──────────────────────────────────────────── */
  if (done) {
    const etiqueta = done.tipo === "reclamo" ? "reclamo" : "queja";
    return (
      <>
        <LandingNavbar />
        <main className="pt-16 min-h-screen bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center bg-teal-50 p-5 rounded-2xl mb-5">
                <CheckCircle2 className="h-10 w-10 text-[#0E9384]" />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mb-1">
                Registramos tu {etiqueta}
              </h1>
              <p className="text-sm text-[#6B7280] mb-5">
                Guarda este número: es tu constancia.
              </p>

              <div className="inline-block rounded-2xl border-2 border-[#0E9384] bg-teal-50 px-8 py-4 mb-5">
                <p className="text-[11px] text-teal-800">N° de {etiqueta}</p>
                <p className="text-2xl font-extrabold tracking-wider text-[#0E9384]">{done.codigo}</p>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                Presentado el <strong>{done.fecha}</strong> (hora de Lima).
                Tenemos <strong>15 días hábiles</strong> para responderte, y lo
                haremos al correo <strong>{done.email}</strong>.
              </p>

              {!done.emailEnviado && (
                <p className="mt-4 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-md mx-auto leading-relaxed">
                  Tu {etiqueta} quedó registrado, pero no pudimos enviarte la copia
                  por correo. Anota el número: con él podemos ubicarlo.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
                <button type="button" onClick={() => window.print()}
                  className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:border-[#D92D20] hover:text-[#D92D20] transition-colors">
                  <Printer className="h-4 w-4" /> Imprimir constancia
                </button>
                <Link href="/"
                  className="inline-flex items-center gap-2 bg-[#D92D20] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#912018] transition-colors">
                  Volver al inicio
                </Link>
              </div>

              <p className="text-[11px] text-gray-400 mt-6 leading-relaxed">
                La presentación de un reclamo no impide acudir a otras vías de
                solución de controversias ni es requisito para denunciar ante
                INDECOPI.
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  /* ── Formulario ──────────────────────────────────────────── */
  return (
    <>
      <LandingNavbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        <section className="bg-[#B42318] py-12 sm:py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center bg-white/10 p-4 rounded-2xl mb-4">
              <BookText className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">
              Libro de Reclamaciones
            </h1>
            <p className="text-sm text-[#FEE4E2] font-medium mb-3">
              Conforme al Código de Protección y Defensa del Consumidor
              (Ley 29571) y al DS 011-2011-PCM
            </p>
            <p className="text-sm text-white/80 max-w-2xl mx-auto leading-relaxed">
              Registra aquí tu reclamo o queja. Recibirás un número de
              constancia y una copia en tu correo. Tenemos 15 días hábiles para
              responderte.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {/* Reclamo vs queja: la distinción es de la norma, no un detalle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquareWarning className="h-4 w-4 text-[#D92D20]" />
                  <p className="text-sm font-bold text-[#B42318]">Reclamo</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Disconformidad con el producto o el servicio recibido.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-[#B42318]">Queja</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Malestar con la atención recibida, no con el producto o
                  servicio en sí.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              {/* ── 1 · Consumidor ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-bold text-[#B42318] uppercase tracking-wide mb-2">
                  1 · Datos del consumidor
                </legend>

                <div>
                  <label className={labelClass}>Nombres y apellidos *</label>
                  <input type="text" required maxLength={160} value={form.nombre}
                    onChange={set("nombre")} className={inputClass} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo de documento *</label>
                    <select required value={form.doc_tipo} onChange={set("doc_tipo")} className={inputClass}>
                      {DOC_TIPOS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Número de documento *</label>
                    <input type="text" required maxLength={20} inputMode="numeric"
                      value={form.documento} onChange={set("documento")} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Domicilio</label>
                  <input type="text" maxLength={240} value={form.direccion}
                    onChange={set("direccion")} placeholder="Av. / Calle, número, distrito"
                    className={inputClass} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Correo electrónico *</label>
                    <input type="email" required maxLength={160} value={form.email}
                      onChange={set("email")} className={inputClass} />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Aquí enviamos tu constancia y la respuesta.
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input type="tel" maxLength={40} value={form.telefono}
                      onChange={set("telefono")} placeholder="+51 999 888 777" className={inputClass} />
                  </div>
                </div>

                {/* Menor de edad: si lo es, la norma exige al apoderado */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.es_menor}
                      onChange={e => setForm(p => ({ ...p, es_menor: e.target.checked, apoderado: "" }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#D92D20] focus:ring-[#D92D20]" />
                    <span className="text-sm text-gray-700">
                      El consumidor es <strong>menor de edad</strong>
                    </span>
                  </label>

                  {form.es_menor && (
                    <div className="mt-3">
                      <label className={labelClass}>
                        Nombre del padre, madre o apoderado *
                      </label>
                      <input type="text" required maxLength={160} value={form.apoderado}
                        onChange={set("apoderado")} className={inputClass} />
                    </div>
                  )}
                </div>
              </fieldset>

              {/* ── 2 · Bien contratado ── */}
              <fieldset className="space-y-4 pt-2 border-t border-gray-100">
                <legend className="text-xs font-bold text-[#B42318] uppercase tracking-wide mb-2 pt-4">
                  2 · Identificación del bien contratado
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>¿Producto o servicio?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["producto", "servicio"] as const).map(op => (
                        <button key={op} type="button"
                          onClick={() => setForm(p => ({ ...p, bien_servicio: p.bien_servicio === op ? "" : op }))}
                          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                            form.bien_servicio === op
                              ? "border-[#D92D20] bg-[#FEF3F2] text-[#B42318]"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Monto reclamado (S/)</label>
                    <input type="text" inputMode="decimal" value={form.monto}
                      onChange={set("monto")} placeholder="Opcional" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Descripción del bien contratado</label>
                  <textarea rows={2} maxLength={1000} value={form.bien_descripcion}
                    onChange={set("bien_descripcion")}
                    placeholder="Qué contrataste: el servicio, el plan, la fecha…"
                    className={`${inputClass} resize-none`} />
                </div>
              </fieldset>

              {/* ── 3 · Detalle ── */}
              <fieldset className="space-y-4 pt-2 border-t border-gray-100">
                <legend className="text-xs font-bold text-[#B42318] uppercase tracking-wide mb-2 pt-4">
                  3 · Detalle
                </legend>

                <div>
                  <label className={labelClass}>¿Es un reclamo o una queja? *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["reclamo", "queja"] as const).map(op => (
                      <button key={op} type="button"
                        onClick={() => { setForm(p => ({ ...p, tipo: op })); setError(""); }}
                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                          form.tipo === op
                            ? "border-[#D92D20] bg-[#FEF3F2] text-[#B42318]"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                        {op}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Detalle del reclamo o queja *</label>
                  <textarea required minLength={20} maxLength={2000} rows={5}
                    value={form.descripcion} onChange={set("descripcion")}
                    placeholder="Cuenta qué pasó, con fechas y nombres si los tienes."
                    className={inputClass} />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {form.descripcion.length}/2000
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Pedido del consumidor *</label>
                  <textarea required maxLength={2000} rows={3}
                    value={form.pedido} onChange={set("pedido")}
                    placeholder="Qué esperas que hagamos para resolverlo."
                    className={inputClass} />
                </div>
              </fieldset>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#D92D20] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#912018] transition-colors disabled:opacity-60">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                  : "Registrar en el Libro de Reclamaciones"}
              </button>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Los datos se usan únicamente para atender y responder este
                reclamo, conforme a nuestra{" "}
                <Link href="/privacidad" className="text-[#D92D20] hover:underline">
                  Política de Privacidad
                </Link>. La presentación de un reclamo no impide acudir a otras
                vías de solución de controversias ni es requisito para denunciar
                ante INDECOPI.
              </p>
            </form>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
