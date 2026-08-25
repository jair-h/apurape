"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, MapPin, ArrowRight, TrendingUp, Package,
  CheckCircle2, DollarSign, Eye, X, MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface Operation {
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
  notes: string | null;
  buyerName?: string;
  sellerName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: "Activa",  color: "bg-[#E1F5EE] text-[#085041]", icon: CheckCircle2 },
  active:    { label: "Activa",  color: "bg-[#E1F5EE] text-[#085041]", icon: CheckCircle2 },
  closed:    { label: "Cerrada", color: "bg-gray-100 text-gray-500",    icon: CheckCircle2 },
  cancelled: { label: "Cerrada", color: "bg-gray-100 text-gray-500",    icon: CheckCircle2 },
};

/* ─── Detail drawer ───────────────────────────────────────── */

function DetailModal({ op, onClose }: { op: Operation; onClose: () => void }) {
  const cfg = STATUS_CONFIG[op.status] ?? STATUS_CONFIG.confirmed;
  const code = op.operation_number
    ? `AGD-${new Date(op.created_at).getFullYear()}-${String(op.operation_number).padStart(3, "0")}`
    : op.id.slice(0, 8).toUpperCase();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-extrabold text-[#085041]">{code}</h3>
            <p className="text-xs text-[#6B7280]">
              {op.product ?? "—"} · {op.origin_port ?? "—"} → {op.destination_country ?? "—"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: "Valor total",  value: op.total_value_usd ? `USD ${op.total_value_usd.toLocaleString()}` : "—" },
              { label: "Incoterm",     value: op.incoterm ?? "—" },
              { label: "Entrega",      value: op.delivery_date ? fmt(op.delivery_date) : "—" },
              { label: "Creada",       value: fmt(op.created_at) },
            ].map((d) => (
              <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-0.5">{d.label}</p>
                <p className="font-semibold text-[#1E293B]">{d.value}</p>
              </div>
            ))}
          </div>

          {(op.buyerName || op.sellerName) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Partes</p>
              {op.sellerName && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-[10px] font-bold text-[#085041]">
                    {op.sellerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">{op.sellerName}</p>
                    <p className="text-[10px] text-[#6B7280]">Vendedor</p>
                  </div>
                </div>
              )}
              {op.buyerName && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-[10px] font-bold text-[#085041]">
                    {op.buyerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">{op.buyerName}</p>
                    <p className="text-[10px] text-[#6B7280]">Comprador</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {op.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-800 mb-0.5">Notas</p>
              <p className="text-xs text-amber-700 leading-relaxed">{op.notes}</p>
            </div>
          )}

          <Link href={`/dashboard/operacion/${op.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors">
            <TrendingUp className="h-4 w-4" /> Ver seguimiento completo
          </Link>
          <Link href="/dashboard/mensajes"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-[#085041] text-xs font-bold hover:bg-[#E1F5EE] transition-colors">
            <MessageCircle className="h-4 w-4" /> Ir a mensajes
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ForwarderOperacionesPage() {
  const [ops, setOps]         = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [filter, setFilter]   = useState<"todas" | "confirmed" | "closed">("todas");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: opsData, error } = await supabase
        .from("operations")
        .select("id, operation_number, type, product, origin_port, destination_country, status, total_value_usd, fee_amount_usd, fee_paid, incoterm, delivery_date, created_at, buyer_id, seller_id, notes")
        .eq("forwarder_id", user.id)
        .order("created_at", { ascending: false });

      if (error) { console.error("[forwarder/operaciones]", error); setLoading(false); return; }

      const rawOps = opsData ?? [];
      const ids = [...new Set([
        ...rawOps.map((o) => o.buyer_id),
        ...rawOps.map((o) => o.seller_id),
      ].filter(Boolean) as string[])];

      const nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name")
          .in("user_id", ids);
        for (const p of (profiles ?? [])) {
          nameMap[p.user_id] = (p.business_name as string | null) ?? (p.name as string | null) ?? "—";
        }
      }

      setOps(rawOps.map((o) => ({
        ...o,
        buyerName:  o.buyer_id  ? nameMap[o.buyer_id]  : undefined,
        sellerName: o.seller_id ? nameMap[o.seller_id] : undefined,
      })));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "todas") return ops;
    const uiMap: Record<string, string> = { confirmed: "confirmed", active: "confirmed", closed: "closed", cancelled: "closed" };
    return ops.filter((o) => (uiMap[o.status] ?? "confirmed") === filter);
  }, [ops, filter]);

  const activeCount = ops.filter((o) => o.status === "confirmed" || o.status === "active").length;
  const closedCount = ops.filter((o) => o.status === "closed"    || o.status === "cancelled").length;

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
          <h1 className="text-2xl font-extrabold text-[#085041]">Mis operaciones</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Operaciones logísticas donde participas como forwarder.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Activas",  value: activeCount, cls: "text-[#085041]" },
            { label: "Cerradas", value: closedCount, cls: "text-[#6B7280]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {([
            { key: "todas",     label: `Todas (${ops.length})` },
            { key: "confirmed", label: `Activas (${activeCount})` },
            { key: "closed",    label: `Cerradas (${closedCount})` },
          ] as const).map((t) => (
            <button key={t.key} type="button" onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === t.key
                  ? "bg-[#085041] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Empty */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <TrendingUp className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#085041] mb-1">
              {ops.length === 0 ? "Sin operaciones aún" : "Sin operaciones en este filtro"}
            </h3>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto">
              {ops.length === 0
                ? "Cuando el solicitante confirme una de tus cotizaciones, aparecerá aquí."
                : "Prueba con otro filtro."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {filtered.map((op) => {
              const cfg  = STATUS_CONFIG[op.status] ?? STATUS_CONFIG.confirmed;
              const Icon = cfg.icon;
              const code = op.operation_number
                ? `AGD-${new Date(op.created_at).getFullYear()}-${String(op.operation_number).padStart(3, "0")}`
                : op.id.slice(0, 8).toUpperCase();
              return (
                <div key={op.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 flex-wrap hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-[#085041]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-extrabold text-[#085041]">{code}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} inline-flex items-center gap-1`}>
                        <Icon className="h-2.5 w-2.5" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#1E293B]">{op.product ?? "—"}</p>
                    <div className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-0.5">
                      <MapPin className="h-3 w-3 text-[#1D9E75]" />
                      {op.origin_port ?? "—"} <ArrowRight className="h-3 w-3" /> {op.destination_country ?? "—"}
                    </div>
                    {(op.sellerName || op.buyerName) && (
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {[op.sellerName, op.buyerName].filter(Boolean).join(" → ")}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {op.total_value_usd != null && (
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <DollarSign className="h-3.5 w-3.5 text-[#1D9E75]" />
                        <span className="text-sm font-extrabold text-[#1D9E75]">USD {op.total_value_usd.toLocaleString()}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-[#6B7280]">
                      {new Date(op.created_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "2-digit" })}
                    </p>
                    <button type="button"
                      onClick={() => setSelected(op)}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#085041] border border-gray-200 hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-all bg-white">
                      <Eye className="h-3 w-3" /> Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <DetailModal op={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

