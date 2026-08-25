"use client";

/* ─────────────────────────────────────────────────────────────
 * Chat Proveedor ↔ Cliente con cotización y cierre de servicio.
 *
 * Heredado del chat de MARKARU. Cambios de fondo:
 *   · deal_proposals (producto, volumen TM, incoterm, puerto) → quotes
 *     (monto en soles, qué incluye, qué no, días estimados).
 *   · Fuera logistics_quotes / cotización de flete: no existe la tabla.
 *   · Fuera el truco de guardar el rol dentro de `notes` con un prefijo
 *     "__role:buyer__": ahora provider_id y client_id son columnas.
 *   · El hilo muestra el ciclo completo: cotización → aceptada → servicio
 *     completado → confirmado y calificado por el Cliente.
 *
 * Todas las transiciones van por RPC (accept_quote, mark_job_completed,
 * confirm_job, rate_client). Esas funciones ya insertan el mensaje de
 * sistema en el hilo, así que el cliente no lo duplica.
 * ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send, Search, Loader2, ArrowLeft, MessageCircle,
  Handshake, X, Check, Clock, Star, CheckCircle2, Ban,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

/* ─── Types ────────────────────────────────────────────── */

interface ConvRow {
  id: string; participant_1: string; participant_2: string;
  subject_id: string | null; subject_type: string | null;
  last_message: string | null; last_message_at: string | null;
  unread_count_p1: number; unread_count_p2: number; created_at: string;
}

interface ConvItem extends ConvRow {
  other_user_id: string; other_user_name: string; my_unread: number;
}

interface MsgRow {
  id: string; conversation_id: string; sender_id: string;
  content: string; kind: string; ref_id: string | null; created_at: string;
}

interface Quote {
  id: string; conversation_id: string; provider_id: string; client_id: string;
  service_id: string | null; request_id: string | null;
  amount: number; currency: string; scope: string; excludes: string | null;
  estimated_days: number | null; valid_until: string | null;
  status: string; job_id: string | null; created_at: string;
}

interface Job {
  id: string; conversation_id: string | null;
  provider_id: string; client_id: string;
  title: string; amount: number; currency: string; status: string;
  completed_at: string | null; confirmed_at: string | null; created_at: string;
}

interface QuoteFormState {
  amount: string; scope: string; excludes: string;
  estimated_days: string; valid_until: string;
}

type ChatItem =
  | { type: "message"; id: string; created_at: string; data: MsgRow }
  | { type: "quote";   id: string; created_at: string; data: Quote }
  | { type: "job";     id: string; created_at: string; data: Job };

/* ─── Formatters ────────────────────────────────────────── */

const soles = (n: number) =>
  `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
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

  /* Los avisos que insertan accept_quote / mark_job_completed /
     confirm_job van centrados, no como burbuja de nadie. */
  if (msg.kind === "system") {
    return (
      <div className="flex justify-center">
        <span className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] text-[#6B7280]">
          {msg.content}
        </span>
      </div>
    );
  }

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

/* ─── QuoteCard ─────────────────────────────────────────── */

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aceptada:  { label: "Aceptada",   cls: "bg-green-50 text-green-700 border-green-200" },
  rechazada: { label: "Rechazada",  cls: "bg-red-50 text-red-700 border-red-200" },
  vencida:   { label: "Vencida",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelada: { label: "Cancelada",  cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

function QuoteCard({
  quote, currentUserId, onAccept, onReject, onCancel, processing,
}: {
  quote: Quote; currentUserId: string;
  onAccept: (q: Quote) => void;
  onReject: (q: Quote) => void;
  onCancel: (q: Quote) => void;
  processing: boolean;
}) {
  const isProvider = quote.provider_id === currentUserId;
  const isClient   = quote.client_id === currentUserId;
  const st = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.pendiente;
  const expired = quote.valid_until ? new Date(quote.valid_until) < new Date() : false;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-[#085041]/15 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-[#E1F5EE] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-[#085041]" />
            <p className="text-xs font-bold text-[#085041]">
              {isProvider ? "Cotización que enviaste" : "Cotización recibida"}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
        </div>

        <div className="px-4 py-3.5 space-y-3">
          <div>
            <p className="text-2xl font-extrabold text-[#085041]">{soles(quote.amount)}</p>
            {quote.estimated_days != null && (
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Tiempo estimado: {quote.estimated_days} {quote.estimated_days === 1 ? "día" : "días"}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">Incluye</p>
            <p className="text-xs text-[#1E293B] leading-relaxed whitespace-pre-wrap">{quote.scope}</p>
          </div>

          {quote.excludes && (
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">No incluye</p>
              <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-wrap">{quote.excludes}</p>
            </div>
          )}

          {quote.valid_until && (
            <p className={`text-[11px] flex items-center gap-1.5 ${expired ? "text-red-600" : "text-[#6B7280]"}`}>
              <Clock className="h-3 w-3" />
              {expired ? "Venció el" : "Válida hasta el"} {fmtDate(quote.valid_until)}
            </p>
          )}
        </div>

        {quote.status === "pendiente" && (
          <div className="px-4 pb-4 flex gap-2">
            {isClient && (
              <>
                <button type="button" disabled={processing} onClick={() => onAccept(quote)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors disabled:opacity-50">
                  {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Aceptar y agendar
                </button>
                <button type="button" disabled={processing} onClick={() => onReject(quote)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Rechazar
                </button>
              </>
            )}
            {isProvider && (
              <button type="button" disabled={processing} onClick={() => onCancel(quote)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Cancelar cotización
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── JobCard ───────────────────────────────────────────── */

const JOB_STATUS: Record<string, { label: string; cls: string }> = {
  agendado:            { label: "Agendado",                cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente_confirmar: { label: "Esperando confirmación",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmado:          { label: "Confirmado",              cls: "bg-green-50 text-green-700 border-green-200" },
  cancelado:           { label: "Cancelado",               cls: "bg-gray-100 text-gray-600 border-gray-200" },
  disputa:             { label: "En disputa",              cls: "bg-red-50 text-red-700 border-red-200" },
};

function JobCard({
  job, currentUserId, onComplete, onConfirm, processing,
}: {
  job: Job; currentUserId: string;
  onComplete: (j: Job) => void;
  onConfirm: (j: Job) => void;
  processing: boolean;
}) {
  const isProvider = job.provider_id === currentUserId;
  const isClient   = job.client_id === currentUserId;
  const st = JOB_STATUS[job.status] ?? JOB_STATUS.agendado;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-[#1D9E75]/25 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-[#085041] flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-white truncate">{job.title}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>{st.label}</span>
        </div>

        <div className="px-4 py-3.5 space-y-2">
          <p className="text-lg font-extrabold text-[#085041]">{soles(job.amount)}</p>

          {job.completed_at && (
            <p className="text-[11px] text-[#6B7280]">
              El proveedor lo marcó como completado el {fmtDate(job.completed_at)}
            </p>
          )}
          {job.confirmed_at && (
            <p className="text-[11px] text-green-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmado por el cliente el {fmtDate(job.confirmed_at)}
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          {isProvider && job.status === "agendado" && (
            <button type="button" disabled={processing} onClick={() => onComplete(job)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors disabled:opacity-50">
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Marcar servicio como completado
            </button>
          )}

          {isProvider && job.status === "pendiente_confirmar" && (
            <p className="text-[11px] text-[#6B7280] text-center leading-relaxed">
              Esperando que el cliente confirme. Solo su confirmación cuenta
              para tu reputación y para el sorteo.
            </p>
          )}

          {isClient && job.status === "pendiente_confirmar" && (
            <button type="button" disabled={processing} onClick={() => onConfirm(job)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors disabled:opacity-50">
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
              Confirmar y calificar
            </button>
          )}

          {isClient && job.status === "agendado" && (
            <p className="text-[11px] text-[#6B7280] text-center leading-relaxed">
              Cuando el proveedor termine, lo marcará aquí y podrás confirmar y calificar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── QuoteModal ────────────────────────────────────────── */

function QuoteModal({
  onClose, onSubmit, submitting, quotesLeft,
}: {
  onClose: () => void;
  onSubmit: (form: QuoteFormState) => void;
  submitting: boolean;
  quotesLeft: number | null;
}) {
  const [form, setForm] = useState<QuoteFormState>({
    amount: "", scope: "", excludes: "", estimated_days: "", valid_until: "",
  });

  const set = (key: keyof QuoteFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const labelClass = "block text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent";

  const valid = Number(form.amount) > 0 && form.scope.trim().length > 0;
  const outOfQuotes = quotesLeft !== null && quotesLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#085041]">Enviar cotización</h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              {quotesLeft === null
                ? "Cotizaciones ilimitadas con tu plan"
                : `Te quedan ${quotesLeft} cotizaciones este mes`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {outOfQuotes ? (
          <div className="px-5 py-8 text-center space-y-3">
            <p className="text-sm font-bold text-[#085041]">Llegaste al límite del plan Básico</p>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Ya usaste todas tus cotizaciones de este mes. Con el plan Pro son
              ilimitadas y además entras al sorteo mensual de tu categoría.
            </p>
            <Link href="/dashboard/plan"
              className="inline-block px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors">
              Ver el plan Pro
            </Link>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className={labelClass}>Monto (S/) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")}
                placeholder="150.00" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Qué incluye *</label>
              <textarea rows={3} value={form.scope} onChange={set("scope")}
                placeholder="Ej. Reparación de la tubería, materiales y mano de obra."
                className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className={labelClass}>Qué no incluye</label>
              <textarea rows={2} value={form.excludes} onChange={set("excludes")}
                placeholder="Ej. Repuestos adicionales si la tubería está dañada."
                className={`${inputClass} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Días estimados</label>
                <input type="number" min="0" value={form.estimated_days} onChange={set("estimated_days")}
                  placeholder="2" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Válida hasta</label>
                <input type="date" value={form.valid_until} onChange={set("valid_until")} className={inputClass} />
              </div>
            </div>

            <button type="button" disabled={!valid || submitting} onClick={() => onSubmit(form)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#085041] text-white text-sm font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-40">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
              Enviar cotización
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ConfirmModal (confirmar + calificar en un paso) ───── */

function ConfirmModal({
  job, onClose, onSubmit, submitting,
}: {
  job: Job;
  onClose: () => void;
  onSubmit: (stars: number, comment: string) => void;
  submitting: boolean;
}) {
  const [stars, setStars]     = useState(0);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-[#085041]">Confirmar y calificar</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Confirmas que <strong className="text-[#1E293B]">{job.title}</strong> por{" "}
            <strong className="text-[#1E293B]">{soles(job.amount)}</strong> se realizó.
            Tu confirmación cierra el servicio y te da puntos.
          </p>

          <div>
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-2">Tu calificación *</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} estrellas`}
                  className="transition-transform hover:scale-110">
                  <Star className={`h-8 w-8 ${n <= stars ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase tracking-wide mb-1">
              Comentario (opcional)
            </label>
            <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
              placeholder="¿Cómo te fue con el servicio?"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
          </div>

          <button type="button" disabled={stars === 0 || submitting} onClick={() => onSubmit(stars, comment)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors disabled:opacity-40">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar servicio
          </button>
          <p className="text-[10px] text-[#6B7280] text-center leading-relaxed">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty states ──────────────────────────────────────── */

function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mb-4">
        <MessageCircle className="h-7 w-7 text-[#1D9E75]" />
      </div>
      <p className="text-sm font-bold text-[#085041]">Elige una conversación</p>
      <p className="text-xs text-[#6B7280] mt-1 max-w-xs leading-relaxed">
        Aquí acuerdas el precio, cierras el servicio y lo confirmas.
      </p>
    </div>
  );
}

function NoConversations() {
  return (
    <div className="p-6 text-center">
      <p className="text-xs font-semibold text-[#085041]">Todavía no tienes conversaciones</p>
      <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
        Cuando contactes a alguien aparecerá aquí.
      </p>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────── */

function MensajesInner() {
  const searchParams = useSearchParams();
  const convParam    = searchParams.get("conv");

  const supabase = useRef(createClient()).current;

  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [conversations,   setConversations]   = useState<ConvItem[]>([]);
  const [loadingConvs,    setLoadingConvs]    = useState(true);
  const [selectedConvId,  setSelectedConvId]  = useState<string | null>(null);
  const [messages,        setMessages]        = useState<MsgRow[]>([]);
  const [loadingMsgs,     setLoadingMsgs]     = useState(false);
  const [input,           setInput]           = useState("");
  const [sending,         setSending]         = useState(false);
  const [search,          setSearch]          = useState("");

  const [quotes,          setQuotes]          = useState<Quote[]>([]);
  const [jobs,            setJobs]            = useState<Job[]>([]);
  const [showQuoteForm,   setShowQuoteForm]   = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [processingId,    setProcessingId]    = useState<string | null>(null);
  const [quotesLeft,      setQuotesLeft]      = useState<number | null>(null);
  const [confirmingJob,   setConfirmingJob]   = useState<Job | null>(null);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const currentUserIdRef  = useRef<string | null>(null);
  const conversationsRef  = useRef<ConvItem[]>([]);
  const lastMsgTimeRef    = useRef<string | null>(null);

  useEffect(() => { selectedConvIdRef.current = selectedConvId; }, [selectedConvId]);
  useEffect(() => { currentUserIdRef.current  = currentUserId;  }, [currentUserId]);
  useEffect(() => { conversationsRef.current  = conversations;  }, [conversations]);

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  /* ── 1. Usuario y rol ──────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      if (!user) { setLoadingConvs(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setCurrentUserRole(profile?.role ?? null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 2. Conversaciones ─────────────────────────────────── */
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
        .from("profiles").select("id, name, business_name").in("id", otherIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: { id: string; name: string | null; business_name: string | null }) => {
        nameMap[p.id] = p.business_name || p.name || "Usuario";
      });

      setConversations(convs.map((c: ConvRow) => {
        const isP1  = c.participant_1 === currentUserId;
        const other = isP1 ? c.participant_2 : c.participant_1;
        return { ...c, other_user_id: other, other_user_name: nameMap[other] ?? "Usuario", my_unread: isP1 ? c.unread_count_p1 : c.unread_count_p2 };
      }));
      setLoadingConvs(false);
    }
    load();
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 3. Selección desde la URL ─────────────────────────── */
  useEffect(() => {
    if (!convParam || conversations.length === 0) return;
    if (conversations.some(c => c.id === convParam)) setSelectedConvId(convParam);
  }, [convParam, conversations]);

  /* ── 4. Cargar hilo al cambiar de conversación ─────────── */
  useEffect(() => {
    if (!selectedConvId || !currentUserId) return;

    lastMsgTimeRef.current = null;
    setLoadingMsgs(true);
    setMessages([]); setQuotes([]); setJobs([]);

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

    supabase.from("quotes").select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setQuotes((data as Quote[]) ?? []));

    supabase.from("jobs").select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setJobs((data as Job[]) ?? []));

    // Marca leído en servidor (también marca los mensajes) y en local.
    const conv = conversationsRef.current.find(c => c.id === selectedConvId);
    if (conv && conv.my_unread > 0) {
      supabase.rpc("mark_conversation_read", { p_conversation_id: selectedConvId }).then(() => {});
      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, my_unread: 0 } : c));
    }
  }, [selectedConvId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 5. Poll del hilo cada 3 s ─────────────────────────── */
  useEffect(() => {
    if (!selectedConvId || !currentUserId) return;

    const tick = async () => {
      const since  = lastMsgTimeRef.current;
      const convId = selectedConvIdRef.current;
      if (!since || !convId) return;

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

      // Cotizaciones y trabajos son pocos por conversación: se refrescan enteros.
      const { data: qData } = await supabase.from("quotes").select("*")
        .eq("conversation_id", convId).order("created_at", { ascending: true });
      if (qData) setQuotes(qData as Quote[]);

      const { data: jData } = await supabase.from("jobs").select("*")
        .eq("conversation_id", convId).order("created_at", { ascending: true });
      if (jData) setJobs(jData as Job[]);
    };

    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [selectedConvId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 6. Poll de la lista cada 5 s ──────────────────────── */
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

  /* ── 7. Auto-scroll ────────────────────────────────────── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, quotes, jobs]);

  /* ── Enviar mensaje ────────────────────────────────────── */
  /* Ojo: NO se toca `conversations` aquí. El trigger bump_conversation
     ya escribe last_message y sube el contador del otro participante;
     hacerlo también desde el cliente lo contaba dos veces. */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedConvId || !currentUserId) return;

    const now    = new Date().toISOString();
    const tempId = `temp-${now}-${Math.random()}`;

    setInput("");
    setSending(true);
    setMessages(prev => [
      ...prev,
      { id: tempId, conversation_id: selectedConvId, sender_id: currentUserId, content: text, kind: "text", ref_id: null, created_at: now } as MsgRow,
    ]);

    const { data: saved, error } = await supabase.from("messages")
      .insert({ conversation_id: selectedConvId, sender_id: currentUserId, content: text })
      .select().single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert(`No se pudo enviar el mensaje:\n${error.message}`);
    } else if (saved) {
      setMessages(prev => prev.map(m => m.id === tempId ? (saved as MsgRow) : m));
      lastMsgTimeRef.current = (saved as MsgRow).created_at;
      setConversations(prev =>
        prev.map(c => c.id === selectedConvId ? { ...c, last_message: text, last_message_at: now } : c)
          .sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          })
      );
    }

    setSending(false);
  };

  /* ── Abrir el formulario de cotización ─────────────────── */
  const openQuoteForm = async () => {
    if (currentUserId) {
      const { data } = await supabase.rpc("provider_quotes_left", { p_provider_id: currentUserId });
      setQuotesLeft(data === null || data === undefined ? null : Number(data));
    }
    setShowQuoteForm(true);
  };

  /* ── Enviar cotización ─────────────────────────────────── */
  /* `period` lo pone el trigger enforce_quote_limit (hora de Lima),
     por eso no se manda desde aquí. Ese mismo trigger es el que
     rechaza la inserción si el plan Básico ya agotó el mes. */
  const handleSubmitQuote = async (form: QuoteFormState) => {
    if (!currentUserId || !selectedConvId || !selectedConv) return;
    setSubmitting(true);

    const { data, error } = await supabase.from("quotes").insert({
      conversation_id: selectedConvId,
      provider_id:     currentUserId,
      client_id:       selectedConv.other_user_id,
      service_id:      selectedConv.subject_type === "service" ? selectedConv.subject_id : null,
      request_id:      selectedConv.subject_type === "request" ? selectedConv.subject_id : null,
      amount:          Number(form.amount),
      scope:           form.scope.trim(),
      excludes:        form.excludes.trim() || null,
      estimated_days:  form.estimated_days ? parseInt(form.estimated_days) : null,
      valid_until:     form.valid_until || null,
    }).select().single();

    if (error) {
      const limite = error.message.includes("Límite de cotizaciones");
      alert(limite
        ? "Llegaste al límite de cotizaciones del plan Básico este mes.\nCon el plan Pro son ilimitadas."
        : `No se pudo enviar la cotización:\n${error.message}`);
      setSubmitting(false);
      return;
    }

    if (data) {
      const q = data as Quote;
      setQuotes(prev => [...prev, q]);
      await supabase.from("messages").insert({
        conversation_id: selectedConvId,
        sender_id:       currentUserId,
        content:         `Te envié una cotización por ${soles(q.amount)}.`,
        kind:            "quote",
        ref_id:          q.id,
      });
    }

    setShowQuoteForm(false);
    setSubmitting(false);
  };

  /* ── Aceptar cotización → crea el trabajo ──────────────── */
  const handleAcceptQuote = async (quote: Quote) => {
    setProcessingId(quote.id);
    const { error } = await supabase.rpc("accept_quote", { p_quote_id: quote.id });
    if (error) alert(`No se pudo aceptar la cotización:\n${error.message}`);
    await refreshThread();
    setProcessingId(null);
  };

  const handleRejectQuote = async (quote: Quote) => {
    setProcessingId(quote.id);
    const { error } = await supabase.from("quotes").update({ status: "rechazada", responded_at: new Date().toISOString() }).eq("id", quote.id);
    if (error) alert(`No se pudo rechazar:\n${error.message}`);
    else setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: "rechazada" } : q));
    setProcessingId(null);
  };

  const handleCancelQuote = async (quote: Quote) => {
    setProcessingId(quote.id);
    const { error } = await supabase.from("quotes").update({ status: "cancelada" }).eq("id", quote.id);
    if (error) alert(`No se pudo cancelar:\n${error.message}`);
    else setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: "cancelada" } : q));
    setProcessingId(null);
  };

  /* ── Proveedor marca completado ────────────────────────── */
  const handleCompleteJob = async (job: Job) => {
    setProcessingId(job.id);
    const { error } = await supabase.rpc("mark_job_completed", { p_job_id: job.id });
    if (error) alert(`No se pudo marcar como completado:\n${error.message}`);
    await refreshThread();
    setProcessingId(null);
  };

  /* ── Cliente confirma + califica (un solo paso) ────────── */
  const handleConfirmJob = async (stars: number, comment: string) => {
    if (!confirmingJob) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("confirm_job", {
      p_job_id: confirmingJob.id, p_stars: stars, p_comment: comment.trim() || null,
    });
    if (error) alert(`No se pudo confirmar el servicio:\n${error.message}`);
    await refreshThread();
    setConfirmingJob(null);
    setSubmitting(false);
  };

  /* ── Refresco puntual tras una acción ──────────────────── */
  const refreshThread = async () => {
    const convId = selectedConvIdRef.current;
    if (!convId) return;
    const [{ data: qData }, { data: jData }, { data: mData }] = await Promise.all([
      supabase.from("quotes").select("*").eq("conversation_id", convId).order("created_at", { ascending: true }),
      supabase.from("jobs").select("*").eq("conversation_id", convId).order("created_at", { ascending: true }),
      supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true }),
    ]);
    if (qData) setQuotes(qData as Quote[]);
    if (jData) setJobs(jData as Job[]);
    if (mData) {
      const msgs = mData as MsgRow[];
      setMessages(msgs);
      if (msgs.length > 0) lastMsgTimeRef.current = msgs[msgs.length - 1].created_at;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filtered = conversations.filter(c =>
    c.other_user_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.last_message ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((s, c) => s + c.my_unread, 0);

  // Lo que le toca hacer al usuario en esta conversación.
  const pendingForMe = currentUserRole === "proveedor"
    ? jobs.filter(j => j.provider_id === currentUserId && j.status === "agendado").length
    : quotes.filter(q => q.status === "pendiente" && q.client_id === currentUserId).length +
      jobs.filter(j => j.client_id === currentUserId && j.status === "pendiente_confirmar").length;

  const chatItems: ChatItem[] = [
    ...messages.filter(m => m.kind !== "quote").map(m => ({ type: "message" as const, id: m.id, created_at: m.created_at, data: m })),
    ...quotes.map(q => ({ type: "quote" as const, id: q.id, created_at: q.created_at, data: q })),
    ...jobs.map(j   => ({ type: "job"   as const, id: j.id, created_at: j.created_at, data: j })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Lista de conversaciones */}
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

      {/* Panel del hilo */}
      <div className={`${selectedConvId ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden bg-gray-50`}>
        {!selectedConv ? (
          <EmptyChat />
        ) : (
          <>
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center gap-3 shadow-sm">
              <button type="button" onClick={() => setSelectedConvId(null)}
                className="lg:hidden text-gray-400 hover:text-[#085041] transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Link href={`/perfil/${selectedConv.other_user_id}`}
                className="w-8 h-8 rounded-lg bg-[#085041] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:bg-[#1D9E75] transition-colors">
                {initials(selectedConv.other_user_name)}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#085041] truncate">{selectedConv.other_user_name}</p>
                <p className="text-xs text-[#6B7280]">
                  {pendingForMe > 0 ? `${pendingForMe} acción pendiente` : "Conversación privada"}
                </p>
              </div>

              {/* Cotizar — solo el Proveedor */}
              {currentUserRole === "proveedor" && (
                <button type="button" onClick={openQuoteForm}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors flex-shrink-0 shadow-sm">
                  <Handshake className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cotizar</span>
                </button>
              )}
            </div>

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
                    ) : item.type === "quote" ? (
                      <QuoteCard key={item.id} quote={item.data} currentUserId={currentUserId!}
                        onAccept={handleAcceptQuote} onReject={handleRejectQuote} onCancel={handleCancelQuote}
                        processing={processingId === item.id} />
                    ) : (
                      <JobCard key={item.id} job={item.data} currentUserId={currentUserId!}
                        onComplete={handleCompleteJob} onConfirm={setConfirmingJob}
                        processing={processingId === item.id} />
                    )
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

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
              <p className="text-[10px] text-[#6B7280] mt-1.5 text-center">Mensajes en tiempo real · Apurape</p>
            </div>
          </>
        )}
      </div>

      {showQuoteForm && (
        <QuoteModal
          onClose={() => setShowQuoteForm(false)}
          onSubmit={handleSubmitQuote}
          submitting={submitting}
          quotesLeft={quotesLeft}
        />
      )}

      {confirmingJob && (
        <ConfirmModal
          job={confirmingJob}
          onClose={() => setConfirmingJob(null)}
          onSubmit={handleConfirmJob}
          submitting={submitting}
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
