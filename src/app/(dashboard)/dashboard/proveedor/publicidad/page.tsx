"use client";

/* Publicidad del Proveedor (Fase 1 interna).
 *
 * El proveedor Pro arma una campaña de "Destacado" para su perfil (Persona o
 * Negocio) o para un producto del catálogo (solo Negocio), amarrada a una
 * categoría. Modelo presupuesto + días (CPM). Hoy el cobro está apagado: la
 * campaña se crea gratis y queda PENDIENTE de revisión del admin.
 *
 * Métricas honestas para servicios: impresiones, clics, CTR, costo por clic
 * (derivado), inversión y días restantes. No hay ROAS/ventas: Apurape no
 * procesa la venta, así que no se inventa un número que no se puede sustentar.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, Megaphone, Eye, MousePointerClick, Percent, Coins,
  CalendarClock, ArrowRight, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Perfil { role: string; account_type: string; plan: string; plan_status: string; }
interface Servicio { id: string; title: string; category_id: string; service_categories: { name: string } | null; }
interface Campaña {
  id: string; kind: string; status: string; category_id: string;
  budget_cents: number; spent_cents: number; impressions: number; clicks: number;
  days: number; starts_at: string | null; ends_at: string | null; reject_reason: string | null;
  service_categories: { name: string } | null;
}

const soles = (c: number) => `S/${(c / 100).toFixed(2)}`;
const DIAS_SUGERIDOS = [7, 15, 30];

const ESTADO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendiente: { label: "En revisión", color: "#B54708", icon: Clock },
  activa:    { label: "Activa",      color: "#067647", icon: CheckCircle2 },
  pausada:   { label: "Pausada",     color: "#6B7280", icon: Clock },
  vencida:   { label: "Finalizada",  color: "#6B7280", icon: CheckCircle2 },
  rechazada: { label: "Rechazada",   color: "#B42318", icon: XCircle },
};

export default function PublicidadProveedorPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [campañas, setCampañas] = useState<Campaña[]>([]);
  const [cfg, setCfg] = useState({ min: 20, step: 10, cpm: 15, minDays: 3 });

  const [kind, setKind] = useState<"perfil" | "producto">("perfil");
  const [serviceId, setServiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budget, setBudget] = useState(20);
  const [days, setDays] = useState(7);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: p }, { data: svc }, { data: camps }] = await Promise.all([
      supabase.from("profiles").select("role, account_type, plan, plan_status").eq("id", user.id).maybeSingle(),
      supabase.from("provider_services")
        .select("id, title, category_id, service_categories(name)")
        .eq("provider_id", user.id).eq("status", "activo"),
      supabase.from("promotions")
        .select("id, kind, status, category_id, budget_cents, spent_cents, impressions, clicks, days, starts_at, ends_at, reject_reason, service_categories(name)")
        .eq("advertiser_id", user.id).order("created_at", { ascending: false }),
    ]);

    setPerfil(p as Perfil);
    setServicios((svc as unknown as Servicio[]) ?? []);
    setCampañas((camps as unknown as Campaña[]) ?? []);

    // Config real (con respaldo a los valores por defecto si no se puede leer).
    try {
      const [min, step, cpm, minDays] = await Promise.all([
        supabase.rpc("config_int", { p_key: "ad_min_budget", p_default: 20 }),
        supabase.rpc("config_int", { p_key: "ad_budget_step", p_default: 10 }),
        supabase.rpc("config_int", { p_key: "ad_cpm", p_default: 15 }),
        supabase.rpc("config_int", { p_key: "ad_min_days", p_default: 3 }),
      ]);
      const c = {
        min: min.data ?? 20, step: step.data ?? 10, cpm: cpm.data ?? 15, minDays: minDays.data ?? 3,
      };
      setCfg(c);
      setBudget(c.min);
    } catch { /* se quedan los defaults */ }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  // Categorías donde el proveedor tiene servicios activos (a dónde puede apuntar).
  const categorias = Array.from(
    new Map(servicios.map(s => [s.category_id, s.service_categories?.name ?? "Mi categoría"])).entries()
  ).map(([id, name]) => ({ id, name }));

  const esNegocio = perfil?.account_type === "negocio";
  const esPro = perfil?.plan === "pro" && (perfil?.plan_status === "active" || perfil?.plan_status === "trial");
  const impresionesEstimadas = cfg.cpm > 0 ? Math.round((budget / cfg.cpm) * 1000) : 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null); setOkMsg(false);
    if (!categoryId) { setError("Elige la categoría donde quieres aparecer."); return; }
    if (kind === "producto" && !serviceId) { setError("Elige el producto a promocionar."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/publicidad/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, service_id: serviceId || null, category_id: categoryId, budget, days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) { setError(data?.error || "No se pudo crear la campaña."); return; }
      setOkMsg(true);
      await cargar();
    } catch {
      setError("No se pudo enviar. Revisa tu conexión.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-7 w-7 text-[#D92D20] animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="h-6 w-6 text-[#D92D20]" />
        <h1 className="text-2xl font-extrabold text-[#1E293B]">Publicidad</h1>
      </div>
      <p className="text-sm text-[#6B7280] mb-6">
        Aparece destacado arriba de la búsqueda de tu categoría. Pagas por vistas; el clic es gratis.
      </p>

      {!esPro ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Megaphone className="h-10 w-10 text-[#D92D20] mx-auto mb-3" />
          <p className="font-bold text-[#1E293B] mb-1">La publicidad es un beneficio del plan Pro</p>
          <p className="text-sm text-[#6B7280] mb-5">Activa Pro para destacar tu perfil o tus productos.</p>
          <Link href="/dashboard/plan" className="inline-flex items-center gap-2 bg-[#D92D20] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#B42318]">
            Ver planes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Crear campaña */}
          <form onSubmit={enviar} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8 space-y-5">
            <p className="font-bold text-[#1E293B]">Nueva campaña</p>

            {/* Qué promociono */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">¿Qué quieres destacar?</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setKind("perfil")}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${kind === "perfil" ? "bg-[#FEF3F2] border-[#D92D20] text-[#B42318]" : "border-gray-200 text-gray-600"}`}>
                  Mi perfil
                </button>
                {esNegocio && (
                  <button type="button" onClick={() => setKind("producto")}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${kind === "producto" ? "bg-[#FEF3F2] border-[#D92D20] text-[#B42318]" : "border-gray-200 text-gray-600"}`}>
                    Un producto
                  </button>
                )}
              </div>
            </div>

            {kind === "producto" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Producto</label>
                <select value={serviceId} onChange={e => {
                  setServiceId(e.target.value);
                  const s = servicios.find(x => x.id === e.target.value);
                  if (s) setCategoryId(s.category_id);
                }} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm">
                  <option value="">Elige un producto activo…</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría donde aparecerás</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                disabled={kind === "producto"} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50">
                <option value="">Elige una categoría…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categorias.length === 0 && (
                <p className="text-xs text-[#B42318] mt-1">Primero publica un servicio activo para poder anunciarte.</p>
              )}
            </div>

            {/* Presupuesto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Presupuesto: <span className="text-[#D92D20] font-extrabold">S/{budget}</span>
              </label>
              <input type="range" min={cfg.min} max={cfg.min + cfg.step * 30} step={cfg.step}
                value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full accent-[#D92D20]" />
              <p className="text-xs text-[#6B7280] mt-1">
                Mínimo S/{cfg.min}, de {cfg.step} en {cfg.step}. ≈ <strong>{impresionesEstimadas.toLocaleString("es-PE")} vistas</strong> estimadas.
              </p>
            </div>

            {/* Días */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duración</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SUGERIDOS.map(d => (
                  <button key={d} type="button" onClick={() => setDays(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${days === d ? "bg-[#FEF3F2] border-[#D92D20] text-[#B42318]" : "border-gray-200 text-gray-600"}`}>
                    {d} días
                  </button>
                ))}
                <input type="number" min={cfg.minDays} value={days} onChange={e => setDays(Math.max(cfg.minDays, Number(e.target.value)))}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* Aviso honesto */}
            <div className="bg-[#F9FAFB] rounded-xl p-3 text-xs text-[#6B7280] leading-relaxed">
              Las vistas dependen del tráfico de Apurape: pagar más no crea tráfico, te da un mayor porcentaje
              de las vistas que haya y tu presupuesto dura más. Si al final del plazo queda saldo, se extiende
              hasta consumirse. Tu anuncio aparece siempre marcado como <strong>Publicidad</strong>, separado
              del orden por mérito del concurso.
            </div>

            {error && <p className="text-sm text-[#D92D20] font-medium">{error}</p>}
            {okMsg && <p className="text-sm text-[#067647] font-medium">✓ Campaña creada. Queda en revisión; te avisaremos al aprobarla.</p>}

            <button type="submit" disabled={sending || categorias.length === 0}
              className="w-full bg-[#D92D20] hover:bg-[#B42318] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
              {sending ? "Enviando…" : "Crear campaña"}
            </button>
          </form>

          {/* Mis campañas */}
          <p className="font-bold text-[#1E293B] mb-3">Mis campañas</p>
          {campañas.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Todavía no tienes campañas.</p>
          ) : (
            <div className="space-y-4">
              {campañas.map(c => {
                const est = ESTADO[c.status] ?? ESTADO.pendiente;
                const Icono = est.icon;
                const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                const cpc = c.clicks > 0 ? c.spent_cents / c.clicks : 0;
                const diasRest = c.ends_at ? Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000)) : null;
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-[#1E293B] text-sm">
                          {c.kind === "producto" ? "Producto" : "Perfil"} · {c.service_categories?.name ?? "—"}
                        </p>
                        <p className="text-xs text-[#6B7280]">Presupuesto {soles(c.budget_cents)} · {c.days} días</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: est.color }}>
                        <Icono className="h-3.5 w-3.5" /> {est.label}
                      </span>
                    </div>
                    {c.status === "rechazada" && c.reject_reason && (
                      <p className="text-xs text-[#B42318] mb-3">Motivo: {c.reject_reason}</p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      <Metric icon={Eye} label="Vistas" value={c.impressions.toLocaleString("es-PE")} />
                      <Metric icon={MousePointerClick} label="Clics" value={c.clicks.toLocaleString("es-PE")} />
                      <Metric icon={Percent} label="CTR" value={`${ctr.toFixed(1)}%`} />
                      <Metric icon={Coins} label="Costo/clic" value={cpc > 0 ? soles(cpc) : "—"} />
                      <Metric icon={Coins} label="Invertido" value={soles(c.spent_cents)} />
                      <Metric icon={CalendarClock} label="Días rest." value={diasRest == null ? "—" : String(diasRest)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon className="h-4 w-4 text-[#6B7280] mx-auto mb-1" />
      <p className="text-sm font-extrabold text-[#1E293B]">{value}</p>
      <p className="text-[10px] text-[#6B7280]">{label}</p>
    </div>
  );
}
