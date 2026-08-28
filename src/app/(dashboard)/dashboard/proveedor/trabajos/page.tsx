"use client";

/* Trabajos del Proveedor. Reemplaza a las pantallas de operaciones que
 * tenía cada rol de Apurape.
 *
 * Aquí marca "servicio completado", pero eso NO cierra nada: el trabajo
 * queda esperando a que el Cliente confirme. Solo su confirmación suma
 * a la reputación y al concurso. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, Check, MessageCircle, Star, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface JobRow {
  id: string; conversation_id: string | null; title: string;
  amount: number; status: string;
  completed_at: string | null; confirmed_at: string | null; created_at: string;
  client: { name: string | null; business_name: string | null } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  agendado:            { label: "Agendado",               cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente_confirmar: { label: "Esperando confirmación", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmado:          { label: "Confirmado",             cls: "bg-green-50 text-green-700 border-green-200" },
  cancelado:           { label: "Cancelado",              cls: "bg-gray-100 text-gray-600 border-gray-200" },
  disputa:             { label: "En disputa",             cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function ProveedorTrabajosPage() {
  const supabase = createClient();

  const [jobs, setJobs]         = useState<JobRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [processing, setProc]   = useState<string | null>(null);
  const [filter, setFilter]     = useState("todos");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("jobs")
      .select("id, conversation_id, title, amount, status, completed_at, confirmed_at, created_at, client:profiles!jobs_client_id_fkey(name, business_name)")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });
    setJobs((data as unknown as JobRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markCompleted = async (job: JobRow) => {
    setProc(job.id);
    const { error } = await supabase.rpc("mark_job_completed", { p_job_id: job.id });
    if (error) alert(`No se pudo marcar como completado:\n${error.message}`);
    else await load();
    setProc(null);
  };

  const filtered = filter === "todos" ? jobs : jobs.filter(j => j.status === filter);
  const confirmados = jobs.filter(j => j.status === "confirmado");
  const facturado = confirmados.reduce((s, j) => s + Number(j.amount), 0);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Mis trabajos</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Servicios contratados. Marca cuando termines y espera la confirmación del cliente.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xl font-extrabold text-gray-900">{jobs.length}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Trabajos en total</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xl font-extrabold text-[#0E9384]">{confirmados.length}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Confirmados por el cliente</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xl font-extrabold text-[#D92D20]">
            S/ {facturado.toLocaleString("es-PE")}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Facturado y confirmado · 0% comisión</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["todos", "agendado", "pendiente_confirmar", "confirmado"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === f ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
            {f === "todos" ? "Todos" : STATUS[f]?.label ?? f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">
            {jobs.length === 0 ? "Todavía no tienes trabajos" : "Nada en este filtro"}
          </p>
          {jobs.length === 0 && (
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
              Un trabajo aparece aquí cuando un cliente acepta tu cotización.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => {
            const st = STATUS[j.status] ?? STATUS.agendado;
            const clientName = j.client?.business_name || j.client?.name || "Cliente";
            return (
              <div key={j.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{j.title}</p>
                    <p className="text-[11px] text-[#6B7280]">Para {clientName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <p className="text-base font-extrabold text-[#D92D20] mb-2">
                  S/ {Number(j.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>

                {j.confirmed_at && (
                  <p className="text-[11px] text-green-700 inline-flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3 w-3" />
                    Confirmado el {new Date(j.confirmed_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {j.status === "agendado" && (
                    <button type="button" onClick={() => markCompleted(j)} disabled={processing === j.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors disabled:opacity-50">
                      {processing === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Marcar como completado
                    </button>
                  )}

                  {j.status === "pendiente_confirmar" && (
                    <p className="text-[11px] text-[#6B7280] inline-flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-amber-400" />
                      Esperando que {clientName} confirme y califique.
                    </p>
                  )}

                  {j.conversation_id && (
                    <Link href={`/dashboard/mensajes?conv=${j.conversation_id}`}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#D92D20] hover:text-[#D92D20] transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
