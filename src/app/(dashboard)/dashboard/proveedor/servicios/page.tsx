"use client";

/* Catálogo del Proveedor: lo que ofrece, a qué precio y dónde.
 * Reemplaza a /dashboard/productor/catalogo y /dashboard/exportador/productos. */

import { useState, useEffect } from "react";
import { Plus, Loader2, Wrench, X, Pencil, Trash2, Eye, EyeOff, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Category { id: string; slug: string; name: string; }
interface Subcategory { id: string; category_id: string; name: string; }

interface ServiceRow {
  id: string; title: string; description: string | null;
  category_id: string; subcategory_id: string | null;
  price_from: number | null; price_unit: string | null;
  coverage_districts: string[]; works_remote: boolean;
  years_experience: number | null;
  status: string; featured_until: string | null;
  views_count: number; quotes_count: number;
}

interface FormState {
  title: string; description: string; category_id: string; subcategory_id: string;
  price_from: string; price_unit: string; coverage_districts: string;
  works_remote: boolean; years_experience: string;
}

const EMPTY: FormState = {
  title: "", description: "", category_id: "", subcategory_id: "",
  price_from: "", price_unit: "servicio", coverage_districts: "",
  works_remote: false, years_experience: "",
};

const PRICE_UNITS = [
  { value: "servicio", label: "por servicio" },
  { value: "hora",     label: "por hora" },
  { value: "dia",      label: "por día" },
  { value: "m2",       label: "por m²" },
  { value: "punto",    label: "por punto" },
  { value: "mes",      label: "por mes" },
];

export default function ProveedorServiciosPage() {
  const supabase = createClient();

  const [userId, setUserId]           = useState<string | null>(null);
  const [services, setServices]       = useState<ServiceRow[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [subcategories, setSubcats]   = useState<Subcategory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<ServiceRow | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: svc }, { data: cats }, { data: subs }] = await Promise.all([
        supabase.from("provider_services").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("service_categories").select("id, slug, name").eq("active", true).order("order_num"),
        supabase.from("service_subcategories").select("id, category_id, name").eq("active", true).order("order_num"),
      ]);

      setServices((svc as ServiceRow[]) ?? []);
      setCategories((cats as Category[]) ?? []);
      setSubcats((subs as Subcategory[]) ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? "" });
    setError("");
    setShowForm(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description ?? "",
      category_id: s.category_id,
      subcategory_id: s.subcategory_id ?? "",
      price_from: s.price_from != null ? String(s.price_from) : "",
      price_unit: s.price_unit ?? "servicio",
      coverage_districts: (s.coverage_districts ?? []).join(", "),
      works_remote: s.works_remote,
      years_experience: s.years_experience != null ? String(s.years_experience) : "",
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true); setError("");

    const payload = {
      provider_id:        userId,
      category_id:        form.category_id,
      subcategory_id:     form.subcategory_id || null,
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      price_from:         form.price_from ? Number(form.price_from) : null,
      price_unit:         form.price_unit || null,
      coverage_districts: form.coverage_districts.split(",").map(d => d.trim()).filter(Boolean),
      works_remote:       form.works_remote,
      years_experience:   form.years_experience ? parseInt(form.years_experience) : null,
    };

    const { data, error: err } = editing
      ? await supabase.from("provider_services").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("provider_services").insert(payload).select().single();

    if (err) {
      // El trigger assert_is_provider rechaza a quien no tiene rol proveedor.
      setError(err.message);
      setSaving(false);
      return;
    }

    const row = data as ServiceRow;
    setServices(prev => editing ? prev.map(s => s.id === row.id ? row : s) : [row, ...prev]);
    setShowForm(false);
    setSaving(false);
  };

  const toggleStatus = async (s: ServiceRow) => {
    const next = s.status === "activo" ? "pausado" : "activo";
    const { error: err } = await supabase.from("provider_services").update({ status: next }).eq("id", s.id);
    if (!err) setServices(prev => prev.map(x => x.id === s.id ? { ...x, status: next } : x));
  };

  const remove = async (s: ServiceRow) => {
    if (!confirm(`¿Eliminar "${s.title}"? Esta acción no se puede deshacer.`)) return;
    const { error: err } = await supabase.from("provider_services").delete().eq("id", s.id);
    if (!err) setServices(prev => prev.filter(x => x.id !== s.id));
  };

  const labelClass = "block text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent";
  const availableSubs = subcategories.filter(s => s.category_id === form.category_id);
  const valid = form.title.trim().length > 0 && form.category_id;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mis servicios</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Lo que publiques aquí es lo que ven los clientes al buscarte.
          </p>
        </div>
        <button type="button" onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D92D20] text-white text-sm font-bold hover:bg-[#B42318] transition-colors flex-shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo servicio</span>
        </button>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">Todavía no publicaste ningún servicio</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Sin servicios publicados no apareces en las búsquedas. Publica el primero.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(s => {
            const cat = categories.find(c => c.id === s.category_id);
            const featured = s.featured_until && new Date(s.featured_until) > new Date();
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-bold text-gray-900 flex-1">{s.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.status === "activo" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.status === "activo" ? "Activo" : "Pausado"}
                  </span>
                </div>

                {cat && <p className="text-[11px] text-[#6B7280] mb-2">{cat.name}</p>}
                {featured && (
                  <p className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D92D20] mb-2">
                    <Trophy className="h-3 w-3" /> Destacado hasta {new Date(s.featured_until!).toLocaleDateString("es-PE")}
                  </p>
                )}

                {s.description && <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-3 mb-3">{s.description}</p>}

                {s.price_from != null && (
                  <p className="text-sm font-bold text-[#D92D20] mb-2">
                    Desde S/ {Number(s.price_from).toLocaleString("es-PE")}
                    <span className="text-[#6B7280] font-normal text-xs">
                      {" "}{PRICE_UNITS.find(u => u.value === s.price_unit)?.label ?? ""}
                    </span>
                  </p>
                )}

                <p className="text-[11px] text-[#6B7280] mb-3">
                  {s.coverage_districts?.length > 0 ? s.coverage_districts.join(", ") : "Sin zona definida"}
                  {s.works_remote && " · a distancia"}
                </p>

                <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                  <span>{s.views_count} vistas</span>
                  <span>{s.quotes_count} cotizaciones</span>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => openEdit(s)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs font-bold text-[#6B7280] hover:border-[#D92D20] hover:text-[#D92D20] transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => toggleStatus(s)} title={s.status === "activo" ? "Pausar" : "Activar"}
                    className="p-2 rounded-lg border border-gray-200 text-[#6B7280] hover:border-[#D92D20] hover:text-[#D92D20] transition-colors">
                    {s.status === "activo" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => remove(s)} title="Eliminar"
                    className="p-2 rounded-lg border border-gray-200 text-[#6B7280] hover:border-red-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">
                {editing ? "Editar servicio" : "Nuevo servicio"}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
              )}

              <div>
                <label className={labelClass}>Título *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej. Gasfitería a domicilio" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className={labelClass}>Descripción</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Qué haces, qué incluye, cómo trabajas."
                  className={`${inputClass} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Precio desde (S/)</label>
                  <input type="number" min="0" step="0.01" value={form.price_from}
                    onChange={e => setForm(f => ({ ...f, price_from: e.target.value }))}
                    placeholder="80" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unidad</label>
                  <select value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}
                    className={inputClass}>
                    {PRICE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Distritos donde atiendes</label>
                <input type="text" value={form.coverage_districts}
                  onChange={e => setForm(f => ({ ...f, coverage_districts: e.target.value }))}
                  placeholder="Miraflores, Surco, San Isidro" className={inputClass} />
                <p className="text-[10px] text-gray-400 mt-1">Sepáralos con comas.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className={labelClass}>Años de experiencia</label>
                  <input type="number" min="0" value={form.years_experience}
                    onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
                    placeholder="5" className={inputClass} />
                </div>
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.works_remote}
                    onChange={e => setForm(f => ({ ...f, works_remote: e.target.checked }))}
                    className="rounded border-gray-300 text-[#D92D20] focus:ring-[#D92D20]" />
                  <span className="text-xs text-[#6B7280]">También a distancia</span>
                </label>
              </div>

              <button type="button" disabled={!valid || saving} onClick={handleSave}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#D92D20] text-white text-sm font-bold hover:bg-[#B42318] transition-colors disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editing ? "Guardar cambios" : "Publicar servicio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
