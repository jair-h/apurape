"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, X, MessageSquare, Phone, Mail, IdCard } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Reclamacion {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  telefono: string | null;
  tipo: "reclamo" | "queja";
  descripcion: string;
  solicitud: string;
  status: "pendiente" | "en_revision" | "resuelto";
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pendiente:   { label: "Pendiente",   cls: "bg-amber-100 text-amber-700" },
  en_revision: { label: "En revisión", cls: "bg-blue-100 text-blue-700" },
  resuelto:    { label: "Resuelto",    cls: "bg-[#E1F5EE] text-[#085041]" },
};

const TIPO_LABELS: Record<string, { label: string; cls: string }> = {
  reclamo: { label: "Reclamo", cls: "bg-red-100 text-red-700" },
  queja:   { label: "Queja",   cls: "bg-amber-100 text-amber-700" },
};

const PAGE_SIZE = 20;

export default function AdminReclamacionesPage() {
  const [rows, setRows]       = useState<Reclamacion[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reclamacion | null>(null);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState<"all" | "pendiente" | "en_revision" | "resuelto">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from("reclamaciones").select("*", { count: "exact" });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, count } = await q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setRows((data ?? []) as Reclamacion[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("reclamaciones").update({ status }).eq("id", id);
    if (selected?.id === id) setSelected((p) => p ? { ...p, status: status as Reclamacion["status"] } : p);
    await load();
    setSaving(false);
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#085041]">Reclamaciones</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">{total} reclamos y quejas del Libro de Reclamaciones.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pendiente", "en_revision", "resuelto"] as const).map((f) => (
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
              <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-[#085041]">Sin reclamaciones</p>
              <p className="text-xs text-[#6B7280] mt-1">No hay reclamaciones con este filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Ticket", "Nombre", "Tipo", "Email", "Estado", "Fecha", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => {
                    const st = STATUS_LABELS[r.status];
                    const tp = TIPO_LABELS[r.tipo];
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap">{r.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 font-medium text-[#1E293B] whitespace-nowrap">{r.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tp?.cls ?? "bg-gray-100 text-gray-600"}`}>{tp?.label ?? r.tipo}</span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{r.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("es")}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelected(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all">
                            <MessageSquare className="h-3.5 w-3.5" /> Ver
                          </button>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#085041]">{selected.nombre}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_LABELS[selected.tipo]?.cls}`}>{TIPO_LABELS[selected.tipo]?.label}</span>
                </div>
                <p className="text-xs text-[#6B7280] font-mono">Ticket {selected.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B]">{selected.dni}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B] truncate">{selected.email}</span>
                </div>
                {selected.telefono && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                    <span className="text-sm text-[#1E293B]">{selected.telefono}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-[#6B7280] mb-1">Descripción del problema</p>
                <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{selected.descripcion}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-[#6B7280] mb-1">Solicitud del consumidor</p>
                <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{selected.solicitud}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-bold text-[#6B7280] mb-2">Estado</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pendiente", "en_revision", "resuelto"] as const).map((s) => {
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
            </div>
            <div className="px-5 pb-5">
              <button type="button" onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280]">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
