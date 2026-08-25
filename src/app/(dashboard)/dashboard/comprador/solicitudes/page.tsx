"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Calendar, Globe, ChevronDown, ChevronUp, Loader2, Inbox,
  MessageSquare, CheckCircle2, Star, Award, Users, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

/* ─── Types ───────────────────────────────────────────────── */

interface Solicitud {
  id: string;
  product: string;
  variety: string | null;
  volume_tm: number;
  incoterm: string | null;
  delivery_date: string | null;
  destination_country: string | null;
  status: string;
  created_at: string;
}

interface RespRow {
  id: string;
  rfq_id: string;
  responder_id: string;
  offered_price_usd: number;
  price_unit: string;
  available_volume_tm: number;
  shipment_date: string | null;
  certifications: string[] | null;
  notes: string | null;
  status: string;
  producer_name: string;
  producer_rating: number | null;
  producer_verified: boolean;
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

/* ─── Page ────────────────────────────────────────────────── */

export default function SolicitudesCompradorPage() {
  const router = useRouter();
  const [userId, setUserId]           = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [responses, setResponses]     = useState<RespRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [accepting, setAccepting]     = useState<string | null>(null);
  const [contacting, setContacting]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: rfqs } = await supabase
        .from("rfq_commercial")
        .select("id, product, variety, volume_tm, incoterm, delivery_date, destination_country, status, created_at")
        .eq("exporter_id", user.id)
        .order("created_at", { ascending: false });

      const myRfqs = rfqs ?? [];
      setSolicitudes(myRfqs);

      if (myRfqs.length === 0) { setLoading(false); return; }

      const rfqIds = myRfqs.map((r) => r.id);
      const { data: respRows } = await supabase
        .from("rfq_responses")
        .select("id, rfq_id, responder_id, offered_price_usd, price_unit, available_volume_tm, shipment_date, certifications, notes, status")
        .in("rfq_id", rfqIds);

      const rows = respRows ?? [];
      const responderIds = [...new Set(rows.map((r) => r.responder_id))];
      const profileMap: Record<string, { name: string; rating: number | null; verified: boolean }> = {};

      if (responderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name, rating, verified")
          .in("user_id", responderIds);
        (profiles ?? []).forEach((p) => {
          profileMap[p.user_id] = { name: p.business_name || p.name || "Proveedor", rating: p.rating ?? null, verified: p.verified ?? false };
        });
      }

      setResponses(rows.map((r) => ({
        ...r,
        producer_name: profileMap[r.responder_id]?.name ?? "Proveedor",
        producer_rating: profileMap[r.responder_id]?.rating ?? null,
        producer_verified: profileMap[r.responder_id]?.verified ?? false,
      })));
      setLoading(false);
    }
    load();
  }, []);

  const handleContactar = async (responderId: string) => {
    if (!userId) return;
    setContacting(responderId);
    const convId = await findOrCreateConversation(userId, responderId);
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
  };

  const handleAceptar = async (response: RespRow) => {
    if (!userId) return;
    setAccepting(response.id);
    const supabase = createClient();
    const sol = solicitudes.find((s) => s.id === response.rfq_id);

    // 1. Update rfq statuses
    await Promise.all([
      supabase.from("rfq_responses").update({ status: "accepted" }).eq("id", response.id),
      supabase.from("rfq_commercial").update({ status: "in_progress" }).eq("id", response.rfq_id),
    ]);

    // 2. Create operation record
    let opNumber: number | string = "—";
    let opId: string | null = null;
    console.log("[handleAceptar] userId:", userId, "rfq_id:", response.rfq_id, "sol:", sol, "solicitudes count:", solicitudes.length);
    if (sol) {
      const insertPayload = {
        type: "commercial",
        buyer_id: userId,
        seller_id: response.responder_id,
        rfq_commercial_id: response.rfq_id,
        rfq_response_id: response.id,
        product: sol.product,
        variety: sol.variety ?? null,
        volume_tm: sol.volume_tm,
        unit: "TM",
        agreed_price_usd: response.offered_price_usd,
        price_unit: response.price_unit,
        incoterm: sol.incoterm ?? null,
        delivery_date: sol.delivery_date ?? null,
        destination_country: sol.destination_country ?? null,
        total_value_usd: sol.volume_tm * 1000 * response.offered_price_usd,
        status: "confirmed",
      };
      console.log("[operations] insertando:", insertPayload);
      const { data: op, error: opError } = await supabase
        .from("operations")
        .insert(insertPayload)
        .select("id, operation_number")
        .single();
      if (opError) {
        console.error("[operations] error al crear operación:", opError);
        alert(`Error al crear la operación:\n${opError.message}\n\nCódigo: ${opError.code}`);
        setAccepting(null);
        return;
      }
      if (op) { opId = op.id; opNumber = op.operation_number ?? "—"; }
    }

    // 3. First tracking entry
    if (opId) {
      await supabase.from("operation_tracking").insert({
        operation_id: opId, stage: "confirmed", updated_by: userId,
      });
    }

    // 4. Get/create conversation
    const convId = await findOrCreateConversation(userId, response.responder_id);

    // 5. Auto-message
    if (convId && sol) {
      const msgText = `Acuerdo confirmado: ${sol.volume_tm} TM de ${sol.product} a USD ${response.offered_price_usd}/kg. Operación #${opNumber}`;
      const now = new Date().toISOString();
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1, unread_count_p1, unread_count_p2")
        .eq("id", convId).single();
      await supabase.from("messages").insert({ conversation_id: convId, sender_id: userId, content: msgText });
      if (conv) {
        const isP1  = conv.participant_1 === userId;
        const field = isP1 ? "unread_count_p2" : "unread_count_p1";
        const cnt   = isP1 ? conv.unread_count_p2 : conv.unread_count_p1;
        await supabase.from("conversations").update({
          last_message: msgText, last_message_at: now, [field]: cnt + 1,
        }).eq("id", convId);
      }
    }

    // 6. Update local state
    setSolicitudes((prev) => prev.map((s) => s.id === response.rfq_id ? { ...s, status: "in_progress" } : s));
    setResponses((prev) => prev.map((r) =>
      r.id === response.id ? { ...r, status: "accepted" }
      : r.rfq_id === response.rfq_id && r.id !== response.id ? { ...r, status: "rejected" }
      : r
    ));
    setAccepting(null);
    if (convId) router.push(`/dashboard/mensajes?conv=${convId}`);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Mis solicitudes de compra</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Compara las ofertas recibidas y acepta la mejor.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/comprador/solicitud/nueva")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Publicar solicitud
        </button>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#085041]">Aún no has publicado solicitudes de compra</p>
          <p className="text-xs text-[#6B7280] mt-1 mb-5">Publica una solicitud y los productores te enviarán sus ofertas.</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/comprador/solicitud/nueva")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors">
            <Plus className="h-4 w-4" /> Publicar mi primera solicitud
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {solicitudes.map((s) => {
            const solResponses = responses.filter((r) => r.rfq_id === s.id);
            const isExpanded = expandedId === s.id;
            const statusCfg =
              s.status === "in_progress" ? { label: "En progreso", cls: "bg-[#E1F5EE] text-[#085041] border-green-200", dot: "bg-[#1D9E75]" }
              : s.status === "closed"     ? { label: "Cerrada",     cls: "bg-gray-100 text-gray-500 border-gray-200",     dot: "bg-gray-400" }
              :                             { label: "Abierta",     cls: "bg-blue-50 text-blue-700 border-blue-200",       dot: "bg-blue-400" };

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header — click to expand */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#085041] flex items-center justify-center text-white flex-shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1E293B]">{s.product}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-[#6B7280] flex-wrap">
                      <span>{s.volume_tm} TM</span>
                      {s.destination_country && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.destination_country}</span>}
                      {s.delivery_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(s.delivery_date)}</span>}
                      <span>{timeAgo(s.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className={`text-lg font-extrabold ${solResponses.length > 0 ? "text-[#1D9E75]" : "text-gray-300"}`}>
                        {solResponses.length}
                      </p>
                      <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">ofertas</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[#6B7280]" /> : <ChevronDown className="h-4 w-4 text-[#6B7280]" />}
                  </div>
                </button>

                {/* Expanded: comparison table */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {solResponses.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-[#6B7280]">Aún no hay ofertas para esta solicitud.</p>
                        <p className="text-xs text-gray-400 mt-1">Los productores verán tu solicitud y enviarán su oferta.</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Proveedor</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Precio</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Volumen</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Embarque</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Certificaciones</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Calificación</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {solResponses.map((r) => (
                                <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.status === "accepted" ? "bg-[#E1F5EE]/40" : ""}`}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-[#085041] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {r.producer_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-[#1E293B]">{r.producer_name}</p>
                                        {r.producer_verified && <span className="text-[9px] text-[#1D9E75] font-semibold">Verificado</span>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-[#085041]">USD {r.offered_price_usd}</p>
                                    <p className="text-[10px] text-[#6B7280]">/{r.price_unit}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-[#1E293B]">{r.available_volume_tm} TM</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-[#1E293B]">{fmtDate(r.shipment_date)}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {r.certifications && r.certifications.length > 0
                                        ? r.certifications.slice(0, 2).map((c) => (
                                            <span key={c} className="text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                              <Award className="h-2.5 w-2.5" />{c}
                                            </span>
                                          ))
                                        : <span className="text-[#6B7280]">—</span>}
                                      {r.certifications && r.certifications.length > 2 && (
                                        <span className="text-[9px] text-[#6B7280]">+{r.certifications.length - 2}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {r.producer_rating != null ? (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                        <span className="font-semibold text-[#1E293B]">{r.producer_rating.toFixed(1)}</span>
                                      </div>
                                    ) : <span className="text-[#6B7280]">—</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    {r.status === "accepted" ? (
                                      <div className="flex justify-end">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D9E75] bg-[#E1F5EE] px-2 py-1 rounded-lg">
                                          <CheckCircle2 className="h-3 w-3" />Aceptada
                                        </span>
                                      </div>
                                    ) : s.status === "in_progress" ? (
                                      <div className="flex justify-end">
                                        <span className="text-[10px] text-[#6B7280] italic">No seleccionada</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          disabled={!!contacting}
                                          onClick={() => handleContactar(r.responder_id)}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#085041] border border-[#085041] px-2.5 py-1.5 rounded-lg hover:bg-[#085041] hover:text-white transition-colors disabled:opacity-50">
                                          {contacting === r.responder_id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : <MessageSquare className="h-3 w-3" />}
                                          Contactar
                                        </button>
                                        <button
                                          type="button"
                                          disabled={accepting === r.id}
                                          onClick={() => handleAceptar(r)}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#1D9E75] px-2.5 py-1.5 rounded-lg hover:bg-[#085041] transition-colors disabled:opacity-50">
                                          {accepting === r.id
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : <CheckCircle2 className="h-3 w-3" />}
                                          Aceptar oferta
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {solResponses.some((r) => r.notes) && (
                          <div className="px-5 py-4 border-t border-gray-50 space-y-2">
                            <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Notas de proveedores</p>
                            {solResponses.filter((r) => r.notes).map((r) => (
                              <div key={r.id} className="flex gap-2 text-xs">
                                <span className="font-semibold text-[#085041] flex-shrink-0">{r.producer_name}:</span>
                                <span className="text-[#6B7280] italic">{r.notes}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

