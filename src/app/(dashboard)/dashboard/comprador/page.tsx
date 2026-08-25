"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Plus, MessageCircle, Package, Users,
  Inbox, Loader2, Globe, Calendar, ChevronRight, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface Solicitud {
  id: string;
  product: string;
  volume_tm: number;
  destination_country: string | null;
  delivery_date: string | null;
  status: string;
  created_at: string;
  responses_count: number | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Hace menos de 1h";
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Hace 1 día" : `Hace ${d} días`;
}

/* ─── MetricCard ──────────────────────────────────────────── */

function MetricCard({
  icon: Icon, label, value, sub, accent, onClick,
}: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; accent?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all hover:shadow-md ${
        accent ? "border-[#1D9E75]/30 hover:border-[#1D9E75]" : "border-gray-200 hover:border-gray-300"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        accent ? "bg-[#E1F5EE]" : "bg-gray-100"
      }`}>
        <Icon className={`h-5 w-5 ${accent ? "text-[#1D9E75]" : "text-[#6B7280]"}`} />
      </div>
      <div>
        <p className={`text-2xl font-extrabold ${accent ? "text-[#085041]" : "text-[#1E293B]"}`}>{value}</p>
        <p className="text-xs font-semibold text-[#6B7280] mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function CompradorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [totalOfertas, setTotalOfertas] = useState(0);
  const [opsActivas, setOpsActivas] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [profileRes, rfqRes, opsRes] = await Promise.all([
        supabase.from("profiles").select("name, business_name").eq("user_id", user.id).single(),
        supabase.from("rfq_commercial")
          .select("id, product, volume_tm, destination_country, delivery_date, status, created_at, responses_count")
          .eq("exporter_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("operations")
          .select("id", { count: "exact", head: true })
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .neq("status", "closed"),
      ]);

      setUserName(profileRes.data?.business_name || profileRes.data?.name || "");
      setOpsActivas(opsRes.count ?? 0);

      const myRfqs = rfqRes.data ?? [];
      setSolicitudes(myRfqs);

      const rfqIds = myRfqs.map((r) => r.id);
      if (rfqIds.length > 0) {
        const { count } = await supabase
          .from("rfq_responses")
          .select("id", { count: "exact", head: true })
          .in("rfq_id", rfqIds);
        setTotalOfertas(count ?? 0);
      }

      setLoading(false);
    }
    load();
  }, []);

  const activas = solicitudes.filter((s) => s.status === "open").length;
  const recent  = solicitudes.slice(0, 3);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">
            {userName ? `Hola, ${userName.split(" ")[0]} 👋` : "Bienvenido"}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Panel de comprador — gestiona tus solicitudes y ofertas.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/comprador/solicitud/nueva")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Publicar solicitud
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={ClipboardList} label="Solicitudes activas"
          value={activas} accent={activas > 0}
          onClick={() => router.push("/dashboard/comprador/solicitudes")}
        />
        <MetricCard
          icon={TrendingUp} label="Ofertas recibidas"
          value={totalOfertas} accent={totalOfertas > 0}
          sub={totalOfertas === 0 ? "Publica una solicitud" : undefined}
          onClick={() => router.push("/dashboard/comprador/solicitudes")}
        />
        <MetricCard
          icon={TrendingUp} label="Operaciones activas"
          value={opsActivas} accent={opsActivas > 0}
          onClick={() => router.push("/dashboard/comprador/operaciones")}
        />
        <MetricCard
          icon={MessageCircle} label="Mensajes"
          value="—"
          onClick={() => router.push("/dashboard/mensajes")}
        />
        <MetricCard
          icon={Users} label="Proveedores guardados"
          value={0}
          sub="Próximamente"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/comprador/solicitud/nueva")}
          className="bg-[#085041] rounded-2xl p-6 text-left hover:bg-[#1D9E75] transition-colors shadow-sm group">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <p className="text-base font-extrabold text-white">Publicar solicitud de compra</p>
          <p className="text-xs text-white/70 mt-1">Define lo que buscas y recibe ofertas de productores certificados.</p>
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard/mensajes")}
          className="bg-white rounded-2xl border border-gray-200 p-6 text-left hover:border-[#1D9E75] hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center mb-4">
            <Package className="h-5 w-5 text-[#1D9E75]" />
          </div>
          <p className="text-base font-extrabold text-[#085041]">Explorar catálogo</p>
          <p className="text-xs text-[#6B7280] mt-1">Navega por los productos disponibles de los exportadores.</p>
          <span className="inline-block mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Próximamente
          </span>
        </button>
      </div>

      {/* Solicitudes recientes */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#085041]">Mis solicitudes recientes</h2>
          {solicitudes.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/dashboard/comprador/solicitudes")}
              className="flex items-center gap-1 text-xs text-[#1D9E75] font-semibold hover:text-[#085041] transition-colors">
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#085041]">Aún no tienes solicitudes publicadas</p>
            <p className="text-xs text-[#6B7280] mt-1 mb-5">Publica tu primera solicitud para recibir ofertas de productores.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/comprador/solicitud/nueva")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors">
              <Plus className="h-4 w-4" /> Publicar mi primera solicitud
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((s) => {
              const statusCfg =
                s.status === "in_progress" ? { label: "En progreso", cls: "bg-[#E1F5EE] text-[#085041]", dot: "bg-[#1D9E75]" }
                : s.status === "closed"     ? { label: "Cerrada",     cls: "bg-gray-100 text-gray-500",     dot: "bg-gray-400" }
                :                             { label: "Abierta",     cls: "bg-blue-50 text-blue-700",       dot: "bg-blue-400" };
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => router.push("/dashboard/comprador/solicitudes")}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl bg-[#085041] flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1E293B] truncate">{s.product}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#6B7280] flex-wrap">
                      <span>{s.volume_tm} TM</span>
                      {s.destination_country && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.destination_country}</span>}
                      {s.delivery_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(s.delivery_date)}</span>}
                      <span>{timeAgo(s.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className={`text-lg font-extrabold ${(s.responses_count ?? 0) > 0 ? "text-[#1D9E75]" : "text-gray-300"}`}>
                      {s.responses_count ?? 0}
                    </p>
                    <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">ofertas</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

