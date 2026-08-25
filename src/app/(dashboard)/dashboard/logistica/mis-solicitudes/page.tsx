"use client";

import { useState, useEffect } from "react";
import {
  Loader2, MapPin, ArrowRight, Package, Weight, Calendar,
  Clock, CheckCircle2, DollarSign, Truck, MessageCircle,
  ChevronDown, ChevronUp, AlertCircle, Award,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

/* ─── Types ───────────────────────────────────────────────── */

interface RFQ {
  id: string;
  origin_port: string;
  destination_port: string;
  cargo_type: string;
  product_type: string | null;
  weight_kg: number | null;
  cargo_date: string | null;
  incoterm: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  operation_id: string | null;
}

interface Quote {
  id: string;
  rfq_id: string;
  forwarder_id: string;
  freight_price_usd: number;
  local_charges_usd: number;
  total_price_usd: number;
  carrier: string | null;
  departure_date: string | null;
  transit_days: number | null;
  validity_days: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  forwarderName?: string | null;
  forwarderBusiness?: string | null;
  forwarderPhone?: string | null;
  operationId?: string | null;
  operationNumber?: number | null;
}

const CARGO_LABELS: Record<string, string> = {
  FCL_20: "FCL 20'", FCL_40: "FCL 40'", REEFER_20: "Reefer 20'", REEFER_40: "Reefer 40'",
  LCL: "LCL", AEREO: "Aéreo", TERRESTRE: "Terrestre",
};

const RFQ_STATUS: Record<string, { label: string; cls: string }> = {
  open:      { label: "Abierta",           cls: "bg-blue-50 text-blue-700" },
  quoted:    { label: "Con cotizaciones",  cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmada",        cls: "bg-[#E1F5EE] text-[#085041]" },
  cancelled: { label: "Cancelada",         cls: "bg-gray-100 text-gray-500" },
  expired:   { label: "Expirada",          cls: "bg-gray-100 text-gray-500" },
};

/* ─── Quote card ──────────────────────────────────────────── */

function QuoteCard({
  quote, isBest, rfqStatus, onConfirm, confirming, onChat, chatting,
}: {
  quote: Quote;
  isBest: boolean;
  rfqStatus: string;
  onConfirm: (quoteId: string, forwarderId: string) => Promise<void>;
  confirming: boolean;
  onChat: (forwarderId: string) => Promise<void>;
  chatting: boolean;
}) {
  const canConfirm = rfqStatus === "open" || rfqStatus === "quoted";

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${
      quote.status === "accepted" ? "border-[#1D9E75] ring-1 ring-[#1D9E75]/20" :
      quote.status === "rejected" ? "border-gray-100 opacity-60" :
      isBest ? "border-[#1D9E75]/50 shadow-sm" : "border-gray-200"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {isBest && quote.status === "pending" && (
              <span className="text-[10px] font-bold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="h-3 w-3" /> Mejor precio
              </span>
            )}
            {quote.status === "accepted" && (
              <span className="text-[10px] font-bold bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Confirmada
              </span>
            )}
            {quote.status === "rejected" && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Descartada
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-[#085041]">
            {quote.forwarderBusiness ?? quote.forwarderName ?? "Forwarder verificado"}
          </p>
          {quote.carrier && (
            <p className="text-[11px] text-[#6B7280]">
              {quote.carrier}
              {quote.departure_date && (
                <> · Zarpe: {new Date(quote.departure_date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</>
              )}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-extrabold text-[#085041]">
            USD {quote.total_price_usd.toLocaleString()}
          </p>
          {(quote.freight_price_usd > 0 || quote.local_charges_usd > 0) && (
            <p className="text-[10px] text-[#6B7280]">
              Flete {quote.freight_price_usd.toLocaleString()} + Loc. {quote.local_charges_usd.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex gap-3 flex-wrap text-[11px] text-[#6B7280]">
        {quote.transit_days && <span>{quote.transit_days}d tránsito</span>}
        {quote.validity_days && <span>Válida {quote.validity_days}d</span>}
      </div>

      {quote.notes && (
        <p className="mt-2 text-[11px] text-[#6B7280] leading-relaxed border-t border-gray-100 pt-2">
          {quote.notes}
        </p>
      )}

      {canConfirm && quote.status === "pending" && (
        <button
          type="button"
          onClick={() => onConfirm(quote.id, quote.forwarder_id)}
          disabled={confirming}
          className="mt-3 w-full py-2 rounded-lg bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {confirming
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirmando...</>
            : "Confirmar cotización"}
        </button>
      )}

      {quote.status === "accepted" && quote.operationId && (
        <Link
          href={`/dashboard/operacion/${quote.operationId}`}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ver operación {quote.operationNumber ? `#AGD-${new Date().getFullYear()}-${String(quote.operationNumber).padStart(3, "0")}` : ""}
        </Link>
      )}

      {quote.status !== "rejected" && (
        <button
          type="button"
          onClick={() => onChat(quote.forwarder_id)}
          disabled={chatting}
          className="mt-2 w-full py-2 rounded-lg border border-[#1D9E75] text-[#1D9E75] text-xs font-bold hover:bg-[#E1F5EE] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {chatting
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Abriendo chat...</>
            : <><MessageCircle className="h-3.5 w-3.5" /> Chatear con el forwarder</>}
        </button>
      )}
    </div>
  );
}

/* ─── RFQ Section ─────────────────────────────────────────── */

function RFQSection({
  rfq, quotes, onConfirm, confirming, onChat, chatting,
}: {
  rfq: RFQ;
  quotes: Quote[];
  onConfirm: (rfqId: string, quoteId: string, forwarderId: string) => Promise<void>;
  confirming: string | null;
  onChat: (forwarderId: string) => Promise<void>;
  chatting: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const pending  = quotes.filter((q) => q.status === "pending");
  const sorted   = [...quotes].sort((a, b) => a.total_price_usd - b.total_price_usd);
  const bestId   = pending.length > 0
    ? [...pending].sort((a, b) => a.total_price_usd - b.total_price_usd)[0].id
    : null;

  const st = RFQ_STATUS[rfq.status] ?? { label: rfq.status, cls: "bg-gray-100 text-gray-500" };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* RFQ header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold bg-[#E1F5EE] text-[#085041] px-2.5 py-1 rounded-lg">
              {CARGO_LABELS[rfq.cargo_type] ?? rfq.cargo_type}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
            {pending.length > 0 && (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {pending.length} cotización{pending.length !== 1 ? "es" : ""} recibida{pending.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-[#085041]">
            <MapPin className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
            {rfq.origin_port}
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
            {rfq.destination_port}
          </div>

          <div className="mt-1.5 flex gap-3 flex-wrap text-xs text-[#6B7280]">
            {rfq.product_type && (
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> {rfq.product_type}
              </span>
            )}
            {rfq.weight_kg && (
              <span className="flex items-center gap-1">
                <Weight className="h-3.5 w-3.5" /> {(rfq.weight_kg / 1000).toFixed(1)} TM
              </span>
            )}
            {rfq.cargo_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(rfq.cargo_date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
              </span>
            )}
            {rfq.expires_at && rfq.status !== "confirmed" && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Expira {new Date(rfq.expires_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-[#085041] transition-colors p-1 flex-shrink-0">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Quotes section */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">Aún no hay cotizaciones para esta solicitud.</p>
              <p className="text-xs text-[#6B7280] mt-1">Los forwarders tienen hasta 48h para responder.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                {quotes.length} cotización{quotes.length !== 1 ? "es" : ""} recibida{quotes.length !== 1 ? "s" : ""}
                {pending.length > 0 && ` · ${pending.length} pendiente${pending.length !== 1 ? "s" : ""}`}
              </p>
              {sorted.map((q) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  isBest={q.id === bestId}
                  rfqStatus={rfq.status}
                  onConfirm={(qId, fwId) => onConfirm(rfq.id, qId, fwId)}
                  confirming={confirming === q.id}
                  onChat={onChat}
                  chatting={chatting === q.forwarder_id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function MisSolicitudesPage() {
  const router = useRouter();
  const [rfqs, setRfqs]       = useState<RFQ[]>([]);
  const [quotes, setQuotes]   = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [chatting, setChatting]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: rfqData, error: rfqError } = await supabase
        .from("rfq_logistics")
        .select("id, origin_port, destination_port, cargo_type, product_type, weight_kg, cargo_date, incoterm, status, expires_at, created_at, operation_id")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (rfqError) console.error("[rfq_logistics]", rfqError);

      const rfqList = rfqData ?? [];
      setRfqs(rfqList);

      if (rfqList.length === 0) { setLoading(false); return; }

      const rfqIds = rfqList.map((r) => r.id);
      const { data: quotesData, error: quotesError } = await supabase
        .from("logistics_quotes")
        .select("*")
        .in("rfq_id", rfqIds)
        .order("total_price_usd", { ascending: true });

      if (quotesError) console.error("[logistics_quotes]", quotesError);

      const rawQuotes = quotesData ?? [];

      // Load forwarder profiles
      const fwIds = [...new Set(rawQuotes.map((q) => q.forwarder_id))];
      const profileMap: Record<string, { name: string | null; business_name: string | null; phone: string | null }> = {};
      if (fwIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name, business_name, phone")
          .in("user_id", fwIds);
        (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p; });
      }

      setQuotes(rawQuotes.map((q) => ({
        ...q,
        forwarderName:     profileMap[q.forwarder_id]?.name ?? null,
        forwarderBusiness: profileMap[q.forwarder_id]?.business_name ?? null,
        forwarderPhone:    profileMap[q.forwarder_id]?.phone ?? null,
      })));

      setLoading(false);
    }
    load();
  }, []);

  const handleConfirm = async (rfqId: string, quoteId: string, forwarderId: string) => {
    if (!userId) return;
    setConfirming(quoteId);
    const supabase = createClient();

    // 1. Accept the selected quote
    const { error: acceptError } = await supabase
      .from("logistics_quotes")
      .update({ status: "accepted" })
      .eq("id", quoteId);

    if (acceptError) {
      console.error("[accept quote]", acceptError);
      alert(`Error al confirmar:\n${acceptError.message}`);
      setConfirming(null);
      return;
    }

    // 2. Reject other pending quotes for this rfq
    await supabase
      .from("logistics_quotes")
      .update({ status: "rejected" })
      .eq("rfq_id", rfqId)
      .eq("status", "pending")
      .neq("id", quoteId);

    // 3. Mark rfq as confirmed with selected_quote_id
    await supabase
      .from("rfq_logistics")
      .update({ status: "confirmed", selected_quote_id: quoteId })
      .eq("id", rfqId);

    // Create or update logistics operation
    let operationId: string | null = null;
    let operationNumber: number | null = null;

    const rfq = rfqs.find((r) => r.id === rfqId);
    const acceptedQuote = quotes.find((q) => q.id === quoteId);

    // Case 1: rfq was created from an existing commercial operation (PARTE B flow)
    if (rfq?.operation_id) {
      const { data: linked } = await supabase
        .from("operations")
        .update({ forwarder_id: forwarderId })
        .eq("id", rfq.operation_id)
        .select("id, operation_number")
        .single();
      if (linked) {
        operationId     = linked.id;
        operationNumber = linked.operation_number;
      }
    } else {
    // Case 2: standalone rfq_logistics — check if a logistics op already references this rfq
    const { data: existingOp } = await supabase
      .from("operations")
      .select("id, operation_number")
      .eq("rfq_logistics_id", rfqId)
      .maybeSingle();

    if (existingOp) {
      // Link forwarder to existing commercial operation
      await supabase
        .from("operations")
        .update({ forwarder_id: forwarderId })
        .eq("id", existingOp.id);
      operationId     = existingOp.id;
      operationNumber = existingOp.operation_number;
    } else {
      // Create new logistics operation
      const { data: newOp } = await supabase
        .from("operations")
        .insert({
          type:                "logistics",
          status:              "confirmed",
          buyer_id:            userId,
          forwarder_id:        forwarderId,
          rfq_logistics_id:    rfqId,
          product:             rfq?.product_type ?? rfq?.cargo_type ?? null,
          origin_port:         rfq?.origin_port ?? null,
          destination_country: rfq?.destination_port ?? null,
          total_value_usd:     acceptedQuote?.total_price_usd ?? null,
          incoterm:            rfq?.incoterm ?? null,
        })
        .select("id, operation_number")
        .single();

      if (newOp) {
        operationId     = newOp.id;
        operationNumber = newOp.operation_number;

        await supabase.from("operation_tracking").insert({
          operation_id: operationId,
          stage:        "confirmed",
          updated_by:   userId,
        });
      }
    }
    } // end else (Case 2)

    // Open/create chat between requester and forwarder
    const convId = await findOrCreateConversation(userId, forwarderId);

    // Auto-message with operation link
    if (convId) {
      const opCode = operationNumber
        ? `#AGD-${new Date().getFullYear()}-${String(operationNumber).padStart(3, "0")}`
        : "";
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id:       userId,
        content:         `✓ Cotización confirmada. Operación de flete ${opCode} creada. Ver: /dashboard/operacion/${operationId ?? ""}`,
      });
    }

    // Update local state optimistically
    setQuotes((prev) => prev.map((q) => {
      if (q.id === quoteId) return { ...q, status: "accepted", operationId, operationNumber };
      if (q.rfq_id === rfqId && q.status === "pending") return { ...q, status: "rejected" };
      return q;
    }));
    setRfqs((prev) => prev.map((r) =>
      r.id === rfqId ? { ...r, status: "confirmed" } : r
    ));

    setConfirming(null);
  };

  const handleChat = async (forwarderId: string) => {
    if (!userId) return;
    setChatting(forwarderId);
    const convId = await findOrCreateConversation(userId, forwarderId);
    if (convId) {
      router.push(`/dashboard/mensajes?conv=${convId}`);
    } else {
      alert("No se pudo abrir la conversación.");
      setChatting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  const totalQuotes  = quotes.length;
  const pendingCount = quotes.filter((q) => q.status === "pending").length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Mis solicitudes de flete</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Compara cotizaciones recibidas y confirma la que mejor se ajuste.
          </p>
        </div>
        <Link
          href="/dashboard/logistica/cotizar"
          className="inline-flex items-center gap-2 bg-[#085041] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
          <Truck className="h-4 w-4" /> Nueva solicitud
        </Link>
      </div>

      {/* Summary strip */}
      {rfqs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Solicitudes",           value: rfqs.length,   cls: "text-[#085041]" },
            { label: "Cotizaciones recibidas", value: totalQuotes,   cls: "text-blue-700"  },
            { label: "Pendientes de respuesta",value: pendingCount,  cls: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {rfqs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Truck className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-bold text-[#085041] mb-1">Aún no tienes solicitudes de flete</h3>
          <p className="text-sm text-[#6B7280] max-w-xs mx-auto mb-6">
            Cotiza tu logística y recibe respuestas de forwarders verificados en 48h.
          </p>
          <Link
            href="/dashboard/logistica/cotizar"
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#085041] transition-colors">
            <DollarSign className="h-4 w-4" /> Cotizar flete ahora
          </Link>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {rfqs.map((rfq) => (
            <RFQSection
              key={rfq.id}
              rfq={rfq}
              quotes={quotes.filter((q) => q.rfq_id === rfq.id)}
              onConfirm={handleConfirm}
              confirming={confirming}
              onChat={handleChat}
              chatting={chatting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

