"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Package, TrendingUp, Globe,
  Clipboard, CheckCircle2, Loader2, ArrowLeft, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CountryCombobox } from "@/components/CountryCombobox";

/* ─── Constants ───────────────────────────────────────────── */

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DAP", "FCA", "CPT", "DDP"];

const PRODUCTS = [
  "Palta Hass", "Uva Red Globe", "Espárrago", "Mango", "Arándano",
  "Quinoa", "Cacao fino", "Café especial", "Jengibre", "Cúrcuma",
  "Maracuyá", "Granadilla", "Alcachofa", "Ají amarillo", "Páprika",
  "Granada", "Limón sutil", "Mandarina", "Uva Thompson",
];


const CERTIFICATIONS_REQ = [
  "GlobalGAP", "Orgánico USDA", "Fairtrade", "Orgánico EU",
  "HACCP", "ISO 22000", "BRC", "Sin requisito específico",
];

/* ─── Field wrapper ───────────────────────────────────────── */

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#085041] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all";

/* ─── Section ─────────────────────────────────────────────── */

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[#1D9E75]" />
        </div>
        <h2 className="text-sm font-bold text-[#085041]">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function NuevoRFQPage() {
  const router = useRouter();
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [tradeType,        setTradeType]        = useState<"internacional" | "nacional">("internacional");
  const [volUnit,          setVolUnit]          = useState<"kg" | "TM" | "qq">("TM");
  const [producto,         setProducto]         = useState("");
  const [productoCustom,   setProductoCustom]   = useState("");
  const [volumen,          setVolumen]          = useState("");
  const [incoterm,         setIncoterm]         = useState("FOB");
  const [fechaEntrega,     setFechaEntrega]     = useState("");
  const [paisDestino,      setPaisDestino]      = useState("");
  const [ciudadDestino,    setCiudadDestino]    = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [especificaciones, setEspecificaciones] = useState("");
  const [precioRef,        setPrecioRef]        = useState("");
  const [certRequerida,    setCertRequerida]    = useState("Sin requisito específico");
  const [notas,            setNotas]            = useState("");

  const productoFinal = producto === "__custom__" ? productoCustom : producto;

  const isValid = tradeType === "internacional"
    ? productoFinal.trim() && volumen && incoterm && fechaEntrega && paisDestino
    : productoFinal.trim() && volumen && fechaEntrega && ciudadDestino;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const isNacional = tradeType === "nacional";
    const volTm = volUnit === "kg" ? parseFloat(volumen) / 1000 : volUnit === "qq" ? parseFloat(volumen) * 0.046 : parseFloat(volumen);
    const { error } = await supabase.from("rfq_commercial").insert({
      exporter_id: user.id,
      product: productoFinal,
      volume_tm: volTm,
      trade_type: tradeType,
      incoterm: isNacional ? null : incoterm,
      delivery_date: fechaEntrega,
      destination_country: isNacional ? ciudadDestino : paisDestino,
      specifications: especificaciones,
      ref_price_usd: precioRef ? parseFloat(precioRef) : null,
      certification_required: certRequerida && certRequerida !== "Sin requisito específico"
        ? [certRequerida]
        : [],
      notes: isNacional && direccionEntrega
        ? `[Dirección entrega: ${direccionEntrega}]${notas ? "\n" + notas : ""}`
        : notas,
      status: "open",
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message ?? "No se pudo publicar la solicitud. Intenta de nuevo.");
      setTimeout(() => setSubmitError(null), 6000);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-xl font-extrabold text-[#085041] mb-2">¡Solicitud publicada!</h2>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
            Tu solicitud de compra ha sido publicada. Los productores podrán verla y enviarte su oferta.
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => router.push("/dashboard/exportador/solicitudes")}
              className="w-full py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors">
              Ver mis solicitudes
            </button>
            <button type="button" onClick={() => { setSubmitted(false); setProducto(""); setVolumen(""); setFechaEntrega(""); setPaisDestino(""); setEspecificaciones(""); setPrecioRef(""); setNotas(""); }}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
              Publicar otra solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all shadow-sm">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Publicar solicitud de compra</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Define lo que buscas — los productores te enviarán su oferta.
          </p>
        </div>
      </div>

      {/* Tipo de operación */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-bold text-[#085041] mb-3">Tipo de operación *</p>
        <div className="flex gap-3">
          {([
            { value: "internacional", label: "Exportación / Internacional", hint: "Incoterms, puerto, aduana" },
            { value: "nacional",      label: "Venta nacional",              hint: "Sin incoterm, entrega local" },
          ] as const).map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { setTradeType(opt.value); setVolUnit(opt.value === "nacional" ? "kg" : "TM"); }}
              className={`flex-1 flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                tradeType === opt.value
                  ? "bg-[#085041] border-[#085041] text-white"
                  : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75]"
              }`}>
              <span className="text-xs font-bold">{opt.label}</span>
              <span className={`text-[10px] ${tradeType === opt.value ? "text-green-200" : "text-gray-400"}`}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Producto + volumen */}
      <Section icon={Package} title="Producto buscado">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Producto" required>
            <select value={producto} onChange={(e) => setProducto(e.target.value)} className={inputCls}>
              <option value="">Selecciona un producto...</option>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="__custom__">Otro (especificar)</option>
            </select>
          </Field>
          {producto === "__custom__" && (
            <Field label="Especifica el producto" required>
              <input value={productoCustom} onChange={(e) => setProductoCustom(e.target.value)}
                placeholder="Nombre del producto" className={inputCls} />
            </Field>
          )}
          <Field label="Volumen requerido" required hint={`Cantidad en ${volUnit}`}>
            <div className="flex gap-2">
              <input value={volumen} onChange={(e) => setVolumen(e.target.value)}
                type="number" min={0} step={0.5} placeholder="50" className={`${inputCls} flex-1`} />
              <select value={volUnit} onChange={e => setVolUnit(e.target.value as "kg" | "TM" | "qq")}
                className="rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-xs text-[#1E293B] focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all">
                <option value="kg">kg</option>
                <option value="TM">TM</option>
                <option value="qq">qq</option>
              </select>
            </div>
          </Field>
          <Field label="Certificación requerida">
            <select value={certRequerida} onChange={(e) => setCertRequerida(e.target.value)} className={inputCls}>
              {CERTIFICATIONS_REQ.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Condiciones comerciales */}
      <Section icon={TrendingUp} title="Condiciones comerciales">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tradeType === "internacional" && (
            <Field label="Incoterm" required>
              <div className="grid grid-cols-4 gap-1.5">
                {INCOTERMS.map((i) => (
                  <button key={i} type="button"
                    onClick={() => setIncoterm(i)}
                    className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                      incoterm === i
                        ? "bg-[#085041] text-white border-[#085041]"
                        : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                    }`}>
                    {i}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Fecha de entrega" required>
            <input value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
              type="date" min={new Date().toISOString().split("T")[0]} className={inputCls} />
          </Field>
          <Field label="Precio referencial (opcional)" hint={`${tradeType === "nacional" ? "S/" : "USD"} por ${volUnit} o total`}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                {tradeType === "nacional" ? "S/" : "$"}
              </span>
              <input value={precioRef} onChange={(e) => setPrecioRef(e.target.value)}
                type="number" min={0} placeholder="1500" className={`${inputCls} pl-7`} />
            </div>
          </Field>
        </div>
      </Section>

      {/* Destino */}
      <Section icon={Globe} title="Destino">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tradeType === "internacional" ? (
            <Field label="País destino" required>
              <CountryCombobox value={paisDestino} onChange={setPaisDestino} className={inputCls} placeholder="Escribe para buscar país..." />
            </Field>
          ) : (
            <>
              <Field label="Ciudad / Región destino" required>
                <input value={ciudadDestino} onChange={(e) => setCiudadDestino(e.target.value)}
                  placeholder="Ej: Lima, Arequipa, La Libertad" className={inputCls} />
              </Field>
              <Field label="Dirección de entrega (opcional)">
                <input value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)}
                  placeholder="Ej: Av. Industrial 123, La Victoria" className={inputCls} />
              </Field>
            </>
          )}
        </div>
      </Section>

      {/* Especificaciones */}
      <Section icon={Clipboard} title="Especificaciones técnicas">
        <div className="space-y-4">
          <Field label="Especificaciones del producto" hint="Calibre, grado, empaque, condiciones de almacenamiento, etc.">
            <textarea value={especificaciones} onChange={(e) => setEspecificaciones(e.target.value)}
              rows={4} maxLength={600}
              placeholder="Ej: Palta Hass calibre 24, en cajas de 4kg, temperatura 5–7°C, grado exportación..."
              className={`${inputCls} resize-none`} />
            <p className="text-[10px] text-gray-400 text-right mt-1">{especificaciones.length}/600</p>
          </Field>
          <Field label="Notas adicionales">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              rows={2} maxLength={300}
              placeholder="Condiciones de pago, preferencias de región, otros requisitos..."
              className={`${inputCls} resize-none`} />
          </Field>
        </div>
      </Section>

      {/* Submit */}
      <div className="flex items-center justify-between pb-6 flex-wrap gap-3">
        <div className="flex flex-col items-end gap-2">
          {submitError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-700 max-w-sm text-right">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {submitError}
            </div>
          )}
          <p className="text-xs text-[#6B7280]">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              submitError ? "bg-red-500 hover:bg-red-600" : "bg-[#085041] hover:bg-[#1D9E75]"
            }`}
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</>
              : submitError
              ? <><AlertCircle className="h-4 w-4" /> Error — Reintentar</>
              : <><FileText className="h-4 w-4" /> Publicar solicitud</>}
          </button>
        </div>
      </div>
    </div>
  );
}

