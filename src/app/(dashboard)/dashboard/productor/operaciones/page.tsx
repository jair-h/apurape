"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Inbox, MessageSquare, ArrowRight, ExternalLink, Globe, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

/* ─── Constants ───────────────────────────────────────────── */

const STAGES = [
  { key: "confirmed",     label: "Confirmada" },
  { key: "harvest_ready", label: "Cosecha lista" },
  { key: "inspected",     label: "Inspección de calidad" },
  { key: "packed",        label: "Empaque" },
  { key: "gate_in",       label: "En puerto / Gate-in" },
  { key: "departed",      label: "Embarcado" },
  { key: "in_transit",    label: "En tránsito" },
  { key: "arrived",       label: "Llegada a destino" },
  { key: "closed",        label: "Cerrada" },
];

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  confirmed:     { label: "Confirmada",      cls: "bg-blue-50 text-blue-700",     dot: "bg-blue-400" },
  ready:         { label: "Producto listo",  cls: "bg-amber-50 text-amber-700",   dot: "bg-amber-400" },
  shipped:       { label: "En camino",       cls: "bg-sky-50 text-sky-700",       dot: "bg-sky-400" },
  delivered:     { label: "Entregado",       cls: "bg-[#E1F5EE] text-[#085041]", dot: "bg-[#1D9E75]" },
  harvest_ready: { label: "Cosecha lista",   cls: "bg-amber-50 text-amber-700",   dot: "bg-amber-400" },
  inspected:     { label: "Inspeccionada",   cls: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  packed:        { label: "Empacada",        cls: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  gate_in:       { label: "En puerto",       cls: "bg-purple-50 text-purple-700", dot: "bg-purple-400" },
  departed:      { label: "Embarcado",       cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400" },
  in_transit:    { label: "En tránsito",     cls: "bg-sky-50 text-sky-700",       dot: "bg-sky-400" },
  arrived:       { label: "Llegó a destino", cls: "bg-[#E1F5EE] text-[#085041]", dot: "bg-[#1D9E75]" },
  closed:        { label: "Cerrada",         cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  disputed:      { label: "En disputa",      cls: "bg-red-50 text-red-700",       dot: "bg-red-400" },
};

/* ─── Types ───────────────────────────────────────────────── */

interface Operation {
  id: string;
  operation_number: number;
  product: string;
  variety: string | null;
  volume_tm: number;
  unit: string;
  agreed_price_usd: number;
  price_unit: string | null;
  total_value_usd: number | null;
  incoterm: string | null;
  trade_type: string | null;
  currency: string | null;
  delivery_date: string | null;
  destination_country: string | null;
  status: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  other_name: string;
  other_id: string;
}

type Filter = "activas" | "cerradas" | "todas";

/* ─── Helpers ─────────────────────────────────────────────── */

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtUSD(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function stageProgress(status: string) {
  const idx = STAGES.findIndex(s => s.key === status);
  if (idx < 0) return 0;
  return Math.round((idx / (STAGES.length - 1)) * 100);
}

/* ─── Operation card ──────────────────────────────────────── */

function OpCard({ op, userId, router }: { op: Operation; userId: string; router: ReturnType<typeof useRouter> }) {
  const [chatLoading, setChatLoading] = useState(false);
  const st = STATUS_MAP[op.status] ?? STATUS_MAP.confirmed;
  const progress = stageProgress(op.status);
  const isNacional = op.currency === "PEN" || (!op.currency && op.trade_type === "nacional");

  const handleChat = async () => {
    setChatLoading(true);
    const convId = await findOrCreateConversation(userId, op.other_id);
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${op.status === "closed" ? "opacity-80 border-gray-200" : "border-gray-200"}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-[#6B7280]">#{op.operation_number}</span>
            <h3 className="text-sm font-extrabold text-[#085041]">
              {op.product}{op.variety ? ` — ${op.variety}` : ""}
            </h3>
          </div>
          <p className="text-xs text-[#6B7280]">Comprador: <span className="font-semibold text-[#1E293B]">{op.other_name}</span></p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${st.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      <div className="px-5 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Volumen</p>
          <p className="font-bold text-[#1E293B]">{op.volume_tm} {op.unit}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Precio</p>
          <p className="font-bold text-[#1E293B]">{isNacional ? "S/" : "USD"} {op.agreed_price_usd}/{op.price_unit ?? "kg"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Valor total</p>
          <p className="font-bold text-[#085041]">{isNacional ? `S/ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(op.total_value_usd ?? 0)}` : fmtUSD(op.total_value_usd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{isNacional ? "Destino" : "Incoterm"}</p>
          <p className="font-bold text-[#1E293B]">{isNacional ? (op.destination_country ?? "—") : (op.incoterm ?? "—")}</p>
        </div>
      </div>

      <div className="px-5 pb-3 flex items-center gap-4 text-xs text-[#6B7280] flex-wrap">
        {!isNacional && op.destination_country && (
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{op.destination_country}</span>
        )}
        {op.delivery_date && (
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(op.delivery_date)}</span>
        )}
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#6B7280]">Progreso</span>
          <span className="text-[10px] font-bold text-[#1D9E75]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1D9E75] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 flex-wrap">
        <Link href={`/dashboard/operacion/${op.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#085041] px-3 py-1.5 rounded-lg hover:bg-[#1D9E75] transition-colors">
          <ExternalLink className="h-3 w-3" /> Ver detalle
        </Link>
        <button type="button" onClick={handleChat} disabled={chatLoading}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#085041] border border-[#085041] px-3 py-1.5 rounded-lg hover:bg-[#085041] hover:text-white transition-colors disabled:opacity-50">
          {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
          Mensajes
        </button>
        <Link href={`/dashboard/operacion/${op.id}#timeline`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6B7280] border border-gray-200 px-3 py-1.5 rounded-lg hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
          <ArrowRight className="h-3 w-3" /> Ver seguimiento
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ProductorOperacionesPage() {
  const router = useRouter();
  const [userId, setUserId]   = useState<string | null>(null);
  const [ops, setOps]         = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>("activas");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: rows } = await supabase
        .from("operations")
        .select("id, operation_number, product, variety, volume_tm, unit, agreed_price_usd, price_unit, total_value_usd, incoterm, trade_type, currency, delivery_date, destination_country, status, buyer_id, seller_id, created_at")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const list = rows ?? [];
      if (list.length === 0) { setLoading(false); return; }

      const otherIds = [...new Set(list.map(o => o.buyer_id === user.id ? o.seller_id : o.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, name, business_name").in("user_id", otherIds);

      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach(p => { nameMap[p.user_id] = p.business_name || p.name || "Usuario"; });

      setOps(list.map(o => ({
        ...o,
        other_id:   o.buyer_id === user.id ? o.seller_id : o.buyer_id,
        other_name: nameMap[o.buyer_id === user.id ? o.seller_id : o.buyer_id] ?? "Usuario",
      })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" /></div>;
  }

  const activas  = ops.filter(o => o.status !== "closed").length;
  const cerradas = ops.filter(o => o.status === "closed").length;
  const filtered = filter === "activas" ? ops.filter(o => o.status !== "closed")
                 : filter === "cerradas" ? ops.filter(o => o.status === "closed")
                 : ops;

  const FILTER_TABS: { key: Filter; label: string; count: number }[] = [
    { key: "activas",  label: "Activas",  count: activas },
    { key: "cerradas", label: "Cerradas", count: cerradas },
    { key: "todas",    label: "Todas",    count: ops.length },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">Mis operaciones</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Seguimiento completo desde cosecha hasta entrega en destino.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Activas",  value: activas,    cls: "text-[#1D9E75]" },
          { label: "Cerradas", value: cerradas,   cls: "text-[#6B7280]" },
          { label: "Total",    value: ops.length, cls: "text-[#085041]" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm text-center">
            <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {FILTER_TABS.map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filter === f.key ? "bg-[#085041] text-white shadow-sm" : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
            }`}>
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-[#6B7280]"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#085041]">
            {ops.length === 0 ? "Aún no tienes operaciones" : "Sin operaciones en esta categoría"}
          </p>
          {ops.length === 0 && (
            <p className="text-xs text-[#6B7280] mt-1">Las operaciones aparecen cuando un comprador acepta tu oferta.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {userId && filtered.map(op => (
            <OpCard key={op.id} op={op} userId={userId} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

