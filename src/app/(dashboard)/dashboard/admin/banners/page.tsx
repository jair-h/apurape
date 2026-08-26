"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Loader2, Image, ToggleLeft, ToggleRight, GripVertical, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  active: boolean;
  order_num: number;
  created_at: string;
}

const EMPTY: Omit<Banner, "id" | "created_at"> = {
  title: "", subtitle: null, image_url: "", link_url: "", button_text: "", active: true, order_num: 1,
};

/* ─── Live preview of how banner looks as hero ─────────────── */
function BannerPreview({ form }: { form: Omit<Banner, "id" | "created_at"> }) {
  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vista previa (hero)</p>
      <div className="relative rounded-2xl overflow-hidden bg-[#B42318] min-h-[200px] flex items-center justify-center">
        {form.image_url ? (
          <>
            <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#B42318] to-[#D92D20]" />
        )}
        <div className="relative z-10 text-center px-6 py-8">
          {form.title ? (
            <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow-lg">
              {form.title}
            </h2>
          ) : (
            <p className="text-base text-white/40 italic">Título del banner</p>
          )}
          {form.subtitle && (
            <p className="text-sm text-white/85 mt-2 drop-shadow">{form.subtitle}</p>
          )}
          {form.link_url && form.button_text && (
            <span className="inline-flex items-center gap-1.5 mt-4 bg-white text-[#B42318] px-5 py-2 rounded-xl text-xs font-bold shadow-lg">
              {form.button_text} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Banner form modal ─────────────────────────────────────── */
function BannerForm({ banner, onSave, onClose, saving }: {
  banner: Partial<Banner>; onSave: (data: Partial<Banner>) => void;
  onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState({ ...EMPTY, ...banner });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-[#D92D20] focus:ring-2 focus:ring-[#D92D20]/20 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-extrabold text-[#B42318]">{banner.id ? "Editar banner" : "Nuevo banner"}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Título del banner" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtítulo (opcional)</label>
            <input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value || null)} placeholder="Una descripción breve..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Imagen *</label>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => set("image_url", url)}
              inputClassName={inputCls}
              folder="banners"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link (opcional)</label>
            <input value={form.link_url ?? ""} onChange={(e) => set("link_url", e.target.value || null)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Texto del botón (opcional)</label>
            <input value={form.button_text ?? ""} onChange={(e) => set("button_text", e.target.value || null)} placeholder="Ver más" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Orden (1–5)</label>
              <input type="number" min={1} max={5} value={form.order_num}
                onChange={(e) => set("order_num", Number(e.target.value))} className={inputCls} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => set("active", !form.active)}>
                  {form.active
                    ? <ToggleRight className="h-8 w-8 text-[#D92D20]" />
                    : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                </button>
                <span className="text-xs font-semibold text-gray-700">{form.active ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
          </div>

          {/* Live preview */}
          <BannerPreview form={form} />
        </div>
        <div className="flex gap-2 px-5 pb-5 sticky bottom-0 bg-white border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cancelar</button>
          <button type="button" onClick={() => onSave(form)} disabled={saving || !form.title || !form.image_url}
            className="flex-1 py-2.5 rounded-xl bg-[#B42318] text-white text-xs font-bold hover:bg-[#D92D20] disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar banner
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function AdminBannersPage() {
  const [banners, setBanners]       = useState<Banner[]>([]);
  const [loading, setLoading]       = useState(true);
  const [formBanner, setFormBanner] = useState<Partial<Banner> | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("banners").select("*").order("order_num");
    setBanners(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const handleSave = async (data: Partial<Banner>) => {
    setSaving(true);
    const supabase = createClient();
    if (data.id) {
      await supabase.from("banners").update(data).eq("id", data.id);
    } else {
      await supabase.from("banners").insert(data);
    }
    await loadBanners();
    setSaving(false);
    setFormBanner(null);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("banners").delete().eq("id", id);
    await loadBanners();
    setDeleteId(null);
  };

  const toggleActive = async (b: Banner) => {
    const supabase = createClient();
    await supabase.from("banners").update({ active: !b.active }).eq("id", b.id);
    setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, active: !b.active } : x));
  };

  if (loading) return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#B42318]">Banners</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Hasta 5 banners activos se muestran como carrusel en la landing.</p>
          </div>
          <button type="button" onClick={() => setFormBanner({})}
            disabled={banners.length >= 5}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D92D20] text-white text-sm font-bold hover:bg-[#B42318] disabled:opacity-50 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Nuevo banner
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Image className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-[#B42318] mb-1">Sin banners</p>
            <p className="text-sm text-[#6B7280] mb-6">Crea el primer banner para mostrarlo como hero en la landing.</p>
            <button type="button" onClick={() => setFormBanner({})}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D92D20] text-white text-sm font-bold hover:bg-[#B42318] transition-colors">
              <Plus className="h-4 w-4" /> Crear banner
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4 flex-wrap">
                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <div className="w-8 h-8 rounded-lg bg-[#FEF3F2] flex items-center justify-center text-xs font-bold text-[#B42318] flex-shrink-0">
                  {b.order_num}
                </div>
                {b.image_url && (
                  <img src={b.image_url} alt="" className="h-14 w-20 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1E293B] truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-gray-500 truncate">{b.subtitle}</p>}
                  {b.link_url && <p className="text-xs text-[#6B7280] truncate">{b.link_url}</p>}
                  {b.button_text && <p className="text-xs text-[#D92D20] font-medium">Botón: "{b.button_text}"</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => toggleActive(b)}
                    className="p-1.5" title={b.active ? "Desactivar" : "Activar"}>
                    {b.active
                      ? <ToggleRight className="h-6 w-6 text-[#D92D20]" />
                      : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.active ? "bg-[#FEF3F2] text-[#B42318]" : "bg-gray-100 text-gray-500"}`}>
                    {b.active ? "Activo" : "Inactivo"}
                  </span>
                  <button type="button" onClick={() => setFormBanner(b)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-[#D92D20] hover:text-[#D92D20] transition-all">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteId(b.id)}
                    className="p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formBanner !== null && (
        <BannerForm banner={formBanner} onSave={handleSave} onClose={() => setFormBanner(null)} saving={saving} />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-extrabold text-red-600 mb-2">Eliminar banner</h3>
            <p className="text-sm text-[#6B7280] mb-5">¿Eliminar este banner? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cancelar</button>
              <button type="button" onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
