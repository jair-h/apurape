"use client";

/* Cotizaciones enviadas por el Proveedor, con el consumo del mes.
 * Reemplaza a /dashboard/forwarder/cotizaciones. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ClipboardList, Clock, ArrowRight, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface QuoteRow {
  id: string; conversation_id: string; amount: number; scope: string;
  estimated_days: number | null; valid_until: string | null;
  status: string; job_id: string | null; created_at: string; period: string;
  client: { name: string | null; business_name: string | null } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aceptada:  { label: "Aceptada",  cls: "bg-green-50 text-green-700 border-green-200" },
  rechazada: { label: "Rechazada", cls: "bg-red-50 text-red-700 border-red-200" },
  vencida:   { label: "Vencida",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelada: { label: "Cancelada", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function ProveedorCotizacionesPage() {
  const supabase = createClient();

  const [quotes, setQuotes]   = useState<QuoteRow[]>([]);
  const [left, setLeft]       = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("todas");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: qs }, { data: rest }] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, conversation_id, amount, scope, estimated_days, valid_until, status, job_id, created_at, period, client:profiles!quotes_client_id_fkey(name, business_name)")
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("provider_quotes_left", { p_provider_id: user.id }),
      ]);

      setQuotes((qs as unknown as QuoteRow[]) ?? []);
      setLeft(rest === null || rest === undefined ? null : Number(rest));
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === "todas" ? quotes : quotes.filter(q => q.status === filter);
  const aceptadas = quotes.filter(q => q.status === "aceptada").length;
  const tasa = quotes.length > 0 ? Math.round((aceptadas / quotes.length) * 100) : 0;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Mis cotizaciones</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Todo lo que enviaste y en qué quedó.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xl font-extrabold text-gray-900">{quotes.length}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Enviadas en total</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xl font-extrabold text-[#0E9384]">{tasa}%</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Tasa de aceptación</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xl font-extrabold text-[#D92D20]">
            {left === null ? "Ilimitadas" : left}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            {left === null ? "Con tu plan actual" : "Te quedan este mes"}
          </p>
        </div>
      </div>

      {left !== null && left <= 2 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {left === 0 ? "Te quedaste sin cotizaciones este mes" : `Te quedan ${left}`}
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Con el plan Pro son ilimitadas y entras al concurso mensual de tu categoría.
            </p>
            <Link href="/dashboard/plan"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#D92D20] hover:underline">
              Ver el plan Pro <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {["todas", "pendiente", "aceptada", "rechazada", "vencida"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors capitalize ${filter === f ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">
            {quotes.length === 0 ? "Todavía no enviaste cotizaciones" : "Nada en este filtro"}
          </p>
          {quotes.length === 0 && (
            <Link href="/dashboard/proveedor/solicitudes"
              className="inline-block mt-3 px-4 py-2 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors">
              Ver solicitudes abiertas
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const st = STATUS[q.status] ?? STATUS.pendiente;
            const clientName = q.client?.business_name || q.client?.name || "Cliente";
            return (
              <Link key={q.id} href={`/dashboard/mensajes?conv=${q.conversation_id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-[#D92D20] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-gray-900">
                      S/ {Number(q.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">Para {clientName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2 mb-2">{q.scope}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
                  <span>{new Date(q.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {q.estimated_days != null && <span>· {q.estimated_days} {q.estimated_days === 1 ? "día" : "días"}</span>}
                  {q.valid_until && (
                    <span className="inline-flex items-center gap-1">
                      · <Clock className="h-2.5 w-2.5" /> vence {new Date(q.valid_until).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
