"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, MapPin, ArrowRight, Search,
  AlertTriangle, CheckCircle2,
  Eye, X, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

type UiStatus    = "activa" | "cerrada" | "disputa";
type StatusFilter = "todas" | UiStatus;
type TypeFilter   = "todas" | "commercial" | "logistics";

interface AdminOperation {
  id: string;
  operation_number: number | null;
  type: string;
  product: string | null;
  origin_port: string | null;
  destination_country: string | null;
  status: string;
  total_value_usd: number | null;
  fee_amount_usd: number | null;
  fee_paid: boolean;
  incoterm: string | null;
  delivery_date: string | null;
  created_at: string;
  buyer_id: string | null;
  seller_id: string | null;
  forwarder_id: string | null;
  notes: string | null;
  buyerName?: string;
  sellerName?: string;
  forwarderName?: string;
}

const DB_TO_UI: Record<string, UiStatus> = {
  confirmed: "activa",
  active:    "activa",
  closed:    "cerrada",
  cancelled: "cerrada",
  disputed:  "disputa",
};

const TYPE_LABELS: Record<string, string> = {
  commercial: "Exportación",
  logistics:  "Logística",
};

const STATUS_CONFIG: Record<UiStatus, { label: string; color: string; icon: React.ElementType }> = {
  activa:  { label: "Activa",   color: "bg-[#E1F5EE] text-[#085041]", icon: CheckCircle2 },
  cerrada: { label: "Cerrada",  color: "bg-gray-100 text-gray-500",    icon: CheckCircle2 },
  disputa: { label: "Disputa",  color: "bg-red-100 text-red-600",      icon: AlertTriangle },
};

/* ─── Detail modal ────────────────────────────────────────── */

function DetailModal({ op, onClose }: { op: AdminOperation; onClose: () => void }) {
  const uiStatus = DB_TO_UI[op.status] ?? "activa";
  const cfg = STATUS_CONFIG[uiStatus];
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

  const participants = [
    op.sellerName    && { role: "Vendedor",  name: op.sellerName },
    op.buyerName     && { role: "Comprador", name: op.buyerName },
    op.forwarderName && { role: "Forwarder", name: op.forwarderName },
  ].filter(Boolean) as { role: string; name: string }[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-extrabold text-[#085041]">
              {op.operation_number ? `AGD-${new Date(op.created_at).getFullYear()}-${String(op.operation_number).padStart(3, "0")}` : op.id.slice(0, 8).toUpperCase()}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {op.product ?? "—"} · {op.origin_port ?? "—"} → {op.destination_country ?? "—"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${op.type === "commercial" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
              {TYPE_LABELS[op.type] ?? op.type}
            </span>
          </div>

          {participants.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-3">Participantes</p>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.role} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-xs font-extrabold text-[#085041] flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1E293B]">{p.name}</p>
                      <p className="text-[10px] text-[#6B7280]">{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {op.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 mb-1">Notas</p>
              <p className="text-xs text-amber-700 leading-relaxed">{op.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: "Tipo",          value: TYPE_LABELS[op.type] ?? op.type },
              { label: "Valor total",   value: op.total_value_usd ? `USD ${op.total_value_usd.toLocaleString()}` : "—" },
              { label: "Fee MARKARU", value: op.fee_amount_usd ? `USD ${op.fee_amount_usd}` : "—" },
              { label: "Fee cobrado",   value: op.fee_paid ? "Sí" : "No" },
              { label: "Incoterm",      value: op.incoterm ?? "—" },
              { label: "Entrega",       value: op.delivery_date ? fmtDate(op.delivery_date) : "—" },
              { label: "Creada",        value: fmtDate(op.created_at) },
            ].map((d) => (
              <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-0.5">{d.label}</p>
                <p className="font-semibold text-[#1E293B]">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button type="button" onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function AdminOperacionesPage() {
  const [ops, setOps]                   = useState<AdminOperation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>("todas");
  const [selectedOp, setSelectedOp]     = useState<AdminOperation | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: opsData, error } = await supabase
        .from("operations")
        .select("id, operation_number, type, product, origin_port, destination_country, status, total_value_usd, fee_amount_usd, fee_paid, incoterm, delivery_date, created_at, buyer_id, seller_id, forwarder_id, notes")
        .order("created_at", { ascending: false });

      if (error) { console.error("[operations]", error); setLoading(false); return; }

      const rawOps = opsData ?? [];
      const allIds = [...new Set([
        ...rawOps.map((o) => o.buyer_id),
        ...rawOps.map((o) => o.seller_id),
        ...rawOps.map((o) => o.forwarder_id),
      ].filter(Boolean) as string[])];

      const profileMap: Record<string, string> = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name")
          .in("user_id", allIds);
        for (const p of (profiles ?? [])) {
          profileMap[p.user_id] = (p.business_name as string | null) ?? (p.name as string | null) ?? "—";
        }
      }

      setOps(rawOps.map((o) => ({
        ...o,
        buyerName:     o.buyer_id     ? profileMap[o.buyer_id]     : undefined,
        sellerName:    o.seller_id    ? profileMap[o.seller_id]    : undefined,
        forwarderName: o.forwarder_id ? profileMap[o.forwarder_id] : undefined,
      })));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ops.filter((o) => {
      const uiStatus = DB_TO_UI[o.status] ?? "activa";
      const matchSearch = !search ||
        (o.product ?? "").toLowerCase().includes(q) ||
        (o.origin_port ?? "").toLowerCase().includes(q) ||
        (o.destination_country ?? "").toLowerCase().includes(q) ||
        (o.buyerName ?? "").toLowerCase().includes(q) ||
        (o.sellerName ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "todas" || uiStatus === statusFilter;
      const matchType   = typeFilter === "todas"   || o.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [ops, search, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    const uiOps = ops.map((o) => DB_TO_UI[o.status] ?? "activa");
    return {
      todas:   ops.length,
      activa:  uiOps.filter((s) => s === "activa").length,
      cerrada: uiOps.filter((s) => s === "cerrada").length,
      disputa: uiOps.filter((s) => s === "disputa").length,
    };
  }, [ops]);

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "todas",   label: "Todas" },
    { key: "activa",  label: "Activas" },
    { key: "cerrada", label: "Cerradas" },
    { key: "disputa", label: "Disputas" },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Operaciones</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Todas las operaciones activas, cerradas y en disputa.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total",    value: counts.todas,   cls: "text-[#085041]" },
            { label: "Activas",  value: counts.activa,  cls: "text-[#1D9E75]" },
            { label: "Cerradas", value: counts.cerrada, cls: "text-[#6B7280]" },
            { label: "Disputas", value: counts.disputa, cls: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
              {s.label === "Disputas" && counts.disputa > 0 && (
                <div className="flex justify-center mt-1">
                  <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">Requiere atención</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por producto, ruta, participante..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs placeholder:text-gray-400 focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-[#1E293B] focus:outline-none focus:border-[#1D9E75] transition-all">
              <option value="todas">Todos los tipos</option>
              <option value="commercial">Exportación</option>
              <option value="logistics">Logística</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setStatusFilter(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  statusFilter === t.key
                    ? "bg-[#085041] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-[#6B7280]"}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden pb-6">
          <div className="grid grid-cols-[1.5fr_1fr_2fr_1fr_1fr_auto] px-4 py-3 bg-gray-50 border-b border-gray-100 gap-3">
            {["Tipo", "Producto", "Ruta / Participantes", "Estado", "Creada", ""].map((h) => (
              <div key={h} className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#085041]">Sin operaciones</p>
            </div>
          ) : (
            filtered.map((op) => {
              const uiStatus = DB_TO_UI[op.status] ?? "activa";
              const cfg = STATUS_CONFIG[uiStatus];
              const StatusIcon = cfg.icon;
              const code = op.operation_number
                ? `AGD-${new Date(op.created_at).getFullYear()}-${String(op.operation_number).padStart(3, "0")}`
                : op.id.slice(0, 8).toUpperCase();
              return (
                <div key={op.id}
                  className={`grid grid-cols-[1.5fr_1fr_2fr_1fr_1fr_auto] px-4 py-3.5 gap-3 items-center text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    uiStatus === "disputa" ? "bg-red-50/30" : ""
                  }`}>
                  <div>
                    <p className="font-bold text-[#085041] truncate">{code}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${op.type === "commercial" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {TYPE_LABELS[op.type] ?? op.type}
                    </span>
                  </div>
                  <div className="font-semibold text-[#1E293B] truncate">{op.product ?? "—"}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[10px] text-[#6B7280] mb-0.5">
                      <MapPin className="h-2.5 w-2.5 text-[#1D9E75]" />
                      {op.origin_port ?? "—"} <ArrowRight className="h-2.5 w-2.5" /> {op.destination_country ?? "—"}
                    </div>
                    {(op.buyerName || op.sellerName) && (
                      <p className="text-[10px] text-[#6B7280] truncate">
                        {[op.sellerName, op.buyerName].filter(Boolean).join(" → ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                      <StatusIcon className="h-2.5 w-2.5" /> {cfg.label}
                    </span>
                  </div>
                  <div className="text-[#6B7280]">
                    {new Date(op.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "2-digit" })}
                  </div>
                  <div>
                    <button type="button" onClick={() => setSelectedOp(op)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#085041] border border-gray-200 hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-all bg-white">
                      <Eye className="h-3 w-3" /> Ver
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedOp && <DetailModal op={selectedOp} onClose={() => setSelectedOp(null)} />}
    </>
  );
}

