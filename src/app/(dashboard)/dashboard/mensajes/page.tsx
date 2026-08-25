"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle, Send, Search, Loader2, ArrowLeft, Users,
  Handshake, X, Check, ExternalLink, Clock, Truck,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

/* ─── Types ────────────────────────────────────────────── */

interface ConvRow {
  id: string; participant_1: string; participant_2: string;
  product_id: string | null; product_type: string | null;
  last_message: string | null; last_message_at: string | null;
  unread_count_p1: number; unread_count_p2: number; created_at: string;
}

interface ConvItem extends ConvRow {
  other_user_id: string; other_user_name: string; my_unread: number;
}

interface MsgRow {
  id: string; conversation_id: string; sender_id: string;
  content: string; created_at: string;
}

interface DealProposal {
  id: string; conversation_id: string; proposer_id: string; recipient_id: string;
  product: string; variety: string | null; volume_tm: number | null; unit: string;
  price_usd: number | null; price_unit: string; incoterm: string | null;
  delivery_date: string | null; destination_country: string | null;
  origin_port: string | null; notes: string | null;
  status: string; operation_id: string | null; created_at: string;
}

interface ProposalFormState {
  product: string; variety: string; volume_tm: string; price_usd: string;
  price_unit: string; incoterm: string; delivery_date: string;
  destination_country: string; ciudad_destino: string; origin_port: string; notes: string;
  my_role: "buyer" | "seller";
  trade_type: "internacional" | "nacional";
  vol_unit: string;
}

interface FreightQuote {
  id: string; conversation_id: string; rfq_id: string | null;
  forwarder_id: string; freight_price_usd: number; local_charges_usd: number;
  total_price_usd: number; carrier: string | null; departure_date: string | null;
  transit_days: number | null; validity_days: number | null; notes: string | null;
  fee_usd: number | null; status: string; created_at: string;
}

interface FreightQuoteFormState {
  carrier: string; freight_price_usd: string; local_charges_usd: string;
  departure_date: string; transit_days: string; validity_days: string; notes: string;
}

type ChatItem =
  | { type: "message";       id: string; created_at: string; data: MsgRow }
  | { type: "proposal";      id: string; created_at: string; data: DealProposal }
  | { type: "freight_quote"; id: string; created_at: string; data: FreightQuote };

/* ─── Role helpers (stored as first line of notes) ─────── */

function encodeNotes(role: "buyer" | "seller", notes: string, tradeType?: string): string {
  const tt = tradeType === "nacional" ? ":tt:nacional" : "";
  return `__role:${role}${tt}__${notes ? "\n" + notes : ""}`;
}

function decodeNotes(raw: string | null): { role: "buyer" | "seller" | null; tradeType: string | null; notes: string } {
  if (!raw) return { role: null, tradeType: null, notes: "" };
  const m = raw.match(/^__role:(buyer|seller)(?::tt:([\w]+))?__(?:\n([\s\S]*))?$/);
  if (!m) return { role: null, tradeType: null, notes: raw };
  return { role: m[1] as "buyer" | "seller", tradeType: m[2] ?? null, notes: m[3] ?? "" };
}

function estimateTotal(volume: number, volUnit: string, price: number, priceUnit: string): number {
  const kg = volUnit === "TM" ? volume * 1000 : volUnit === "qq" ? volume * 46 : volume;
  const pkgPrice = priceUnit === "TM" ? price / 1000 : priceUnit === "caja" ? price / 20 : price;
  return kg * pkgPrice;
}

/* ─── Formatters ────────────────────────────────────────── */

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const now  = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Ayer";
    if (days < 7)   return date.toLocaleDateString("es-PE", { weekday: "short" });
    return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

/* ─── ConvListItem ──────────────────────────────────────── */

function ConvListItem({ conv, active, onClick }: { conv: ConvItem; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-3.5 transition-colors border-b border-gray-100 last:border-0 ${active ? "bg-[#E1F5EE]" : "hover:bg-gray-50"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${active ? "bg-[#1D9E75]" : "bg-[#085041]"}`}>
          {initials(conv.other_user_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-bold truncate ${active ? "text-[#085041]" : "text-[#1E293B]"}`}>{conv.other_user_name}</p>
            <span className="text-[10px] text-[#6B7280] whitespace-nowrap flex-shrink-0">{formatTime(conv.last_message_at)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-[#6B7280] truncate flex-1">{conv.last_message ?? "Sin mensajes aún"}</p>
            {conv.my_unread > 0 && (
              <span className="ml-2 flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1D9E75] text-white text-[9px] font-bold flex items-center justify-center">
                {conv.my_unread > 99 ? "99+" : conv.my_unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── MsgBubble ─────────────────────────────────────────── */

function MsgBubble({ msg, isMe, otherName }: { msg: MsgRow; isMe: boolean; otherName: string }) {
  const isTemp = msg.id.startsWith("temp-");
  let timeStr = "";
  try { timeStr = new Date(msg.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }); } catch { /* ignore */ }

  if (isMe) {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="max-w-xs lg:max-w-md">
          <div className={`bg-[#1D9E75] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed ${isTemp ? "opacity-70" : ""}`}>
            {msg.content}
          </div>
          <p className="text-[10px] text-[#6B7280] text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isTemp ? "Enviando…" : timeStr}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#085041] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 self-end">TÚ</div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[#085041] text-[10px] font-bold flex-shrink-0 self-end">
        {initials(otherName)}
      </div>
      <div className="max-w-xs lg:max-w-md">
        <p className="text-[10px] text-[#6B7280] mb-1 ml-1">{otherName}</p>
        <div className="bg-white border border-gray-200 text-[#1E293B] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">{msg.content}</div>
        <p className="text-[10px] text-[#6B7280] mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">{timeStr}</p>
      </div>
    </div>
  );
}

/* ─── ProposalCard ──────────────────────────────────────── */

function ProposalCard({
  proposal, currentUserId, onAccept, onReject, onCancel, processing,
}: {
  proposal: DealProposal; currentUserId: string;
  onAccept: (p: DealProposal) => void;
  onReject: (p: DealProposal) => void;
  onCancel: (p: DealProposal) => void;
  processing: boolean;
}) {
  const isProposer = proposal.proposer_id === currentUserId;
  const { notes: displayNotes, tradeType: proposalTradeType } = decodeNotes(proposal.notes);
  const currSym = proposalTradeType === "nacional" ? "S/" : "USD";
  const totalValue = estimateTotal(proposal.volume_tm ?? 0, proposal.unit ?? "TM", proposal.price_usd ?? 0, proposal.price_unit ?? "kg");

  return (
    <div className={`flex ${isProposer ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-xs lg:max-w-sm rounded-2xl border border-[#1D9E75]/40 shadow-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#085041] px-4 py-2.5 flex items-center gap-2">
          <Handshake className="h-4 w-4 text-[#1D9E75]" />
          <span className="text-xs font-bold text-white">Propuesta de acuerdo</span>
          <span className="ml-auto text-[10px] text-green-300">{formatTime(proposal.created_at)}</span>
        </div>

        {/* Terms grid */}
        <div className="bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="col-span-2">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Producto</p>
              <p className="font-bold text-[#085041]">{proposal.product}{proposal.variety ? ` — ${proposal.variety}` : ""}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Volumen</p>
              <p className="font-bold text-[#1E293B]">{proposal.volume_tm} {proposal.unit}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Precio</p>
              <p className="font-bold text-[#1E293B]">{currSym} {proposal.price_usd}/{proposal.price_unit}</p>
            </div>
            {proposal.incoterm && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Incoterm</p>
                <p className="font-bold text-[#1E293B]">{proposal.incoterm}</p>
              </div>
            )}
            {proposal.delivery_date && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Entrega</p>
                <p className="font-bold text-[#1E293B]">{fmtDate(proposal.delivery_date)}</p>
              </div>
            )}
            {proposal.destination_country && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Destino</p>
                <p className="font-bold text-[#1E293B]">{proposal.destination_country}</p>
              </div>
            )}
            {proposal.origin_port && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Puerto origen</p>
                <p className="font-bold text-[#1E293B]">{proposal.origin_port}</p>
              </div>
            )}
          </div>
          {displayNotes && (
            <p className="mt-2 text-xs text-[#6B7280] italic border-t border-gray-100 pt-2">{displayNotes}</p>
          )}
          {totalValue > 0 && (
            <p className="mt-2 text-[11px] text-[#6B7280] border-t border-gray-100 pt-2">
              Valor total est.:{" "}
              <span className="font-extrabold text-[#085041]">
                {currSym} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100">
          {proposal.status === "pending" && isProposer && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3" /> Propuesta enviada, esperando respuesta
              </span>
              <button type="button" onClick={() => onCancel(proposal)} disabled={processing}
                className="text-[11px] text-red-500 hover:text-red-700 font-semibold whitespace-nowrap disabled:opacity-40">
                Cancelar propuesta
              </button>
            </div>
          )}

          {proposal.status === "pending" && !isProposer && (
            <div className="flex gap-2">
              <button type="button" onClick={() => onReject(proposal)} disabled={processing}
                className="flex-1 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
                {processing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Rechazar"}
              </button>
              <button type="button" onClick={() => onAccept(proposal)} disabled={processing}
                className="flex-1 py-1.5 text-xs font-bold bg-[#1D9E75] text-white rounded-lg hover:bg-[#085041] transition-colors disabled:opacity-40">
                {processing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Aceptar acuerdo"}
              </button>
            </div>
          )}

          {proposal.status === "accepted" && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1D9E75] flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Acuerdo aceptado
              </span>
              {proposal.operation_id && (
                <Link href={`/dashboard/operacion/${proposal.operation_id}`}
                  className="text-[11px] text-[#085041] font-bold flex items-center gap-1 hover:text-[#1D9E75] transition-colors">
                  Ver operación <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {proposal.status === "rejected" && (
            <span className="text-xs text-red-600 font-medium">Propuesta rechazada</span>
          )}

          {proposal.status === "cancelled" && (
            <span className="text-xs text-[#6B7280]">Propuesta cancelada</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FreightQuoteCard ──────────────────────────────────── */

function FreightQuoteCard({
  quote, currentUserId, onAccept, onReject, processing,
}: {
  quote: FreightQuote; currentUserId: string;
  onAccept: (q: FreightQuote) => void;
  onReject: (q: FreightQuote) => void;
  processing: boolean;
}) {
  const isForwarder = quote.forwarder_id === currentUserId;

  return (
    <div className={`flex ${isForwarder ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-xs lg:max-w-sm rounded-2xl border border-blue-200 shadow-md overflow-hidden">

        <div className="bg-[#085041] px-4 py-2.5 flex items-center gap-2">
          <Truck className="h-4 w-4 text-[#1D9E75]" />
          <span className="text-xs font-bold text-white">Cotización de flete</span>
          <span className="ml-auto text-[10px] text-green-300">{formatTime(quote.created_at)}</span>
        </div>

        <div className="bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="col-span-2">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Precio total</p>
              <p className="text-lg font-extrabold text-[#085041]">USD {quote.total_price_usd.toLocaleString()}</p>
              {(quote.freight_price_usd > 0 || quote.local_charges_usd > 0) && (
                <p className="text-[10px] text-[#6B7280]">
                  Flete {quote.freight_price_usd.toLocaleString()} + Loc. {quote.local_charges_usd.toLocaleString()}
                </p>
              )}
            </div>
            {quote.carrier && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Naviera</p>
                <p className="font-bold text-[#1E293B]">{quote.carrier}</p>
              </div>
            )}
            {quote.departure_date && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Zarpe</p>
                <p className="font-bold text-[#1E293B]">{fmtDate(quote.departure_date)}</p>
              </div>
            )}
            {quote.transit_days != null && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Tránsito</p>
                <p className="font-bold text-[#1E293B]">{quote.transit_days} días</p>
              </div>
            )}
            {quote.validity_days != null && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Validez</p>
                <p className="font-bold text-[#1E293B]">{quote.validity_days} días</p>
              </div>
            )}
          </div>
          {quote.notes && (
            <p className="mt-2 text-xs text-[#6B7280] italic border-t border-gray-100 pt-2">{quote.notes}</p>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100">
          {quote.status === "pending" && isForwarder && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" /> Cotización enviada, esperando respuesta
            </span>
          )}
          {quote.status === "pending" && !isForwarder && (
            <div className="flex gap-2">
              <button type="button" onClick={() => onReject(quote)} disabled={processing}
                className="flex-1 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
                {processing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Rechazar"}
              </button>
              <button type="button" onClick={() => onAccept(quote)} disabled={processing}
                className="flex-1 py-1.5 text-xs font-bold bg-[#1D9E75] text-white rounded-lg hover:bg-[#085041] transition-colors disabled:opacity-40">
                {processing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Confirmar cotización"}
              </button>
            </div>
          )}
          {quote.status === "accepted" && (
            <span className="text-xs font-bold text-[#1D9E75] flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Cotización confirmada
            </span>
          )}
          {quote.status === "rejected" && (
            <span className="text-xs text-red-600 font-medium">Cotización rechazada</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── ProposalModal ─────────────────────────────────────── */

const INCOTERMS = ["FOB", "CIF", "EXW", "DDP", "FCA", "CFR", "DAP"];

function ProposalModal({
  onClose, onSubmit, submitting, userRole,
}: {
  onClose: () => void;
  onSubmit: (f: ProposalFormState) => Promise<void>;
  submitting: boolean;
  userRole: string | null;
}) {
  const [form, setForm] = useState<ProposalFormState>({
    product: "", variety: "", volume_tm: "", price_usd: "", price_unit: "kg",
    incoterm: "FOB", delivery_date: "", destination_country: "", ciudad_destino: "",
    origin_port: "", notes: "",
    my_role: userRole === "comprador" ? "buyer" : "seller",
    trade_type: "internacional",
    vol_unit: "TM",
  });

  const set = (k: keyof ProposalFormState, v: string) => setForm(p => {
    const next = { ...p, [k]: v };
    if (k === "trade_type") next.vol_unit = v === "nacional" ? "kg" : "TM";
    return next;
  });

  const isNacional = form.trade_type === "nacional";
  const currSym    = isNacional ? "S/" : "USD";
  const vol        = parseFloat(form.volume_tm || "0");
  const price      = parseFloat(form.price_usd || "0");
  const total      = estimateTotal(vol, form.vol_unit, price, form.price_unit);
  const canSubmit  = form.product.trim() && form.volume_tm && form.price_usd && !submitting;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#085041] rounded-t-2xl sticky top-0">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-[#1D9E75]" />
            <h3 className="text-sm font-bold text-white">Proponer acuerdo</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Tipo de operación */}
          <div>
            <p className="text-xs font-bold text-[#085041] mb-2">Tipo de operación *</p>
            <div className="flex gap-2">
              {([
                { value: "internacional", label: "Internacional" },
                { value: "nacional",      label: "Venta nacional" },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => set("trade_type", opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.trade_type === opt.value
                      ? "bg-[#085041] text-white border-[#085041]"
                      : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75]"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rol selector — solo para exportador */}
          {userRole === "exportador" && (
            <div>
              <p className="text-xs font-bold text-[#085041] mb-2">En esta operación, yo soy *</p>
              <div className="flex gap-2">
                {(["buyer", "seller"] as const).map(r => (
                  <button key={r} type="button" onClick={() => set("my_role", r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      form.my_role === r
                        ? "bg-[#085041] text-white border-[#085041]"
                        : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75]"
                    }`}>
                    {r === "buyer" ? "🛒 Comprador" : "📦 Vendedor"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Producto */}
          <div>
            <label className="block text-xs font-semibold text-[#085041] mb-1">Producto *</label>
            <input type="text" value={form.product} onChange={e => set("product", e.target.value)}
              placeholder="Ej: Palta Hass"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#085041] mb-1">Variedad</label>
            <input type="text" value={form.variety} onChange={e => set("variety", e.target.value)}
              placeholder="Ej: Hass, Fuerte..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Volumen ({form.vol_unit}) *</label>
              <div className="flex gap-1">
                <input type="number" min="0" step="0.1" value={form.volume_tm} onChange={e => set("volume_tm", e.target.value)}
                  placeholder="0.0"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                <select value={form.vol_unit} onChange={e => set("vol_unit", e.target.value)}
                  className="px-1.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white">
                  <option value="kg">kg</option>
                  <option value="TM">TM</option>
                  <option value="qq">qq</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Precio ({currSym}) *</label>
              <div className="flex gap-1">
                <input type="number" min="0" step="0.01" value={form.price_usd} onChange={e => set("price_usd", e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                <select value={form.price_unit} onChange={e => set("price_unit", e.target.value)}
                  className="px-1.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white">
                  <option value="kg">/kg</option>
                  <option value="TM">/TM</option>
                  <option value="caja">/caja</option>
                </select>
              </div>
            </div>
            {form.trade_type === "internacional" && (
              <div>
                <label className="block text-xs font-semibold text-[#085041] mb-1">Incoterm</label>
                <select value={form.incoterm} onChange={e => set("incoterm", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white">
                  <option value="">Sin especificar</option>
                  {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Fecha de entrega</label>
              <input type="date" value={form.delivery_date} onChange={e => set("delivery_date", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
            {form.trade_type === "internacional" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#085041] mb-1">País destino</label>
                  <input type="text" value={form.destination_country} onChange={e => set("destination_country", e.target.value)}
                    placeholder="Ej: España"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#085041] mb-1">Puerto origen</label>
                  <input type="text" value={form.origin_port} onChange={e => set("origin_port", e.target.value)}
                    placeholder="Ej: Callao"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#085041] mb-1">Ciudad / Región destino</label>
                <input type="text" value={form.ciudad_destino} onChange={e => set("ciudad_destino", e.target.value)}
                  placeholder="Ej: Lima, Arequipa, La Libertad"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#085041] mb-1">Notas adicionales</label>
            <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Certificaciones requeridas, condiciones de pago, calidad..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none" />
          </div>

          {total > 0 && (
            <div className="bg-[#E1F5EE] rounded-xl px-4 py-2.5">
              <p className="text-xs text-[#085041]">
                Valor total estimado:{" "}
                <span className="font-extrabold">
                  {currSym} {total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-[#6B7280] ml-1">({form.vol_unit} × {currSym}/{form.price_unit})</span>
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-[#6B7280] hover:border-gray-300 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => onSubmit(form)} disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-sm font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Enviar propuesta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── FreightQuoteModal ─────────────────────────────────── */

function FreightQuoteModal({
  onClose, onSubmit, submitting,
}: {
  onClose: () => void;
  onSubmit: (f: FreightQuoteFormState) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FreightQuoteFormState>({
    carrier: "", freight_price_usd: "", local_charges_usd: "0",
    departure_date: "", transit_days: "", validity_days: "7", notes: "",
  });

  const set = (k: keyof FreightQuoteFormState, v: string) => setForm(p => ({ ...p, [k]: v }));
  const freight = parseFloat(form.freight_price_usd || "0");
  const local   = parseFloat(form.local_charges_usd  || "0");
  const total   = freight + local;
  const canSubmit = freight > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#085041] rounded-t-2xl sticky top-0">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#1D9E75]" />
            <h3 className="text-sm font-bold text-white">Enviar cotización de flete</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Flete USD *</label>
              <input type="number" min="0" value={form.freight_price_usd}
                onChange={e => set("freight_price_usd", e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Gastos locales USD</label>
              <input type="number" min="0" value={form.local_charges_usd}
                onChange={e => set("local_charges_usd", e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#085041] mb-1">Naviera / Carrier</label>
            <input type="text" value={form.carrier} onChange={e => set("carrier", e.target.value)}
              placeholder="Ej: Maersk, MSC, Hapag-Lloyd"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Fecha zarpe</label>
              <input type="date" value={form.departure_date} onChange={e => set("departure_date", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Tránsito (días)</label>
              <input type="number" min="1" value={form.transit_days} onChange={e => set("transit_days", e.target.value)}
                placeholder="21"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#085041] mb-1">Validez (días)</label>
              <input type="number" min="1" value={form.validity_days} onChange={e => set("validity_days", e.target.value)}
                placeholder="7"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#085041] mb-1">Notas adicionales</label>
            <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Condiciones, restricciones, etc."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none" />
          </div>

          {total > 0 && (
            <div className="bg-[#E1F5EE] rounded-xl px-4 py-2.5">
              <p className="text-xs text-[#6B7280]">Total estimado</p>
              <p className="text-xl font-extrabold text-[#085041]">USD {total.toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-[#6B7280] hover:border-gray-300 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => onSubmit(form)} disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl bg-[#085041] text-white text-sm font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Enviar cotización"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty / no-conversations states ───────────────────── */

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-[#1D9E75]" />
      </div>
      <h3 className="text-base font-bold text-[#085041] mb-1">Tus mensajes</h3>
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed">
        Selecciona una conversación de la lista para ver los mensajes.
      </p>
    </div>
  );
}

function NoConversations() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <Users className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-xs font-semibold text-[#085041] mb-1">Sin conversaciones</p>
      <p className="text-[11px] text-[#6B7280] leading-relaxed">
        Cuando contactes un proveedor desde el catálogo, las conversaciones aparecerán aquí.
      </p>
    </div>
  );
}

/* ─── Inner page ─────────────────────────────────────────── */

function MensajesInner() {
  const searchParams = useSearchParams();
  const convParam    = searchParams.get("conv");

  const supabase = useRef(createClient()).current;

  const [currentUserId,      setCurrentUserId]      = useState<string | null>(null);
  const [conversations,      setConversations]      = useState<ConvItem[]>([]);
  const [loadingConvs,       setLoadingConvs]       = useState(true);
  const [selectedConvId,     setSelectedConvId]     = useState<string | null>(null);
  const [messages,           setMessages]           = useState<MsgRow[]>([]);
  const [loadingMsgs,        setLoadingMsgs]        = useState(false);
  const [input,              setInput]              = useState("");
  const [sending,            setSending]            = useState(false);
  const [search,             setSearch]             = useState("");

  // Proposal state
  const [proposals,          setProposals]          = useState<DealProposal[]>([]);
  const [showProposalForm,   setShowProposalForm]   = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [processingProposal, setProcessingProposal] = useState<string | null>(null);

  // Freight quote state
  const [currentUserRole,        setCurrentUserRole]        = useState<string | null>(null);
  const [freightQuotes,          setFreightQuotes]          = useState<FreightQuote[]>([]);
  const [showFreightQuoteForm,   setShowFreightQuoteForm]   = useState(false);
  const [submittingFreightQuote, setSubmittingFreightQuote] = useState(false);
  const [processingFreightQuote, setProcessingFreightQuote] = useState<string | null>(null);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const currentUserIdRef  = useRef<string | null>(null);
  const conversationsRef  = useRef<ConvItem[]>([]);
  const lastMsgTimeRef    = useRef<string | null>(null);

  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);
  useEffect(() => { currentUserIdRef.current  = currentUserId;  }, [currentUserId]);
  useEffect(() => { conversationsRef.current  = conversations;  }, [conversations]);

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  /* ── 1. Load user ──────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      if (!user) { setLoadingConvs(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
      setCurrentUserRole(profile?.role ?? null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 2. Load conversations ─────────────────────────────── */
  useEffect(() => {
    if (!currentUserId) return;
    setLoadingConvs(true);

    async function load() {
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false });

      if (!convs || convs.length === 0) { setLoadingConvs(false); return; }

      const otherIds = [...new Set(
        convs.map((c: ConvRow) => c.participant_1 === currentUserId ? c.participant_2 : c.participant_1)
      )];

      const { data: profiles } = await supabase
        .from("profiles").select("user_id, name, business_name").in("user_id", otherIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: { user_id: string; name: string | null; business_name: string | null }) => {
        nameMap[p.user_id] = p.business_name || p.name || "Usuario";
      });

      const enriched: ConvItem[] = convs.map((c: ConvRow) => {
        const isP1  = c.participant_1 === currentUserId;
        const other = isP1 ? c.participant_2 : c.participant_1;
        return { ...c, other_user_id: other, other_user_name: nameMap[other] ?? "Usuario", my_unread: isP1 ? c.unread_count_p1 : c.unread_count_p2 };
      });

      setConversations(enriched);
      setLoadingConvs(false);
    }
    load();
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 3. Auto-select from URL param ─────────────────────── */
  useEffect(() => {
    if (!convParam || conversations.length === 0) return;
    if (conversations.some(c => c.id === convParam)) setSelectedConvId(convParam);
  }, [convParam, conversations]);

  /* ── 4. Load messages + proposals when conv changes ───── */
  useEffect(() => {
    if (!selectedConvId || !currentUserId) return;

    lastMsgTimeRef.current = null;
    setLoadingMsgs(true);
    setMessages([]);
    setProposals([]);
    setFreightQuotes([]);

    const loadStartTime = new Date().toISOString();

    supabase.from("messages").select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const msgs = (data as MsgRow[]) ?? [];
        setMessages(msgs);
        setLoadingMsgs(false);
        lastMsgTimeRef.current = msgs.length > 0 ? msgs[msgs.length - 1].created_at : loadStartTime;
      });

    supabase.from("deal_proposals").select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setProposals((data as DealProposal[]) ?? []));

    supabase.from("logistics_quotes").select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setFreightQuotes((data as FreightQuote[]) ?? []));

    const conv = conversationsRef.current.find(c => c.id === selectedConvId);
    if (conv && conv.my_unread > 0) {
      const isP1  = conv.participant_1 === currentUserId;
      const field = isP1 ? "unread_count_p1" : "unread_count_p2";
      supabase.from("conversations").update({ [field]: 0 }).eq("id", selectedConvId).then(() => {});
      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, my_unread: 0 } : c));
    }
  }, [selectedConvId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 5. Poll messages + proposals every 3 s ────────────── */
  useEffect(() => {
    if (!selectedConvId || !currentUserId) return;

    const tick = async () => {
      const since  = lastMsgTimeRef.current;
      const convId = selectedConvIdRef.current;
      if (!since || !convId) return;

      // New messages
      const { data } = await supabase.from("messages").select("*")
        .eq("conversation_id", convId).gt("created_at", since).order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const incoming = data as MsgRow[];
        lastMsgTimeRef.current = incoming[incoming.length - 1].created_at;
        setMessages(prev => {
          const knownIds = new Set(prev.map(m => m.id));
          const fresh = incoming.filter(m => !knownIds.has(m.id));
          if (fresh.length === 0) return prev;
          const withoutMatchingTemps = prev.filter(m => {
            if (!m.id.startsWith("temp-")) return true;
            return !fresh.some(nm => nm.sender_id === m.sender_id && nm.content === m.content);
          });
          return [...withoutMatchingTemps, ...fresh];
        });
      }

      // Refresh proposals (small set, safe to refetch all)
      const { data: propData } = await supabase.from("deal_proposals").select("*")
        .eq("conversation_id", convId).order("created_at", { ascending: true });
      if (propData) setProposals(propData as DealProposal[]);

      // Refresh freight quotes
      const { data: fqData } = await supabase.from("logistics_quotes").select("*")
        .eq("conversation_id", convId).order("created_at", { ascending: true });
      if (fqData) setFreightQuotes(fqData as FreightQuote[]);
    };

    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [selectedConvId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 6. Poll conversation list every 5 s ───────────────── */
  useEffect(() => {
    if (!currentUserId) return;

    const tick = async () => {
      const userId = currentUserIdRef.current;
      if (!userId) return;

      const { data: convs } = await supabase.from("conversations").select("*")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      if (!convs) return;

      setConversations(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        return (convs as ConvRow[]).map(c => {
          const existing = prevMap.get(c.id);
          const isP1     = c.participant_1 === userId;
          const other    = isP1 ? c.participant_2 : c.participant_1;
          return {
            ...c,
            other_user_id:   existing?.other_user_id   ?? other,
            other_user_name: existing?.other_user_name ?? "Usuario",
            my_unread:       isP1 ? c.unread_count_p1  : c.unread_count_p2,
          };
        });
      });
    };

    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 7. Auto-scroll ─────────────────────────────────────── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, proposals, freightQuotes]);

  /* ── Send message ──────────────────────────────────────── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedConvId || !currentUserId || !selectedConv) return;

    const now    = new Date().toISOString();
    const tempId = `temp-${now}-${Math.random()}`;

    setInput("");
    setSending(true);
    setMessages(prev => [
      ...prev,
      { id: tempId, conversation_id: selectedConvId, sender_id: currentUserId, content: text, created_at: now } as MsgRow,
    ]);

    const { data: saved } = await supabase.from("messages")
      .insert({ conversation_id: selectedConvId, sender_id: currentUserId, content: text })
      .select().single();

    if (saved) {
      setMessages(prev => prev.map(m => m.id === tempId ? (saved as MsgRow) : m));
      lastMsgTimeRef.current = (saved as MsgRow).created_at;
    }

    const isP1             = selectedConv.participant_1 === currentUserId;
    const otherUnreadField = isP1 ? "unread_count_p2" : "unread_count_p1";
    const otherUnreadNow   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;

    await supabase.from("conversations").update({
      last_message: text, last_message_at: now, [otherUnreadField]: otherUnreadNow + 1,
    }).eq("id", selectedConvId);

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== selectedConvId) return c;
        return { ...c, last_message: text, last_message_at: now, [otherUnreadField]: otherUnreadNow + 1 };
      }).sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      })
    );

    setSending(false);
  };

  /* ── Submit proposal ────────────────────────────────────── */
  const handleSubmitProposal = async (form: ProposalFormState) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setSubmittingProposal(true);

    const isNacional = form.trade_type === "nacional";
    const encodedNotes = encodeNotes(form.my_role, form.notes.trim(), form.trade_type);

    const { data, error } = await supabase.from("deal_proposals").insert({
      conversation_id:    selectedConvId,
      proposer_id:        currentUserId,
      recipient_id:       selectedConv.other_user_id,
      product:            form.product.trim(),
      variety:            form.variety.trim() || null,
      volume_tm:          parseFloat(form.volume_tm) || null,
      unit:               form.vol_unit,
      price_usd:          parseFloat(form.price_usd) || null,
      price_unit:         form.price_unit,
      incoterm:           isNacional ? null : (form.incoterm || null),
      delivery_date:      form.delivery_date || null,
      destination_country: isNacional ? (form.ciudad_destino.trim() || null) : (form.destination_country.trim() || null),
      origin_port:        isNacional ? null : (form.origin_port.trim() || null),
      notes:              encodedNotes,
      status:             "pending",
    }).select().single();

    if (error) {
      console.error("[deal_proposals] error:", error);
      alert(`Error al enviar la propuesta:\n${error.message}`);
      setSubmittingProposal(false);
      return;
    }

    if (data) {
      setProposals(prev => [...prev, data as DealProposal]);
    }

    setShowProposalForm(false);
    setSubmittingProposal(false);
  };

  /* ── Accept proposal ────────────────────────────────────── */
  const handleAcceptProposal = async (proposal: DealProposal) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setProcessingProposal(proposal.id);

    const { role, tradeType } = decodeNotes(proposal.notes);
    const buyer_id  = role === "buyer"  ? proposal.proposer_id : proposal.recipient_id;
    const seller_id = role === "seller" ? proposal.proposer_id : proposal.recipient_id;

    const { data: op, error: opError } = await supabase.from("operations").insert({
      type:               "commercial",
      trade_type:         tradeType ?? "internacional",
      currency:           (tradeType ?? "internacional") === "nacional" ? "PEN" : "USD",
      buyer_id,
      seller_id,
      product:            proposal.product,
      variety:            proposal.variety ?? null,
      volume_tm:          (() => {
        const v = proposal.volume_tm ?? 0;
        const u = proposal.unit ?? "TM";
        return u === "kg" ? v / 1000 : u === "qq" ? v * 0.046 : v;
      })(),
      unit:               proposal.unit ?? "TM",
      agreed_price_usd:   proposal.price_usd,
      price_unit:         proposal.price_unit ?? "kg",
      incoterm:           proposal.incoterm ?? null,
      delivery_date:      proposal.delivery_date ?? null,
      destination_country: proposal.destination_country ?? null,
      total_value_usd:    estimateTotal(proposal.volume_tm ?? 0, proposal.unit ?? "TM", proposal.price_usd ?? 0, proposal.price_unit ?? "kg"),
      status:             "confirmed",
    }).select("id, operation_number").single();

    if (opError) {
      console.error("[operations] error:", opError);
      alert(`Error al crear la operación:\n${opError.message}`);
      setProcessingProposal(null);
      return;
    }

    if (op) {
      await supabase.from("operation_tracking").insert({
        operation_id: op.id, stage: "confirmed", updated_by: currentUserId,
      });

      await supabase.from("deal_proposals")
        .update({ status: "accepted", operation_id: op.id })
        .eq("id", proposal.id);

      const msgText = `✓ Acuerdo cerrado. Operación #${op.operation_number} creada. Ver: /dashboard/operacion/${op.id}`;
      const now     = new Date().toISOString();

      await supabase.from("messages").insert({
        conversation_id: selectedConvId, sender_id: currentUserId, content: msgText,
      });

      const isP1 = selectedConv.participant_1 === currentUserId;
      const field = isP1 ? "unread_count_p2" : "unread_count_p1";
      const cnt   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;
      await supabase.from("conversations").update({
        last_message: msgText, last_message_at: now, [field]: cnt + 1,
      }).eq("id", selectedConvId);

      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: "accepted", operation_id: op.id } : p
      ));
    }

    setProcessingProposal(null);
  };

  /* ── Reject proposal ────────────────────────────────────── */
  const handleRejectProposal = async (proposal: DealProposal) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setProcessingProposal(proposal.id);

    await supabase.from("deal_proposals").update({ status: "rejected" }).eq("id", proposal.id);

    const msgText = "Propuesta rechazada.";
    const now     = new Date().toISOString();

    await supabase.from("messages").insert({
      conversation_id: selectedConvId, sender_id: currentUserId, content: msgText,
    });

    const isP1 = selectedConv.participant_1 === currentUserId;
    const field = isP1 ? "unread_count_p2" : "unread_count_p1";
    const cnt   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;
    await supabase.from("conversations").update({
      last_message: msgText, last_message_at: now, [field]: cnt + 1,
    }).eq("id", selectedConvId);

    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: "rejected" } : p));
    setProcessingProposal(null);
  };

  /* ── Cancel proposal ────────────────────────────────────── */
  const handleCancelProposal = async (proposal: DealProposal) => {
    if (!currentUserId) return;
    setProcessingProposal(proposal.id);
    await supabase.from("deal_proposals").update({ status: "cancelled" }).eq("id", proposal.id);
    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: "cancelled" } : p));
    setProcessingProposal(null);
  };

  /* ── Submit freight quote ──────────────────────────────── */
  const handleSubmitFreightQuote = async (form: FreightQuoteFormState) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setSubmittingFreightQuote(true);

    const freight = parseFloat(form.freight_price_usd) || 0;
    const local   = parseFloat(form.local_charges_usd)  || 0;
    const total   = freight + local;

    const { data, error } = await supabase.from("logistics_quotes").insert({
      conversation_id:    selectedConvId,
      forwarder_id:       currentUserId,
      rfq_id:             null,
      freight_price_usd:  freight,
      local_charges_usd:  local,
      total_price_usd:    total,
      carrier:            form.carrier.trim() || null,
      departure_date:     form.departure_date || null,
      transit_days:       parseInt(form.transit_days) || null,
      validity_days:      parseInt(form.validity_days) || null,
      notes:              form.notes.trim() || null,
      fee_usd:            null,
      fee_paid:           false,
      status:             "pending",
    }).select().single();

    if (error) {
      console.error("[freight_quote] error:", error);
      alert(`Error al enviar cotización:\n${error.message}`);
      setSubmittingFreightQuote(false);
      return;
    }

    if (data) {
      setFreightQuotes(prev => [...prev, data as FreightQuote]);

      const msgText = `🚢 Envié una cotización de flete: USD ${total.toLocaleString()} total.`;
      const now     = new Date().toISOString();
      await supabase.from("messages").insert({
        conversation_id: selectedConvId, sender_id: currentUserId, content: msgText,
      });

      const isP1  = selectedConv.participant_1 === currentUserId;
      const field = isP1 ? "unread_count_p2" : "unread_count_p1";
      const cnt   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;
      await supabase.from("conversations").update({
        last_message: msgText, last_message_at: now, [field]: cnt + 1,
      }).eq("id", selectedConvId);
    }

    setShowFreightQuoteForm(false);
    setSubmittingFreightQuote(false);
  };

  /* ── Accept freight quote ──────────────────────────────── */
  const handleAcceptFreightQuote = async (quote: FreightQuote) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setProcessingFreightQuote(quote.id);

    await supabase.from("logistics_quotes").update({ status: "accepted" }).eq("id", quote.id);

    const msgText = "✓ Cotización de flete confirmada.";
    const now     = new Date().toISOString();
    await supabase.from("messages").insert({
      conversation_id: selectedConvId, sender_id: currentUserId, content: msgText,
    });

    const isP1  = selectedConv.participant_1 === currentUserId;
    const field = isP1 ? "unread_count_p2" : "unread_count_p1";
    const cnt   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;
    await supabase.from("conversations").update({
      last_message: msgText, last_message_at: now, [field]: cnt + 1,
    }).eq("id", selectedConvId);

    setFreightQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: "accepted" } : q));
    setProcessingFreightQuote(null);
  };

  /* ── Reject freight quote ──────────────────────────────── */
  const handleRejectFreightQuote = async (quote: FreightQuote) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setProcessingFreightQuote(quote.id);

    await supabase.from("logistics_quotes").update({ status: "rejected" }).eq("id", quote.id);

    const msgText = "Cotización de flete rechazada.";
    const now     = new Date().toISOString();
    await supabase.from("messages").insert({
      conversation_id: selectedConvId, sender_id: currentUserId, content: msgText,
    });

    const isP1  = selectedConv.participant_1 === currentUserId;
    const field = isP1 ? "unread_count_p2" : "unread_count_p1";
    const cnt   = isP1 ? selectedConv.unread_count_p2 : selectedConv.unread_count_p1;
    await supabase.from("conversations").update({
      last_message: msgText, last_message_at: now, [field]: cnt + 1,
    }).eq("id", selectedConvId);

    setFreightQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: "rejected" } : q));
    setProcessingFreightQuote(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filtered      = conversations.filter(c =>
    c.other_user_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.last_message ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread   = conversations.reduce((s, c) => s + c.my_unread, 0);
  const pendingIncoming = proposals.filter(
    p => p.status === "pending" && p.recipient_id === currentUserId
  ).length;

  // Combined thread: messages + proposals + freight quotes sorted by created_at
  const chatItems: ChatItem[] = [
    ...messages.map(m     => ({ type: "message"       as const, id: m.id,  created_at: m.created_at,  data: m })),
    ...proposals.map(p    => ({ type: "proposal"      as const, id: p.id,  created_at: p.created_at,  data: p })),
    ...freightQuotes.map(q => ({ type: "freight_quote" as const, id: q.id, created_at: q.created_at, data: q })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left: conversation list */}
      <div className={`${selectedConvId ? "hidden lg:flex" : "flex"} w-full lg:w-72 flex-shrink-0 bg-white border-r border-gray-200 flex-col`}>
        <div className="px-4 py-3.5 border-b border-gray-100 bg-[#085041]">
          <h2 className="text-sm font-bold text-white">Mensajes</h2>
          <p className="text-[11px] text-green-300 mt-0.5">
            {totalUnread > 0 ? `${totalUnread} sin leer` : "Todo leído"}
          </p>
        </div>

        <div className="px-3 py-2.5 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar conversación..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center items-center pt-12"><Loader2 className="h-5 w-5 text-[#1D9E75] animate-spin" /></div>
          ) : filtered.length === 0 ? (
            search
              ? <div className="p-6 text-center text-xs text-[#6B7280]">Sin resultados</div>
              : <NoConversations />
          ) : (
            filtered.map(conv => (
              <ConvListItem key={conv.id} conv={conv} active={selectedConvId === conv.id} onClick={() => setSelectedConvId(conv.id)} />
            ))
          )}
        </div>
      </div>

      {/* Right: messages panel */}
      <div className={`${selectedConvId ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden bg-gray-50`}>
        {!selectedConv ? (
          <EmptyChat />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center gap-3 shadow-sm">
              <button type="button" onClick={() => setSelectedConvId(null)}
                className="lg:hidden text-gray-400 hover:text-[#085041] transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-[#085041] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials(selectedConv.other_user_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#085041]">{selectedConv.other_user_name}</p>
                <p className="text-xs text-[#6B7280]">Conversación privada</p>
              </div>
              {/* Cotizar flete — forwarders only */}
              {currentUserRole === "forwarder" && (
                <button type="button" onClick={() => setShowFreightQuoteForm(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cotizar flete</span>
                </button>
              )}
              {/* Proponer acuerdo — non-forwarders only */}
              {currentUserRole !== "forwarder" && (
                <button type="button" onClick={() => setShowProposalForm(true)}
                  className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors flex-shrink-0 shadow-sm">
                  <Handshake className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Proponer acuerdo</span>
                  {pendingIncoming > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {pendingIncoming}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Chat thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingMsgs ? (
                <div className="flex justify-center pt-12"><Loader2 className="h-6 w-6 text-[#1D9E75] animate-spin" /></div>
              ) : chatItems.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[#6B7280]">No hay mensajes aún. ¡Sé el primero en escribir!</p>
                </div>
              ) : (
                <>
                  {chatItems.map(item =>
                    item.type === "message" ? (
                      <MsgBubble key={item.id} msg={item.data} isMe={item.data.sender_id === currentUserId} otherName={selectedConv.other_user_name} />
                    ) : item.type === "proposal" ? (
                      <ProposalCard key={item.id} proposal={item.data} currentUserId={currentUserId!}
                        onAccept={handleAcceptProposal} onReject={handleRejectProposal} onCancel={handleCancelProposal}
                        processing={processingProposal === item.id} />
                    ) : (
                      <FreightQuoteCard key={item.id} quote={item.data} currentUserId={currentUserId!}
                        onAccept={handleAcceptFreightQuote} onReject={handleRejectFreightQuote}
                        processing={processingFreightQuote === item.id} />
                    )
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-end gap-3">
                <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje... (Enter para enviar)"
                  className="flex-1 resize-none px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition max-h-32"
                  style={{ fieldSizing: "content" } as React.CSSProperties} />
                <button type="button" onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1D9E75] text-white hover:bg-[#085041] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1.5 text-center">Mensajes en tiempo real · MARKARU</p>
            </div>
          </>
        )}
      </div>

      {/* Proposal modal */}
      {showProposalForm && (
        <ProposalModal
          onClose={() => setShowProposalForm(false)}
          onSubmit={handleSubmitProposal}
          submitting={submittingProposal}
          userRole={currentUserRole}
        />
      )}

      {/* Freight quote modal */}
      {showFreightQuoteForm && (
        <FreightQuoteModal
          onClose={() => setShowFreightQuoteForm(false)}
          onSubmit={handleSubmitFreightQuote}
          submitting={submittingFreightQuote}
        />
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function MensajesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-7 w-7 text-[#1D9E75] animate-spin" />
      </div>
    }>
      <MensajesInner />
    </Suspense>
  );
}
