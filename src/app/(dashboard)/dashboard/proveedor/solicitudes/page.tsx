"use client";

/* Solicitudes abiertas de clientes. El Proveedor las mira y abre el chat
 * para cotizar. Reemplaza a /dashboard/exportador/disponibles y
 * /dashboard/productor/rfqs. */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Clock, MessageCircle, ClipboardList, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

interface Category { id: string; slug: string; name: string; }

interface RequestRow {
  id: string; client_id: string; category_id: string;
  title: string; description: string;
  budget_min: number | null; budget_max: number | null;
  region: string | null; district: string | null; is_remote: boolean;
  needed_at: string | null; urgency: string;
  quotes_count: number; created_at: string; expires_at: string;
  profiles: { name: string | null; business_name: string | null } | null;
}

const URGENCY: Record<string, { label: string; cls: string }> = {
  urgente:      { label: "Urgente",      cls: "bg-red-50 text-red-700 border-red-200" },
  esta_semana:  { label: "Esta semana",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  normal:       { label: "Sin apuro",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
  flexible:     { label: "Flexible",     cls: "bg-teal-50 text-[#0E9384] border-teal-200" },
};

function budgetLabel(r: RequestRow): string {
  const f = (n: number) => `S/ ${Number(n).toLocaleString("es-PE")}`;
  if (r.budget_min != null && r.budget_max != null) return `${f(r.budget_min)} – ${f(r.budget_max)}`;
  if (r.budget_max != null) return `Hasta ${f(r.budget_max)}`;
  if (r.budget_min != null) return `Desde ${f(r.budget_min)}`;
  return "Presupuesto abierto";
}

export default function ProveedorSolicitudesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId]         = useState<string | null>(null);
  const [requests, setRequests]     = useState<RequestRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [catFilter, setCatFilter]   = useState("");
  const [query, setQuery]           = useState("");
  const [contacting, setContacting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: reqs }, { data: cats }] = await Promise.all([
        supabase
          .from("service_requests")
          .select("id, client_id, category_id, title, description, budget_min, budget_max, region, district, is_remote, needed_at, urgency, quotes_count, created_at, expires_at, profiles(name, business_name)")
          .eq("status", "abierta")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("service_categories").select("id, slug, name").eq("active", true).order("order_num"),
      ]);

      setRequests((reqs as unknown as RequestRow[]) ?? []);
      setCategories((cats as Category[]) ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContact = async (r: RequestRow) => {
    if (!userId) return;
    setContacting(r.id);
    const convId = await findOrCreateConversation(userId, r.client_id, r.id, "request");
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
    setContacting(null);
  };

  const filtered = requests.filter(r => {
    if (catFilter && r.category_id !== catFilter) return false;
    if (!query.trim()) return true;
    const t = query.toLowerCase();
    return r.title.toLowerCase().includes(t)
      || r.description.toLowerCase().includes(t)
      || (r.district ?? "").toLowerCase().includes(t);
  });

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Solicitudes disponibles</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Clientes que están buscando ahora mismo. Escríbeles y envía tu cotización.
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por texto o distrito…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent" />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => setCatFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${!catFilter ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
          Todas
        </button>
        {categories.map(c => (
          <button key={c.id} type="button" onClick={() => setCatFilter(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${catFilter === c.id ? "bg-[#D92D20] text-white border-[#D92D20]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#D92D20]"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">No hay solicitudes abiertas aquí</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Prueba con otra categoría. Mientras tanto, mantén tus servicios publicados
            para que los clientes te encuentren.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const u = URGENCY[r.urgency] ?? URGENCY.normal;
            const cat = categories.find(c => c.id === r.category_id);
            const clientName = r.profiles?.business_name || r.profiles?.name || "Cliente";

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{r.title}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {cat?.name ?? "—"} · {clientName}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${u.cls}`}>
                    {u.label}
                  </span>
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed mb-3 line-clamp-3">{r.description}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#6B7280] mb-4">
                  <span className="font-bold text-[#D92D20]">{budgetLabel(r)}</span>
                  {(r.district || r.region) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[r.district, r.region].filter(Boolean).join(", ")}
                      {r.is_remote && " · a distancia"}
                    </span>
                  )}
                  {r.needed_at && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Para el {new Date(r.needed_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  <span>{r.quotes_count} {r.quotes_count === 1 ? "cotización" : "cotizaciones"}</span>
                </div>

                <button type="button" onClick={() => handleContact(r)} disabled={contacting === r.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] transition-colors disabled:opacity-50">
                  {contacting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  Contactar y cotizar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
