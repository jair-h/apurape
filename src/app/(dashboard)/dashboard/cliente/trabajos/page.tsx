"use client";

/* Contrataciones del Cliente. Aquí ocurre el paso que sostiene todo el
 * sistema: confirmar el servicio y calificar, en una sola acción. */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, Star, MessageCircle, CheckCircle2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface JobRow {
  id: string; conversation_id: string | null; title: string;
  amount: number; status: string;
  completed_at: string | null; confirmed_at: string | null; created_at: string;
  provider_id: string;
  provider: { name: string | null; business_name: string | null } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  agendado:            { label: "Agendado",            cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente_confirmar: { label: "Por confirmar",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmado:          { label: "Confirmado",          cls: "bg-green-50 text-green-700 border-green-200" },
  cancelado:           { label: "Cancelado",           cls: "bg-gray-100 text-gray-600 border-gray-200" },
  disputa:             { label: "En disputa",          cls: "bg-red-50 text-red-700 border-red-200" },
};

function ConfirmModal({
  job, onClose, onSubmit, submitting,
}: {
  job: JobRow; onClose: () => void;
  onSubmit: (stars: number, comment: string) => void; submitting: boolean;
}) {
  const [stars, setStars]     = useState(0);
  const [comment, setComment] = useState("");
  const providerName = job.provider?.business_name || job.provider?.name || "el proveedor";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">Confirmar y calificar</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Confirmas que <strong className="text-gray-900">{providerName}</strong> realizó{" "}
            <strong className="text-gray-900">{job.title}</strong> por{" "}
            <strong className="text-gray-900">S/ {Number(job.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong>.
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
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0E9384] focus:border-transparent" />
          </div>

          <button type="button" disabled={stars === 0 || submitting} onClick={() => onSubmit(stars, comment)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0E9384] text-white text-sm font-bold hover:bg-[#0B7268] transition-colors disabled:opacity-40">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar servicio
          </button>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Ganas puntos por confirmar. Esta acción no se puede deshacer.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClienteTrabajosPage() {
  const supabase = createClient();

  const [jobs, setJobs]       = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<JobRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("jobs")
      .select("id, conversation_id, title, amount, status, completed_at, confirmed_at, created_at, provider_id, provider:profiles!jobs_provider_id_fkey(name, business_name)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    setJobs((data as unknown as JobRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async (stars: number, comment: string) => {
    if (!confirming) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("confirm_job", {
      p_job_id: confirming.id, p_stars: stars, p_comment: comment.trim() || null,
    });
    if (error) alert(`No se pudo confirmar:\n${error.message}`);
    else await load();
    setConfirming(null);
    setSubmitting(false);
  };

  const porConfirmar = jobs.filter(j => j.status === "pendiente_confirmar");

  if (loading) {
    return <div className="flex flex-1 items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">Mis contrataciones</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Servicios que contrataste y su estado.</p>
      </div>

      {porConfirmar.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <Star className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Tienes {porConfirmar.length} {porConfirmar.length === 1 ? "servicio" : "servicios"} por confirmar
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Tu confirmación cierra el servicio, califica al proveedor y te da puntos.
            </p>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900">Todavía no contrataste nada</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto leading-relaxed">
            Cuando aceptes una cotización en el chat, el servicio aparecerá aquí.
          </p>
          <Link href="/servicios"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors">
            Buscar servicios
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(j => {
            const st = STATUS[j.status] ?? STATUS.agendado;
            const providerName = j.provider?.business_name || j.provider?.name || "Proveedor";
            return (
              <div key={j.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{j.title}</p>
                    <Link href={`/perfil/${j.provider_id}`}
                      className="text-[11px] text-[#6B7280] hover:text-[#0E9384] transition-colors">
                      {providerName}
                    </Link>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <p className="text-base font-extrabold text-[#0E9384] mb-2">
                  S/ {Number(j.amount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>

                {j.confirmed_at && (
                  <p className="text-[11px] text-green-700 inline-flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3 w-3" />
                    Confirmado el {new Date(j.confirmed_at).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {j.status === "pendiente_confirmar" && (
                    <button type="button" onClick={() => setConfirming(j)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7268] transition-colors">
                      <Star className="h-3.5 w-3.5" /> Confirmar y calificar
                    </button>
                  )}
                  {j.status === "agendado" && (
                    <p className="text-[11px] text-[#6B7280]">
                      Cuando {providerName} termine, lo marcará y podrás confirmar.
                    </p>
                  )}
                  {j.conversation_id && (
                    <Link href={`/dashboard/mensajes?conv=${j.conversation_id}`}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[#6B7280] text-xs font-bold hover:border-[#0E9384] hover:text-[#0E9384] transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirming && (
        <ConfirmModal job={confirming} onClose={() => setConfirming(null)}
          onSubmit={handleConfirm} submitting={submitting} />
      )}
    </div>
  );
}
