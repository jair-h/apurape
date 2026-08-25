"use client";

/* Solicitudes del Cliente. Reemplaza a /dashboard/comprador/solicitudes. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Plus, ClipboardList, MapPin, Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface RequestRow {
  id: string; category_id: string; title: string; description: string;
  budget_min: number | null; budget_max: number | null;
  region: string | null; district: string | null;
  needed_at: string | null; urgency: string; status: string;
  quotes_count: number; created_at: string; expires_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  abierta:    { label: "Abierta",     cls: "bg-teal-50 text-[#0E9384] border-teal-200" },
  en_proceso: { label: "En proceso",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cerrada:    { label: "Cerrada",     cls: "bg-gray-100 text-gray-600 border-gray-200" },
  vencida:    { label: "Vencida",     cls: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelada:  { label: "Cancelada",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function ClienteSolicitudesPage() {
  const supabase = createClient();

  const [requests, setRequests]   = useState<RequestRow[]>([]);
  const [categories, setCats]     = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [processing, setProc]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: reqs }, { data: cats }] = await Promise.all([
        supabase.from("service_requests").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
        supabase.from("service_categories").select("id, name"),
      ]);

      setRequests((reqs as RequestRow[]) ?? []);
      setCats(Object.fromEntries((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name])));
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = async (r: RequestRow) => {
    if (!confirm(`¿Cerrar "${r.title}"? Dejará de recibir cotizaciones.`)) return;
    setProc(r.id);
    const { error } = await supabase.from("service_requests")
      .update({ status: "cerrada", closed_at: new Date().toISOString() }).eq("id", r.id);
    if (!error) setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "cerrada" } : x));
    setProc(null);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mis solicitudes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Lo que pediste y cuántas cotizaciones recibió.</p>
        </div>
        <Link href="/dashboard/cliente/solicitud/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E9384] text-white text-sm font-bold hover:bg-[#0B7268] transition-colors flex-shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva solicitud</span>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">Todavía no publicaste ninguna solicitud</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Cuenta qué necesitas y deja que los proveedores de tu zona te coticen.
            Es gratis y sin límite.
          </p>
          <Link href="/dashboard/cliente/solicitud/nueva"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors">
            Publicar la primera
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const st = STATUS[r.status] ?? STATUS.abierta;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{r.title}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{categories[r.category_id] ?? "—"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2 mb-3">{r.description}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#6B7280] mb-3">
                  <span className="font-bold text-[#0E9384]">
                    {r.quotes_count} {r.quotes_count === 1 ? "cotización recibida" : "cotizaciones recibidas"}
                  </span>
                  {(r.district || r.region) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[r.district, r.region].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {r.status === "abierta" && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> vence el {new Date(r.expires_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Link href="/dashboard/mensajes"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#0E9384] hover:text-[#0E9384] transition-colors">
                    Ver cotizaciones en el chat
                  </Link>
                  {(r.status === "abierta" || r.status === "en_proceso") && (
                    <button type="button" onClick={() => close(r)} disabled={processing === r.id}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
                      {processing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Cerrar
                    </button>
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
