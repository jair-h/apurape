"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, ArrowLeft, Loader2, Upload,
  FileText, Star, AlertCircle, Info, Truck, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* ─── Stage definitions ───────────────────────────────────── */

const ALL_STAGES = [
  { key: "confirmed",     label: "Confirmada" },
  { key: "harvest_ready", label: "Cosecha lista" },
  { key: "packed",        label: "Empaque" },
  { key: "gate_in",       label: "En puerto / Gate-in" },
  { key: "departed",      label: "Embarcado" },
  { key: "in_transit",    label: "En tránsito" },
  { key: "arrived",       label: "Llegada a destino" },
  { key: "closed",        label: "Cerrada" },
] as const;

type Stage = { key: string; label: string };

const NACIONAL_STAGES: Stage[] = [
  { key: "confirmed",  label: "Confirmada" },
  { key: "ready",      label: "Producto listo" },
  { key: "shipped",    label: "En camino" },
  { key: "delivered",  label: "Entregado" },
  { key: "closed",     label: "Cerrada" },
];

function buildStages(opType: string | null, sellerRole: string | null, tradeType: string | null): Stage[] {
  if (tradeType === "nacional") return NACIONAL_STAGES;
  if (opType === "logistics" || !sellerRole) {
    return ALL_STAGES.filter(s => s.key !== "harvest_ready" && s.key !== "packed");
  }
  if (sellerRole === "productor") {
    return [...ALL_STAGES];
  }
  return ALL_STAGES.filter(s => s.key !== "harvest_ready");
}

/* ─── Incoterm responsibility ─────────────────────────────── */

// Incoterms where seller/forwarder is responsible through arrival
const SELLER_UNTIL_ARRIVED = new Set(["CFR", "CIF", "CIP", "CPT", "DAP", "DPU", "DDP"]);

const INCOTERM_BANNER: Record<string, string> = {
  EXW: "EXW — El vendedor entrega en almacén (empacado). El comprador (o su forwarder) gestiona toda la logística desde ese punto.",
  FOB: "FOB — El vendedor/forwarder confirma hasta el embarque (gate-in y salida). El comprador confirma el tránsito y la llegada.",
  FCA: "FCA — El vendedor entrega al transportista designado. El forwarder confirma embarque; el comprador confirma tránsito y llegada.",
  CIF: "CIF — El vendedor/forwarder confirma hasta la llegada a destino (flete y seguro incluidos). El comprador solo cierra.",
  CFR: "CFR — El vendedor/forwarder confirma hasta la llegada a destino (flete incluido). El comprador solo cierra.",
  CIP: "CIP — El vendedor/forwarder confirma hasta la llegada (flete y seguro ampliado). El comprador solo cierra.",
  CPT: "CPT — El vendedor/forwarder confirma hasta la llegada a destino. El comprador solo cierra.",
  DAP: "DAP — El vendedor/forwarder confirma hasta la entrega en destino. El comprador solo cierra.",
  DPU: "DPU — El vendedor/forwarder confirma hasta la descarga en destino. El comprador solo cierra.",
  DDP: "DDP — El vendedor/forwarder confirma hasta la entrega con aranceles pagados. El comprador solo cierra.",
};

type Responsible = "seller" | "forwarder" | "buyer";

const RESPONSIBLE_LABEL: Record<Responsible, string> = {
  seller:   "el vendedor",
  forwarder:"el forwarder",
  buyer:    "el comprador",
};

function stageResponsible(
  stageKey: string,
  _stages: Stage[],
  opType: string | null,
  incoterm: string | null,
  hasForwarder: boolean,
  tradeType?: string | null,
): Responsible {
  // Nacional: seller confirms first stages, forwarder/seller ships, buyer receives and closes
  if (tradeType === "nacional") {
    if (stageKey === "delivered" || stageKey === "closed") return "buyer";
    if (stageKey === "shipped") return hasForwarder ? "forwarder" : "seller";
    return "seller";
  }
  // Logistics-only op: forwarder owns all stages, buyer only closes
  if (opType === "logistics") {
    return stageKey === "closed" ? "buyer" : "forwarder";
  }

  // These are always fixed regardless of incoterm
  if (stageKey === "closed") return "buyer";
  if (stageKey === "confirmed") return "seller";
  // Pre-shipping stages are always seller-side
  if (stageKey === "harvest_ready" || stageKey === "packed") return "seller";

  const key = (incoterm ?? "FOB").toUpperCase();

  // EXW: seller only delivers at warehouse (packed). Everything after is buyer or their forwarder.
  if (key === "EXW") {
    return hasForwarder ? "forwarder" : "buyer";
  }

  // CIF/CFR/DAP/DPU/DDP/CIP/CPT: seller covers freight until arrival.
  // Forwarder handles logistics stages if present, else seller does.
  if (SELLER_UNTIL_ARRIVED.has(key)) {
    return hasForwarder ? "forwarder" : "seller";
  }

  // FOB / FCA (and unknown incoterms): seller/forwarder handles gate_in and departed.
  // After departure (in_transit, arrived) → buyer's responsibility.
  if (stageKey === "gate_in" || stageKey === "departed") {
    return hasForwarder ? "forwarder" : "seller";
  }
  return "buyer"; // in_transit, arrived
}

/* ─── Status badge map ────────────────────────────────────── */

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed:     { label: "Confirmada",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ready:         { label: "Producto listo",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  shipped:       { label: "En camino",       cls: "bg-sky-50 text-sky-700 border-sky-200" },
  delivered:     { label: "Entregado",       cls: "bg-[#E1F5EE] text-[#085041] border-green-200" },
  harvest_ready: { label: "Cosecha lista",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  inspected:     { label: "Inspeccionada",   cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  packed:        { label: "Empacada",        cls: "bg-orange-50 text-orange-700 border-orange-200" },
  gate_in:       { label: "En puerto",       cls: "bg-purple-50 text-purple-700 border-purple-200" },
  departed:      { label: "Embarcado",       cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  in_transit:    { label: "En tránsito",     cls: "bg-sky-50 text-sky-700 border-sky-200" },
  arrived:       { label: "Llegó a destino", cls: "bg-[#E1F5EE] text-[#085041] border-green-200" },
  closed:        { label: "Cerrada",         cls: "bg-gray-100 text-gray-600 border-gray-200" },
  disputed:      { label: "En disputa",      cls: "bg-red-50 text-red-700 border-red-200" },
};

/* ─── Types ───────────────────────────────────────────────── */

interface Op {
  id: string;
  operation_number: number | null;
  type: string | null;
  product: string | null;
  variety: string | null;
  volume_tm: number | null;
  unit: string | null;
  agreed_price_usd: number | null;
  price_unit: string | null;
  incoterm: string | null;
  delivery_date: string | null;
  destination_country: string | null;
  origin_port: string | null;
  total_value_usd: number | null;
  currency: string | null;
  status: string;
  buyer_id: string | null;
  seller_id: string | null;
  forwarder_id: string | null;
  trade_type: string | null;
  own_logistics: boolean | null;
  notes: string | null;
  created_at: string;
}

interface Tracking {
  id: string;
  operation_id: string;
  stage: string;
  updated_by: string;
  notes: string | null;
  document_url: string | null;
  created_at: string;
  updater_name?: string;
}

interface Profile {
  user_id: string;
  name: string | null;
  business_name: string | null;
  role?: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function fmtUSD(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtMoney(n: number | null, isNacional: boolean) {
  if (n == null) return "—";
  const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  return isNacional ? `S/ ${num}` : `USD ${num}`;
}

function displayName(p: Profile | null) {
  return p?.business_name || p?.name || "Usuario";
}

/* ─── Star rating ─────────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110">
          <Star className={`h-6 w-6 ${(hovered || value) >= n ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

/* ─── Incoterm banner ─────────────────────────────────────── */

function IncotermBanner({ incoterm }: { incoterm: string | null }) {
  if (!incoterm) return null;
  const text = INCOTERM_BANNER[incoterm.toUpperCase()];
  if (!text) return null;
  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">Incoterm:</span> {text}
      </p>
    </div>
  );
}

/* ─── Party card ──────────────────────────────────────────── */

function PartyCard({
  title, profile, isMe, icon: Icon,
}: {
  title: string;
  profile: Profile | null;
  isMe: boolean;
  icon?: React.ElementType;
}) {
  const IconEl = Icon ?? (() => null);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#085041] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {Icon ? <IconEl className="h-5 w-5" /> : displayName(profile).charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</p>
          {isMe && <span className="text-[9px] bg-[#E1F5EE] text-[#085041] font-bold px-1.5 py-0.5 rounded-full">Tú</span>}
        </div>
        <p className="text-sm font-bold text-[#1E293B] truncate">{displayName(profile)}</p>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function OperacionDetailPage() {
  const params = useParams();
  const opId   = params.id as string;
  const router = useRouter();

  const [loading,    setLoading]    = useState(true);
  const [op,         setOp]         = useState<Op | null>(null);
  const [tracking,   setTracking]   = useState<Tracking[]>([]);
  const [buyer,      setBuyer]      = useState<Profile | null>(null);
  const [seller,     setSeller]     = useState<Profile | null>(null);
  const [forwarder,  setForwarder]  = useState<Profile | null>(null);
  const [sellerRole, setSellerRole] = useState<string | null>(null);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [advancing,  setAdvancing]  = useState(false);
  const [stageNote,  setStageNote]  = useState("");
  const [fileToUp,   setFileToUp]   = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myRating,       setMyRating]       = useState(0);
  const [ratingComment,  setRatingComment]  = useState("");
  const [ratingDone,     setRatingDone]     = useState(false);
  const [savingRating,   setSavingRating]   = useState(false);
  const [existingRating, setExistingRating] = useState<{ stars: number; comment: string | null } | null>(null);

  const [settingOwnLogistics, setSettingOwnLogistics] = useState(false);
  const [showTransportPanel,  setShowTransportPanel]  = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeNote,      setDisputeNote]      = useState("");
  const [disputing,        setDisputing]        = useState(false);

  const nameCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!opId) return;
    async function load() {
      try {
      const supabase = createClient();

      const [{ data: { user } }, { data: opRow }, { data: trackRows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("operations").select("*").eq("id", opId).single(),
        supabase.from("operation_tracking")
          .select("id, operation_id, stage, updated_by, notes, document_url, created_at")
          .eq("operation_id", opId)
          .order("created_at", { ascending: true }),
      ]);

      if (!user || !opRow) { setLoading(false); return; }
      setUserId(user.id);
      setOp(opRow as Op);

      // Helper to fetch a profile by uid safely
      const fetchProfile = async (uid: string | null): Promise<Profile | null> => {
        if (!uid) return null;
        const { data } = await supabase
          .from("profiles")
          .select("user_id, name, business_name, role")
          .eq("user_id", uid)
          .single();
        return (data ?? null) as Profile | null;
      };

      // Parallel profile + rating fetches
      const [ratingRes, buyerProfile, sellerProfile, fwProfile] = await Promise.all([
        supabase.from("ratings").select("stars, comment").eq("operation_id", opId).eq("rater_id", user.id).maybeSingle(),
        fetchProfile(opRow.buyer_id),
        fetchProfile(opRow.seller_id),
        fetchProfile(opRow.forwarder_id),
      ]);

      setBuyer(buyerProfile);
      setSeller(sellerProfile);
      setSellerRole(sellerProfile?.role ?? null);
      setForwarder(fwProfile);
      if (ratingRes.data) setExistingRating(ratingRes.data);

      // Tracking updater names
      const rows = (trackRows ?? []) as Tracking[];
      const updaterIds = [...new Set(rows.map(r => r.updated_by))];
      if (updaterIds.length > 0) {
        const { data: upProfiles } = await supabase
          .from("profiles").select("user_id, name, business_name").in("user_id", updaterIds);
        const nm: Record<string, string> = {};
        (upProfiles ?? []).forEach(p => { nm[p.user_id] = p.business_name || p.name || "Usuario"; });
        nameCacheRef.current = nm;
        setTracking(rows.map(r => ({ ...r, updater_name: nm[r.updated_by] ?? "Usuario" })));
      } else {
        setTracking(rows);
      }

      setLoading(false);
      } catch (err) {
        console.error("[operacion/detail]", err);
        setLoading(false);
      }
    }
    load();
  }, [opId]);

  /* ── Poll operation status + tracking every 5s ── */
  useEffect(() => {
    if (!opId) return;
    const interval = setInterval(async () => {
      const supabase = createClient();
      const [{ data: opData }, { data: trackData }] = await Promise.all([
        supabase.from("operations")
          .select("status, own_logistics, forwarder_id")
          .eq("id", opId).single(),
        supabase.from("operation_tracking")
          .select("id, operation_id, stage, updated_by, notes, document_url, created_at")
          .eq("operation_id", opId).order("created_at", { ascending: true }),
      ]);

      if (opData) {
        setOp(prev => prev ? { ...prev, status: opData.status, own_logistics: opData.own_logistics, forwarder_id: opData.forwarder_id } : prev);
      }

      if (trackData) {
        const rows = trackData as Tracking[];
        const unknownIds = [...new Set(rows.map(r => r.updated_by).filter(id => !nameCacheRef.current[id]))];
        if (unknownIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles")
            .select("user_id, name, business_name").in("user_id", unknownIds);
          (profiles ?? []).forEach(p => {
            nameCacheRef.current[p.user_id] = p.business_name || p.name || "Usuario";
          });
        }
        setTracking(rows.map(r => ({ ...r, updater_name: nameCacheRef.current[r.updated_by] ?? "Usuario" })));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [opId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Computed stage data ── */

  const stages = buildStages(op?.type ?? null, sellerRole, op?.trade_type ?? null);
  const currentIdx = op ? stages.findIndex(s => s.key === op.status) : -1;
  const nextStage  = (currentIdx >= 0 && currentIdx < stages.length - 1)
    ? stages[currentIdx + 1]
    : null;

  const nextResponsible: Responsible | null = (nextStage && op)
    ? stageResponsible(nextStage.key, stages, op.type, op.incoterm, !!op.forwarder_id, op.trade_type)
    : null;

  const isParticipant = !!(op && userId && (
    userId === op.buyer_id || userId === op.seller_id || userId === op.forwarder_id
  ));

  const isMyTurn = !!(nextStage && nextResponsible && op && userId && (
    (nextResponsible === "buyer"    && userId === op.buyer_id) ||
    (nextResponsible === "seller"   && userId === op.seller_id) ||
    (nextResponsible === "forwarder"&& userId === op.forwarder_id)
  ));

  const canAdvance = isMyTurn && !!op && op.status !== "closed" && op.status !== "disputed";

  const isNacional = op?.currency === "PEN" || (!op?.currency && op?.trade_type === "nacional");

  const EF_INCOTERMS = new Set(["EXW", "FCA", "FAS", "FOB"]);
  const isInternacional = op
    ? (!isNacional && (op.trade_type === "internacional" || (!op.trade_type && op.type === "commercial")))
    : false;
  const incotermKey = (op?.incoterm ?? "FOB").toUpperCase();
  const buyerGetsTransport = EF_INCOTERMS.has(incotermKey);
  const canRequestTransport = !!(op && isInternacional && !op.forwarder_id && !op.own_logistics &&
    op.status !== "closed" && op.status !== "disputed" && userId && (
      (buyerGetsTransport  && userId === op.buyer_id) ||
      (!buyerGetsTransport && userId === op.seller_id)
    ));

  /* ── Advance handler ── */

  const handleAdvance = async () => {
    if (!op || !userId || !nextStage) return;

    // P2: guard against duplicate — don't confirm a stage already in tracking
    if (tracking.some(t => t.stage === nextStage.key)) return;

    setAdvancing(true);
    const supabase = createClient();
    let docUrl: string | null = null;

    if (fileToUp) {
      const ext  = fileToUp.name.split(".").pop();
      const path = `${opId}/${nextStage.key}/${Date.now()}.${ext}`;
      const { data: uploaded } = await supabase.storage
        .from("operation-docs").upload(path, fileToUp, { upsert: true });
      if (uploaded) {
        const { data: pub } = supabase.storage.from("operation-docs").getPublicUrl(path);
        docUrl = pub.publicUrl;
      }
    }

    // P1: sequential execution — insert tracking first, then update status
    const { error: trackErr } = await supabase.from("operation_tracking").insert({
      operation_id: opId,
      stage:        nextStage.key,
      updated_by:   userId,
      notes:        stageNote || null,
      document_url: docUrl,
    });

    if (trackErr) {
      console.error("[advance] tracking insert failed:", trackErr);
      setAdvancing(false);
      return;
    }

    const { error: opErr } = await supabase.from("operations")
      .update({ status: nextStage.key })
      .eq("id", opId);

    if (opErr) {
      console.error("[advance] status update failed:", opErr);
      setAdvancing(false);
      return;
    }

    // P1: only update local state after both DB ops succeed
    setOp(prev => prev ? { ...prev, status: nextStage.key } : prev);
    setTracking(prev => [...prev, {
      id: crypto.randomUUID(), operation_id: opId,
      stage: nextStage.key, updated_by: userId,
      notes: stageNote || null, document_url: docUrl,
      created_at: new Date().toISOString(), updater_name: "Tú",
    }]);
    setStageNote("");
    setFileToUp(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAdvancing(false);
  };

  /* ── Rating handler ── */

  const handleRate = async () => {
    if (!op || !userId || myRating === 0) return;
    setSavingRating(true);
    const supabase = createClient();
    const ratedId  = userId === op.buyer_id ? op.seller_id : op.buyer_id;
    if (ratedId) {
      await supabase.from("ratings").insert({
        operation_id: opId, rater_id: userId, rated_id: ratedId,
        stars: myRating, comment: ratingComment || null,
      });
    }
    setExistingRating({ stars: myRating, comment: ratingComment || null });
    setRatingDone(true);
    setSavingRating(false);
  };

  /* ── Dispute handler ── */

  const handleDispute = async () => {
    if (!op || !userId || !disputeNote.trim()) return;
    setDisputing(true);
    const supabase = createClient();
    await Promise.all([
      supabase.from("operations").update({ status: "disputed" }).eq("id", opId),
      supabase.from("operation_tracking").insert({
        operation_id: opId,
        stage: "disputed",
        updated_by: userId,
        notes: disputeNote.trim(),
        document_url: null,
      }),
    ]);
    setOp(prev => prev ? { ...prev, status: "disputed" } : prev);
    setShowDisputeModal(false);
    setDisputing(false);
  };

  /* ── Own logistics handler ── */

  const handleOwnLogistics = async () => {
    if (!op || !userId) return;
    setSettingOwnLogistics(true);
    const supabase = createClient();
    await supabase.from("operations").update({ own_logistics: true }).eq("id", opId);
    setOp(prev => prev ? { ...prev, own_logistics: true } : prev);
    setShowTransportPanel(false);
    setSettingOwnLogistics(false);
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  if (!op) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-gray-300" />
        <p className="text-sm font-semibold text-[#085041]">Operación no encontrada</p>
        <button type="button" onClick={() => router.back()} className="text-xs text-[#1D9E75] hover:text-[#085041]">
          ← Volver
        </button>
      </div>
    );
  }

  const stCfg    = STATUS_MAP[op.status] ?? STATUS_MAP.confirmed;
  const opCode   = op.operation_number
    ? `#AGD-${new Date(op.created_at).getFullYear()}-${String(op.operation_number).padStart(3, "0")}`
    : op.id.slice(0, 8).toUpperCase();
  const isDuaStage = nextStage && (nextStage.key === "gate_in" || nextStage.key === "departed");

  return (
    <>
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">

      {/* ── Back + header ── */}
      <div>
        <button type="button" onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#085041] mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Operación {opCode}
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                op.type === "logistics"
                  ? "bg-indigo-50 text-indigo-700"
                  : isNacional
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#E1F5EE] text-[#085041]"
              }`}>
                {op.type === "logistics" ? "Operación de flete" : isNacional ? "Venta nacional" : "Exportación / Internacional"}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#085041]">
              {op.product ?? (op.type === "logistics" ? "Flete" : "Operación")}{op.variety ? ` — ${op.variety}` : ""}
            </h1>
          </div>
          <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border ${stCfg.cls}`}>
            {stCfg.label}
          </span>
        </div>
      </div>

      {/* ── Info banner ── */}
      {op.type === "logistics" ? (
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <Truck className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-bold">Operación de flete</span> — El forwarder confirma
            la carga en puerto, el embarque, el tránsito y la llegada.
            El cliente confirma la recepción final (cierre).
          </p>
        </div>
      ) : isNacional ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Truck className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Venta nacional</span> — El vendedor confirma el producto listo y el envío al destino.
            El comprador confirma la recepción y el pago (cierre).
          </p>
        </div>
      ) : (
        <IncotermBanner incoterm={op.incoterm} />
      )}

      {/* ── Terms grid ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-[#085041] mb-4">Términos del acuerdo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          {[
            ...(!isNacional ? [{ label: "Incoterm",      value: op.incoterm ?? "—" }] : []),
            { label: "Valor total",    value: fmtMoney(op.total_value_usd, isNacional) },
            ...(!isNacional ? [{ label: "Puerto origen", value: op.origin_port ?? "—" }] : []),
            { label: "Destino",        value: op.destination_country ?? "—" },
            { label: "Entrega",        value: fmtDate(op.delivery_date) },
            { label: "Tipo",           value: isNacional ? "Nacional" : op.type === "logistics" ? "Logística" : "Internacional" },
            { label: "Creada",         value: fmtDate(op.created_at) },
            ...(op.agreed_price_usd != null
              ? [{ label: "Precio",    value: `${isNacional ? "S/" : "USD"} ${op.agreed_price_usd}/${op.price_unit ?? "kg"}` }]
              : []),
            ...(op.volume_tm != null
              ? [{ label: "Volumen",   value: `${op.volume_tm} ${op.unit ?? "tm"}` }]
              : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-0.5">{label}</p>
              <p className="font-bold text-[#1E293B]">{value}</p>
            </div>
          ))}
        </div>
        {op.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Notas</p>
            <p className="text-xs text-[#1E293B]">{op.notes}</p>
          </div>
        )}
      </div>

      {/* ── Parties (always 3: Vendedor / Forwarder / Comprador) ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {op.seller_id && (
          <PartyCard title="Vendedor"   profile={seller}   isMe={userId === op.seller_id} />
        )}
        {op.forwarder_id ? (
          <PartyCard title="Forwarder"  profile={forwarder} isMe={userId === op.forwarder_id} icon={Truck} />
        ) : op.own_logistics ? (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Forwarder</p>
              <p className="text-sm font-bold text-amber-700">Logística propia</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-5 flex items-center gap-4 opacity-60">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Forwarder</p>
              <p className="text-sm font-bold text-gray-400">Sin asignar</p>
            </div>
          </div>
        )}
        {op.buyer_id && (
          <PartyCard title="Comprador"  profile={buyer}    isMe={userId === op.buyer_id} />
        )}
      </div>

      {/* ── Solicitar transporte (PARTE B) ── */}
      {canRequestTransport && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
          <div className="flex items-start gap-3 mb-4">
            <Truck className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-[#085041]">Solicitar transporte para esta operación</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Esta operación aún no tiene forwarder asignado. Elige cómo manejarás la logística.
              </p>
            </div>
          </div>
          {!showTransportPanel ? (
            <button type="button" onClick={() => setShowTransportPanel(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
              <Truck className="h-3.5 w-3.5" /> Gestionar logística
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`/dashboard/logistica/cotizar?op=${opId}&product=${encodeURIComponent(op.product ?? "")}&port=${encodeURIComponent(op.origin_port ?? "")}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
                <Truck className="h-3.5 w-3.5" /> Buscar transporte
              </a>
              <button
                type="button"
                onClick={handleOwnLogistics}
                disabled={settingOwnLogistics}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-[#085041] text-xs font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors disabled:opacity-50">
                {settingOwnLogistics
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                Ya tengo mi propia logística
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Timeline (PASO 1 + PASO 3) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-[#085041] mb-6">Seguimiento de la operación</h2>

        {/* Horizontal steps */}
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex items-start" style={{ minWidth: `${stages.length * 88}px` }}>
            {stages.map((stage, idx) => {
              const done   = idx < currentIdx;
              const active = idx === currentIdx;
              const track  = tracking.filter(t => t.stage === stage.key);
              const resp   = stageResponsible(stage.key, stages, op.type, op.incoterm, !!op.forwarder_id, op.trade_type);
              return (
                <div key={stage.key} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {idx > 0 && (
                      <div className={`flex-1 h-0.5 ${done || active ? "bg-[#1D9E75]" : "bg-gray-200"}`} />
                    )}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold border-2 transition-all ${
                      done   ? "bg-[#1D9E75] border-[#1D9E75] text-white"
                      : active ? "bg-white border-[#1D9E75] text-[#1D9E75] ring-2 ring-[#1D9E75]/20"
                               : "bg-white border-gray-200 text-gray-400"
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    {idx < stages.length - 1 && (
                      <div className={`flex-1 h-0.5 ${done ? "bg-[#1D9E75]" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <p className={`text-center mt-1.5 leading-tight px-0.5 ${
                    active ? "text-[11px] text-[#1D9E75] font-bold"
                    : done  ? "text-[10px] text-[#085041] font-semibold"
                            : "text-[10px] text-gray-400"
                  }`} style={{ maxWidth: "80px" }}>
                    {stage.label}
                  </p>
                  {/* Responsible label under each step */}
                  <p className={`text-[9px] text-center mt-0.5 leading-tight ${
                    active ? "text-[#1D9E75] font-semibold" : "text-gray-300"
                  }`} style={{ maxWidth: "80px" }}>
                    {RESPONSIBLE_LABEL[resp]}
                  </p>
                  {track.length > 0 && (
                    <p className="text-[9px] text-[#6B7280] mt-0.5 text-center" style={{ maxWidth: "80px" }}>
                      {fmtDateTime(track[track.length - 1].created_at)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Estado actual en texto claro (PASO 5) ── */}
        {op.status !== "closed" && op.status !== "disputed" && nextStage && (
          <div className="border-t border-gray-100 pt-4">
            {canAdvance ? (
              /* It's this user's turn */
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#085041]">
                  Confirmar siguiente etapa:{" "}
                  <span className="text-[#1D9E75]">{nextStage.label}</span>
                </p>
                <input
                  type="text"
                  value={stageNote}
                  onChange={e => setStageNote(e.target.value)}
                  placeholder={isDuaStage
                    ? "Referencia del DUA, número de BL, naviera..."
                    : "Nota opcional sobre esta etapa"}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer hover:text-[#085041] transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {fileToUp
                      ? fileToUp.name
                      : isDuaStage
                      ? "Adjuntar DUA / Declaración aduanera (opcional)"
                      : "Adjuntar documento (opcional)"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={e => setFileToUp(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {fileToUp && (
                    <button type="button"
                      onClick={() => { setFileToUp(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-[10px] text-red-500 hover:text-red-700">
                      ✕ quitar
                    </button>
                  )}
                </div>
                <button type="button" onClick={handleAdvance} disabled={advancing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#085041] transition-colors disabled:opacity-60">
                  {advancing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando...</>
                    : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirmar: {nextStage.label}</>}
                </button>
              </div>
            ) : isParticipant ? (
              /* Participant but not their turn */
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Esperando a {nextResponsible ? RESPONSIBLE_LABEL[nextResponsible] : "la contraparte"}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    La siguiente etapa es <span className="font-semibold">{nextStage.label}</span>{" "}
                    y debe ser confirmada por{" "}
                    <span className="font-semibold">
                      {nextResponsible ? RESPONSIBLE_LABEL[nextResponsible] : "la otra parte"}
                    </span>.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {op.status === "closed" && (
          <div className="flex justify-center mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Operación cerrada
            </span>
          </div>
        )}

        {op.status === "disputed" && (
          <div className="flex justify-center mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
              <AlertCircle className="h-3.5 w-3.5" /> Operación en disputa
            </span>
          </div>
        )}
      </div>

      {/* ── Tracking history ── */}
      {tracking.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#085041] mb-4">Historial de actualizaciones</h2>
          <div className="space-y-3">
            {[...tracking].reverse().map((t) => {
              const stageCfg = stages.find(s => s.key === t.stage)
                ?? ALL_STAGES.find(s => s.key === t.stage)
                ?? NACIONAL_STAGES.find(s => s.key === t.stage);
              return (
                <div key={t.id} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#1D9E75]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#085041]">
                        {stageCfg?.label ?? t.stage}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        · {t.updater_name} · {fmtDateTime(t.created_at)}
                      </span>
                    </div>
                    {t.notes && (
                      <p className="text-xs text-[#6B7280] mt-0.5 italic">{t.notes}</p>
                    )}
                    {t.document_url && (
                      <a href={t.document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[#1D9E75] hover:text-[#085041] mt-1 font-semibold">
                        <FileText className="h-3 w-3" />
                        {(t.stage === "gate_in" || t.stage === "departed")
                          ? "Ver DUA / Declaración aduanera"
                          : "Ver documento"}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Report problem ── */}
      {isParticipant && op.status !== "closed" && op.status !== "disputed" && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setShowDisputeModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors py-1">
            <AlertCircle className="h-3.5 w-3.5" /> Reportar problema
          </button>
        </div>
      )}

      {/* ── Ratings — only when closed ── */}
      {op.status === "closed" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#085041] mb-4">Calificación</h2>
          {existingRating ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-5 w-5 ${n <= existingRating.stars ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#085041]">Ya calificaste esta operación</p>
                {existingRating.comment && (
                  <p className="text-xs text-[#6B7280] italic mt-0.5">"{existingRating.comment}"</p>
                )}
              </div>
            </div>
          ) : ratingDone ? (
            <p className="text-sm text-[#1D9E75] font-semibold">¡Gracias por tu calificación!</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#6B7280]">
                Califica tu experiencia con{" "}
                {userId === op.buyer_id ? displayName(seller) : displayName(buyer)}
              </p>
              <StarRating value={myRating} onChange={setMyRating} />
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder="Comentario opcional..."
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1D9E75] resize-none"
              />
              <button type="button" onClick={handleRate} disabled={myRating === 0 || savingRating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#085041] text-white text-xs font-bold hover:bg-[#1D9E75] transition-colors disabled:opacity-50">
                {savingRating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                Enviar calificación
              </button>
            </div>
          )}
        </div>
      )}
    </div>

    {/* ── Dispute modal ── */}
    {showDisputeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-red-700">Reportar problema</h3>
            <button type="button" onClick={() => setShowDisputeModal(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            El equipo de MARKARU revisará tu reporte. La operación quedará en estado de disputa hasta resolverse.
          </p>
          <textarea
            value={disputeNote}
            onChange={e => setDisputeNote(e.target.value)}
            placeholder="Describe el problema con detalle..."
            rows={4}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowDisputeModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] hover:border-gray-300 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleDispute} disabled={disputing || !disputeNote.trim()}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {disputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
              Confirmar reporte
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
