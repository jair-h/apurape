"use client";

import { useState, useEffect } from "react";
import {
  X, Send, Loader2, CheckCircle2,
  Package, Calendar, Globe, Award, Inbox, ChevronDown,
  ChevronUp, Edit2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Types ───────────────────────────────────────────────── */

interface Solicitud {
  id: string;
  product: string;
  volume_tm: number;
  incoterm: string | null;
  delivery_date: string | null;
  destination_country: string | null;
  certification_required: string[] | null;
  specifications: string | null;
  notes: string | null;
  exporter_id: string;
  buyer_name: string;
  created_at: string;
}

interface MyResponse {
  id: string;
  rfq_id: string;
  offered_price_usd: number;
  price_unit: string;
  available_volume_tm: number;
  shipment_date: string | null;
  certifications: string[] | null;
  notes: string | null;
  status: string;
}

type FilterKey = "todas" | "sin_oferta" | "ofertada";

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

const inp = "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-[#1E293B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";
const lbl = "block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5";
const CERT_OPTIONS = ["GlobalGAP", "Orgánico USDA", "Fairtrade", "Orgánico EU", "HACCP", "ISO 22000", "BRC"];

/* ─── Offer Modal ─────────────────────────────────────────── */

function OfertaModal({
  solicitud, existingResponse, userId, onClose, onSaved,
}: {
  solicitud: Solicitud;
  existingResponse: MyResponse | null;
  userId: string;
  onClose: () => void;
  onSaved: (response: MyResponse) => void;
}) {
  const [precio, setPrecio]   = useState(existingResponse?.offered_price_usd?.toString() ?? "");
  const [volumen, setVolumen] = useState(existingResponse?.available_volume_tm?.toString() ?? "");
  const [fecha, setFecha]     = useState(existingResponse?.shipment_date ?? "");
  const [certs, setCerts]     = useState<string[]>(existingResponse?.certifications ?? []);
  const [notas, setNotas]     = useState(existingResponse?.notes ?? "");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const toggleCert = (c: string) =>
    setCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSave = async () => {
    if (!precio || !volumen || !fecha) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (existingResponse) {
      const { data, error: err } = await supabase
        .from("rfq_responses")
        .update({ offered_price_usd: parseFloat(precio), available_volume_tm: parseFloat(volumen), shipment_date: fecha, certifications: certs, notes: notas || null })
        .eq("id", existingResponse.id)
        .select()
        .single();
      setSaving(false);
      if (err || !data) { setError("Error al guardar. Intenta de nuevo."); return; }
      onSaved(data as MyResponse);
    } else {
      const { data, error: err } = await supabase
        .from("rfq_responses")
        .insert({ rfq_id: solicitud.id, responder_id: userId, offered_price_usd: parseFloat(precio), price_unit: "kg", available_volume_tm: parseFloat(volumen), shipment_date: fecha, certifications: certs, notes: notas || null, status: "pending" })
        .select()
        .single();
      setSaving(false);
      if (err || !data) { setError("Error al guardar. Intenta de nuevo."); return; }
      const { count: newCount } = await supabase.from("rfq_responses").select("id", { count: "exact", head: true }).eq("rfq_id", solicitud.id);
      supabase.from("rfq_commercial").update({ responses_count: newCount ?? 1 }).eq("id", solicitud.id).then(() => {});
      onSaved(data as MyResponse);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#085041] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{existingResponse ? "Editar mi oferta" : "Ofrecer mi producto"}</h3>
            <p className="text-[11px] text-green-300 mt-0.5">{solicitud.product} · {solicitud.volume_tm} TM buscados</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-[#6B7280] mb-0.5">Producto</p><p className="font-bold text-[#085041]">{solicitud.product}</p></div>
            <div><p className="text-[#6B7280] mb-0.5">Volumen buscado</p><p className="font-bold text-[#085041]">{solicitud.volume_tm} TM</p></div>
            <div><p className="text-[#6B7280] mb-0.5">Destino</p><p className="font-bold text-[#085041]">{solicitud.destination_country ?? "—"}</p></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Precio ofertado (USD/kg) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">$</span>
                <input type="number" placeholder="0.00" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={`${inp} pl-7`} />
              </div>
            </div>
            <div>
              <label className={lbl}>Volumen disponible *</label>
              <div className="relative">
                <input type="number" placeholder="0" min="0" step="0.5" value={volumen} onChange={(e) => setVolumen(e.target.value)} className={`${inp} pr-10`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">TM</span>
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Fecha tentativa de embarque *</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inp} />
          </div>

          <div>
            <label className={lbl}>Certificaciones disponibles</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CERT_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => toggleCert(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    certs.includes(c) ? "bg-[#085041] text-white border-[#085041]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Notas adicionales</label>
            <textarea rows={3} placeholder="Condiciones de pago, variedad, observaciones..." value={notas} onChange={(e) => setNotas(e.target.value)} className={`${inp} resize-none`} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-[#6B7280] hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving || !precio || !volumen || !fecha}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#085041] transition-colors disabled:opacity-50">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : <><Send className="h-4 w-4" /> {existingResponse ? "Actualizar oferta" : "Enviar oferta"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Solicitud Card ──────────────────────────────────────── */

function SolicitudCard({ s, myResponse, onOfrecer }: {
  s: Solicitud;
  myResponse: MyResponse | null;
  onOfrecer: (s: Solicitud, existing: MyResponse | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const responded = !!myResponse;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${responded ? "border-[#1D9E75]/40" : "border-gray-200"}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#085041] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(s.buyer_name || "C").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1E293B] truncate">{s.buyer_name}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{timeAgo(s.created_at)}</p>
          </div>
        </div>
        {responded ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-[#E1F5EE] text-[#085041] border-green-200 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />Oferta enviada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Sin oferta
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 mx-5" />

      <div className="px-5 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> Producto</p>
          <p className="text-sm font-semibold text-[#1E293B]">{s.product}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Volumen</p>
          <p className="text-sm font-semibold text-[#1E293B]">{s.volume_tm} TM</p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="h-3 w-3" /> Destino</p>
          <p className="text-sm font-semibold text-[#1E293B]">{s.destination_country ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Entrega</p>
          <p className="text-sm font-semibold text-[#1E293B]">{fmtDate(s.delivery_date)}</p>
        </div>
      </div>

      {(s.incoterm || (s.certification_required && s.certification_required.length > 0)) && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          {s.incoterm && <span className="text-[10px] font-bold bg-gray-100 text-[#6B7280] px-2 py-1 rounded-lg">{s.incoterm}</span>}
          {s.certification_required?.map((c) => (
            <span key={c} className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
              <Award className="h-2.5 w-2.5" />{c}
            </span>
          ))}
        </div>
      )}

      {(s.specifications || s.notes || responded) && (
        <>
          <div className="border-t border-gray-100 mx-5" />
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-[#6B7280] hover:text-[#085041] transition-colors">
            <span>{expanded ? "Ocultar detalles" : "Ver detalles"}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {expanded && (
            <div className="px-5 pb-4 space-y-3">
              {s.specifications && (
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Especificaciones</p>
                  <p className="text-xs text-[#1E293B] bg-gray-50 rounded-lg p-3">{s.specifications}</p>
                </div>
              )}
              {s.notes && <p className="text-xs text-[#6B7280] italic">&quot;{s.notes}&quot;</p>}
              {myResponse && (
                <div className="bg-[#E1F5EE] rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-[#085041] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />Tu oferta enviada
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><p className="text-[#6B7280]">Precio</p><p className="font-bold text-[#085041]">USD {myResponse.offered_price_usd}/{myResponse.price_unit}</p></div>
                    <div><p className="text-[#6B7280]">Volumen</p><p className="font-bold text-[#085041]">{myResponse.available_volume_tm} TM</p></div>
                    <div><p className="text-[#6B7280]">Embarque</p><p className="font-bold text-[#085041]">{fmtDate(myResponse.shipment_date)}</p></div>
                  </div>
                  {myResponse.notes && <p className="text-xs text-[#085041]/70 italic">&quot;{myResponse.notes}&quot;</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="px-5 pb-4">
        <button type="button" onClick={() => onOfrecer(s, myResponse)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            responded ? "border border-[#1D9E75] text-[#1D9E75] hover:bg-[#E1F5EE]" : "bg-[#1D9E75] text-white hover:bg-[#085041]"
          }`}>
          {responded ? <><Edit2 className="h-4 w-4" />Editar mi oferta</> : <><Send className="h-4 w-4" />Ofrecer mi producto</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function SolicitudesDisponiblesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [myResponses, setMyResponses] = useState<Record<string, MyResponse>>({});
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<FilterKey>("todas");
  const [ofertandoFor, setOfertandoFor] = useState<{ s: Solicitud; existing: MyResponse | null } | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [rfqRes, responseRes] = await Promise.all([
        supabase
          .from("rfq_commercial")
          .select("id, product, volume_tm, incoterm, delivery_date, destination_country, certification_required, specifications, notes, exporter_id, created_at")
          .eq("status", "open")
          .neq("exporter_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("rfq_responses")
          .select("id, rfq_id, offered_price_usd, price_unit, available_volume_tm, shipment_date, certifications, notes, status")
          .eq("responder_id", user.id),
      ]);

      const respMap: Record<string, MyResponse> = {};
      (responseRes.data ?? []).forEach((r) => { respMap[r.rfq_id] = r as MyResponse; });
      setMyResponses(respMap);

      const rfqs = rfqRes.data ?? [];
      const publisherIds = [...new Set(rfqs.map((r) => r.exporter_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (publisherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, business_name")
          .in("user_id", publisherIds);
        (profiles ?? []).forEach((p) => { nameMap[p.user_id] = p.business_name || p.name || "Empresa compradora"; });
      }

      setSolicitudes(rfqs.map((r) => ({ ...r, buyer_name: nameMap[r.exporter_id] ?? "Empresa compradora" })));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = solicitudes.filter((s) => {
    if (filter === "sin_oferta") return !myResponses[s.id];
    if (filter === "ofertada")   return !!myResponses[s.id];
    return true;
  });

  const counts = {
    todas:      solicitudes.length,
    sin_oferta: solicitudes.filter((s) => !myResponses[s.id]).length,
    ofertada:   solicitudes.filter((s) => !!myResponses[s.id]).length,
  };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "todas",      label: "Todas" },
    { key: "sin_oferta", label: "Sin oferta" },
    { key: "ofertada",   label: "Ya ofertadas" },
  ];

  const handleSaved = (response: MyResponse) => {
    setMyResponses((prev) => ({ ...prev, [response.rfq_id]: response }));
    setOfertandoFor(null);
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" /></div>;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Solicitudes disponibles</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Compradores buscan exportadores. Envía tu oferta directamente.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Disponibles",  value: counts.todas,      cls: "text-[#085041]" },
            { label: "Sin oferta",   value: counts.sin_oferta, cls: "text-blue-600" },
            { label: "Ya ofertadas", value: counts.ofertada,   cls: "text-[#1D9E75]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm text-center">
              <p className={`text-2xl font-extrabold ${stat.cls}`}>{stat.value}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                filter === f.key ? "bg-[#085041] text-white border-[#085041]" : "bg-white text-[#6B7280] border-gray-200 hover:border-[#1D9E75] hover:text-[#1D9E75]"
              }`}>
              {f.label} {f.key !== "todas" && <span className="ml-1 opacity-70">({counts[f.key]})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center shadow-sm">
            <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#085041]">
              {solicitudes.length === 0 ? "No hay solicitudes abiertas en este momento" : "No hay solicitudes en esta categoría"}
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Vuelve pronto — los compradores publican nuevas solicitudes regularmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
            {filtered.map((s) => (
              <SolicitudCard
                key={s.id}
                s={s}
                myResponse={myResponses[s.id] ?? null}
                onOfrecer={(sol, existing) => setOfertandoFor({ s: sol, existing })}
              />
            ))}
          </div>
        )}
      </div>

      {ofertandoFor && (
        <OfertaModal
          solicitud={ofertandoFor.s}
          existingResponse={ofertandoFor.existing}
          userId={userId}
          onClose={() => setOfertandoFor(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

