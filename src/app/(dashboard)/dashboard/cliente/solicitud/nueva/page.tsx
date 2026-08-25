"use client";

/* Publicar una solicitud. Gratis e ilimitado: en Apurape el que paga es el
 * Proveedor (límite de cotizaciones), no el Cliente.
 * Reemplaza a /dashboard/comprador/solicitud/nueva y al RFQ del exportador. */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Category { id: string; slug: string; name: string; }
interface Subcategory { id: string; category_id: string; name: string; }

const URGENCIES = [
  { value: "urgente",     label: "Urgente (hoy o mañana)" },
  { value: "esta_semana", label: "Esta semana" },
  { value: "normal",      label: "Sin apuro" },
  { value: "flexible",    label: "Cuando se pueda" },
];

export default function NuevaSolicitudPage() {
  const supabase = createClient();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcats, setSubcats]       = useState<Subcategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  const [form, setForm] = useState({
    title: "", description: "", category_id: "", subcategory_id: "",
    budget_min: "", budget_max: "", region: "", province: "", district: "",
    is_remote: false, needed_at: "", urgency: "normal",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: cats }, { data: subs }, { data: profile }] = await Promise.all([
        supabase.from("service_categories").select("id, slug, name").eq("active", true).order("order_num"),
        supabase.from("service_subcategories").select("id, category_id, name").eq("active", true).order("order_num"),
        user
          ? supabase.from("profiles").select("region, province, district").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setCategories((cats as Category[]) ?? []);
      setSubcats((subs as Subcategory[]) ?? []);
      // Prellenar la zona con la del perfil: casi siempre es la misma.
      setForm(f => ({
        ...f,
        category_id: (cats as Category[])?.[0]?.id ?? "",
        region:   profile?.region   ?? "",
        province: profile?.province ?? "",
        district: profile?.district ?? "",
      }));
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const min = form.budget_min ? Number(form.budget_min) : null;
    const max = form.budget_max ? Number(form.budget_max) : null;
    if (min != null && max != null && max < min) {
      setError("El presupuesto máximo no puede ser menor que el mínimo.");
      setSaving(false);
      return;
    }

    const { error: err } = await supabase.from("service_requests").insert({
      client_id:      user.id,
      category_id:    form.category_id,
      subcategory_id: form.subcategory_id || null,
      title:          form.title.trim(),
      description:    form.description.trim(),
      budget_min:     min,
      budget_max:     max,
      region:         form.region.trim() || null,
      province:       form.province.trim() || null,
      district:       form.district.trim() || null,
      is_remote:      form.is_remote,
      needed_at:      form.needed_at || null,
      urgency:        form.urgency,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    setDone(true);
    setSaving(false);
  };

  const labelClass = "block text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E9384] focus:border-transparent";
  const availableSubs = subcats.filter(s => s.category_id === form.category_id);
  const valid = form.title.trim().length > 2 && form.description.trim().length > 9 && form.category_id;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  if (done) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mt-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-[#0E9384]" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">Solicitud publicada</h2>
          <p className="text-xs text-[#6B7280] leading-relaxed mb-5">
            Los proveedores de tu zona ya pueden verla. Te escribirán por el chat
            con sus cotizaciones y tú eliges.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/cliente/solicitudes"
              className="py-2.5 rounded-xl bg-[#0E9384] text-white text-sm font-bold hover:bg-[#0B7268] transition-colors">
              Ver mis solicitudes
            </Link>
            <button type="button"
              onClick={() => { setDone(false); setForm(f => ({ ...f, title: "", description: "", budget_min: "", budget_max: "" })); }}
              className="py-2.5 rounded-xl border border-gray-200 text-[#6B7280] text-sm font-bold hover:border-[#0E9384] transition-colors">
              Publicar otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl">
        <Link href="/dashboard/cliente/solicitudes"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#0E9384] transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Mis solicitudes
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900">¿Qué necesitas?</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Cuéntalo una vez y recibe cotizaciones. Publicar es gratis y sin límite.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className={labelClass}>¿Qué necesitas? *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Reparar una fuga en la cocina" className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoría *</label>
              <select value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value, subcategory_id: "" }))}
                className={inputClass}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subcategoría</label>
              <select value={form.subcategory_id}
                onChange={e => setForm(f => ({ ...f, subcategory_id: e.target.value }))}
                className={inputClass} disabled={availableSubs.length === 0}>
                <option value="">—</option>
                {availableSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Cuéntalo con detalle *</label>
            <textarea rows={4} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mientras más claro seas, mejores cotizaciones vas a recibir."
              className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Presupuesto desde (S/)</label>
              <input type="number" min="0" value={form.budget_min}
                onChange={e => setForm(f => ({ ...f, budget_min: e.target.value }))}
                placeholder="100" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hasta (S/)</label>
              <input type="number" min="0" value={form.budget_max}
                onChange={e => setForm(f => ({ ...f, budget_max: e.target.value }))}
                placeholder="300" className={inputClass} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2">
            Opcional, pero ayuda a filtrar cotizaciones fuera de rango.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Región</label>
              <input type="text" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder="Lima" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Provincia</label>
              <input type="text" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                placeholder="Lima" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distrito</label>
              <input type="text" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                placeholder="Miraflores" className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_remote}
              onChange={e => setForm(f => ({ ...f, is_remote: e.target.checked }))}
              className="rounded border-gray-300 text-[#0E9384] focus:ring-[#0E9384]" />
            <span className="text-xs text-[#6B7280]">Se puede hacer a distancia</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>¿Para cuándo?</label>
              <input type="date" value={form.needed_at}
                onChange={e => setForm(f => ({ ...f, needed_at: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Urgencia</label>
              <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                className={inputClass}>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <button type="button" disabled={!valid || saving} onClick={handleSubmit}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0E9384] text-white text-sm font-bold hover:bg-[#0B7268] transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publicar solicitud
          </button>
          <p className="text-[10px] text-gray-400 text-center">
            Tu solicitud queda abierta 30 días. Puedes cerrarla cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}
