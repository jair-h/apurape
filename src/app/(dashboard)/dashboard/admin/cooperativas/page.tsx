"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Loader2, ChevronLeft, ChevronRight, X, MessageCircle, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface CoopLead {
  id: string;
  nombre_cooperativa: string;
  representante: string;
  num_socios: string;
  whatsapp: string;
  email: string;
  status: "pendiente" | "contactado" | "cerrado";
  notas: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-700" },
  contactado: { label: "Contactado", cls: "bg-blue-100 text-blue-700" },
  cerrado:    { label: "Cerrado / Activado", cls: "bg-[#E1F5EE] text-[#085041]" },
};

const PAGE_SIZE = 20;

/* WhatsApp deep link with a pre-written message */
function waLink(lead: CoopLead) {
  const num = lead.whatsapp.replace(/\D/g, "");
  const who = lead.representante || lead.nombre_cooperativa;
  const msg = `Hola ${who}, vi tu solicitud en MARKARU para el plan cooperativa. Quisiera darte más información sobre las condiciones especiales para tu organización.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export default function AdminCooperativasPage() {
  const [rows, setRows]       = useState<CoopLead[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CoopLead | null>(null);
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState<"all" | "pendiente" | "contactado" | "cerrado">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from("cooperativa_leads").select("*", { count: "exact" });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, count } = await q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setRows((data ?? []) as CoopLead[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (r: CoopLead) => { setSelected(r); setNotes(r.notas ?? ""); };

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("cooperativa_leads").update({ status }).eq("id", id);
    if (selected?.id === id) setSelected((p) => p ? { ...p, status: status as CoopLead["status"] } : p);
    await load();
    setSaving(false);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("cooperativa_leads").update({ notas: notes }).eq("id", selected.id);
    setSelected((p) => p ? { ...p, notas: notes } : p);
    await load();
    setSaving(false);
  };

  const pages = Math.ceil(total / PAGE_SIZE);
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition";

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#085041]">Cooperativas</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">{total} solicitudes de cooperativas y asociaciones.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pendiente", "contactado", "cerrado"] as const).map((f) => (
              <button key={f} type="button"
                onClick={() => { setFilter(f); setPage(0); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? "bg-[#085041] text-white" : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75]"}`}>
                {f === "all" ? "Todas" : STATUS_LABELS[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Building2 className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-[#085041]">Sin solicitudes</p>
              <p className="text-xs text-[#6B7280] mt-1">No hay cooperativas con este filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Cooperativa", "Representante", "Socios", "WhatsApp", "Email", "Fecha", "Estado", "Acciones"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => {
                    const st = STATUS_LABELS[r.status];
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#1E293B] whitespace-nowrap">{r.nombre_cooperativa}</td>
                        <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{r.representante}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{r.num_socios}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{r.whatsapp}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{r.email}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("es")}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a href={waLink(r)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1eb955] transition-all whitespace-nowrap">
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                            <button type="button" onClick={() => openDetail(r)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all whitespace-nowrap">
                              Gestionar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-[#6B7280]">Página {page + 1} de {pages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] disabled:opacity-40">
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail / manage modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-extrabold text-[#085041]">{selected.nombre_cooperativa}</h3>
                <p className="text-xs text-[#6B7280]">{selected.representante} · {selected.num_socios} socios</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B]">{selected.whatsapp}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B] truncate">{selected.email}</span>
                </div>
              </div>

              <a href={waLink(selected)} target="_blank" rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1eb955] transition-all">
                <MessageCircle className="h-4 w-4" /> Escribir por WhatsApp
              </a>

              {/* Status */}
              <div>
                <p className="text-xs font-bold text-[#6B7280] mb-2">Estado</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pendiente", "contactado", "cerrado"] as const).map((s) => {
                    const st = STATUS_LABELS[s];
                    return (
                      <button key={s} type="button"
                        onClick={() => updateStatus(selected.id, s)}
                        disabled={saving || selected.status === s}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                          selected.status === s ? `${st.cls} border-transparent` : "bg-white border-gray-200 text-[#6B7280] hover:border-[#1D9E75]"
                        }`}>
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  placeholder="Añadir notas sobre esta cooperativa..." className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button type="button" onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cerrar</button>
              <button type="button" onClick={saveNotes} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar notas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
