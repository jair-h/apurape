"use client";

/* Campana de avisos. Vive en el shell del dashboard, así que aparece en
 * todas las pantallas internas.
 *
 * Sondea cada 30 s en vez de usar realtime: los avisos no son un chat y
 * media hora de retraso tampoco sería grave, pero 30 s se siente inmediato
 * y no añade una suscripción más que mantener. */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Loader2, Trophy, Star, ClipboardList, CheckCircle2, CreditCard, Info, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Aviso {
  id: string; kind: string; title: string; body: string | null;
  link: string | null; read: boolean; created_at: string;
}

const ICONO: Record<string, React.ElementType> = {
  concurso_ganado:       Trophy,
  trabajo_por_confirmar: Star,
  cotizacion_recibida:   ClipboardList,
  cotizacion_aceptada:   CheckCircle2,
  mensaje_nuevo:         MessageSquare,
  servicio_confirmado:   CheckCircle2,
  plan:                  CreditCard,
  sistema:               Info,
};

const cuando = (iso: string) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)   return "ahora";
  if (min < 60)  return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `hace ${d} ${d === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
};

export default function NotificationBell() {
  const supabase = useRef(createClient()).current;

  const [open, setOpen]       = useState(false);
  const [avisos, setAvisos]   = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId]   = useState<string | null>(null);

  const cargar = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read, created_at")
      .eq("profile_id", uid)
      .order("created_at", { ascending: false })
      .limit(15);
    setAvisos((data as Aviso[]) ?? []);
  };

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await cargar(user.id);
      id = setInterval(() => cargar(user.id), 30_000);
    })();
    return () => { if (id) clearInterval(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const noLeidos = avisos.filter(a => !a.read).length;

  const abrir = async () => {
    const siguiente = !open;
    setOpen(siguiente);
    if (siguiente && noLeidos > 0 && userId) {
      setLoading(true);
      await supabase.rpc("mark_notifications_read");
      setAvisos(prev => prev.map(a => ({ ...a, read: true })));
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button type="button" onClick={abrir}
        aria-label={noLeidos > 0 ? `${noLeidos} avisos sin leer` : "Avisos"}
        className="relative p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
        <Bell className="h-5 w-5" />
        {noLeidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FDA29B] text-[#7A271A] text-[9px] font-extrabold flex items-center justify-center">
            {noLeidos > 9 ? "9+" : noLeidos}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Avisos</p>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </div>

            {avisos.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-[#6B7280]">No tienes avisos todavía.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {avisos.map(a => {
                  const Icon = ICONO[a.kind] ?? Info;
                  const contenido = (
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        a.kind === "concurso_ganado" ? "bg-teal-50" : "bg-[#FEF3F2]"
                      }`}>
                        <Icon className={`h-4 w-4 ${a.kind === "concurso_ganado" ? "text-[#0E9384]" : "text-[#D92D20]"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900">{a.title}</p>
                        {a.body && <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">{a.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{cuando(a.created_at)}</p>
                      </div>
                    </div>
                  );
                  return a.link
                    ? <Link key={a.id} href={a.link} onClick={() => setOpen(false)}>{contenido}</Link>
                    : <div key={a.id}>{contenido}</div>;
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
