"use client";

/* Libro de Reclamaciones: bandeja del administrador.
 *
 * La versión anterior estaba escrita contra otro esquema, heredado de
 * MARKARU: pedía `status`, `dni` y `solicitud`, que no existen (la tabla
 * tiene `estado`, `documento` y `pedido`), mostraba el UUID como ticket en
 * vez del correlativo, y no tenía dónde escribir la respuesta aunque la
 * columna `respuesta` ya existía. No funcionaba nada de punta a punta.
 *
 * El plazo legal (15 días hábiles desde la presentación, DS 011-2011-PCM)
 * se calcula y se muestra por fila: es el dato que decide qué atender hoy.
 */

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle, Loader2, ChevronLeft, ChevronRight, X, MessageSquare,
  Phone, Mail, IdCard, MapPin, Clock, Send, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Reclamacion {
  id: string;
  codigo: string | null;
  nombre: string;
  doc_tipo: string | null;
  documento: string | null;
  email: string;
  telefono: string | null;
  direccion: string | null;
  es_menor: boolean;
  apoderado: string | null;
  tipo: "reclamo" | "queja";
  bien_servicio: string | null;
  monto: number | null;
  bien_descripcion: string | null;
  descripcion: string;
  pedido: string | null;
  estado: string;
  respuesta: string | null;
  notas_internas: string | null;
  respondido_at: string | null;
  created_at: string;
}

const ESTADOS: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "bg-amber-100 text-amber-800" },
  en_proceso: { label: "En proceso", cls: "bg-blue-100 text-blue-700" },
  respondido: { label: "Respondido", cls: "bg-teal-100 text-teal-800" },
  resuelto:   { label: "Resuelto",   cls: "bg-green-100 text-green-700" },
  cerrado:    { label: "Cerrado",    cls: "bg-gray-100 text-gray-600" },
};

const TIPOS: Record<string, { label: string; cls: string }> = {
  reclamo: { label: "Reclamo", cls: "bg-red-100 text-red-700" },
  queja:   { label: "Queja",   cls: "bg-amber-100 text-amber-700" },
};

const DOC_LABEL: Record<string, string> = {
  dni: "DNI", ce: "C. Extranjería", pasaporte: "Pasaporte",
};

const PAGE_SIZE = 20;

/* Días hábiles transcurridos desde la presentación. Sin feriados: el
   calendario de feriados peruanos cambia cada año y mantenerlo aquí daría
   una falsa precisión. Cuenta de lunes a viernes, que es la aproximación
   honesta y siempre conservadora (nunca dice que queda más tiempo del que
   hay). */
function diasHabiles(desde: string): number {
  const inicio = new Date(desde);
  const hoy = new Date();
  let n = 0;
  const cur = new Date(inicio);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setHours(0, 0, 0, 0);
  while (cur < fin) {
    cur.setDate(cur.getDate() + 1);
    const d = cur.getDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

const PLAZO = 15;

const fechaLima = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));

/** Semáforo del plazo. Solo aplica mientras no se haya respondido. */
function Plazo({ r }: { r: Reclamacion }) {
  if (r.respondido_at) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
        <CheckCircle2 className="h-3 w-3" /> Respondido
      </span>
    );
  }
  const usados = diasHabiles(r.created_at);
  const quedan = PLAZO - usados;
  const cls = quedan <= 0 ? "text-red-700" : quedan <= 5 ? "text-amber-700" : "text-[#6B7280]";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cls}`}>
      <Clock className="h-3 w-3" />
      {quedan <= 0
        ? `Vencido hace ${Math.abs(quedan)} d. háb.`
        : `${quedan} d. háb. restantes`}
    </span>
  );
}

export default function AdminReclamacionesPage() {
  const [rows, setRows]         = useState<Reclamacion[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Reclamacion | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState<string>("all");

  /* Borrador de la respuesta y de las notas del caso abierto. */
  const [respuesta, setRespuesta] = useState("");
  const [notas, setNotas]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from("reclamaciones").select("*", { count: "exact" });
    if (filter !== "all") q = q.eq("estado", filter);
    const { data, count } = await q
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    setRows((data ?? []) as Reclamacion[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const abrir = (r: Reclamacion) => {
    setSelected(r);
    setRespuesta(r.respuesta ?? "");
    setNotas(r.notas_internas ?? "");
    setError("");
  };

  /* Guarda la respuesta y pasa a 'respondido'. El trigger
     stamp_reclamacion_respuesta sella respondido_at, así que la fecha del
     plazo no depende de que alguien la escriba. */
  const responder = async (nuevoEstado: string) => {
    if (!selected) return;
    if (nuevoEstado === "respondido" && !respuesta.trim()) {
      setError("Escribe la respuesta antes de marcarla como respondida.");
      return;
    }
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: e } = await supabase.from("reclamaciones").update({
      respuesta:      respuesta.trim() || null,
      notas_internas: notas.trim() || null,
      estado:         nuevoEstado,
    }).eq("id", selected.id);

    if (e) setError(e.message);
    else { setSelected(null); await load(); }
    setSaving(false);
  };

  const guardarBorrador = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: e } = await supabase.from("reclamaciones").update({
      respuesta:      respuesta.trim() || null,
      notas_internas: notas.trim() || null,
    }).eq("id", selected.id);
    if (e) setError(e.message);
    else await load();
    setSaving(false);
  };

  const pages = Math.ceil(total / PAGE_SIZE);
  const vencidos = rows.filter(r => !r.respondido_at && PLAZO - diasHabiles(r.created_at) <= 0).length;

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#B42318]">Libro de Reclamaciones</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {total} {total === 1 ? "registro" : "registros"}. El plazo legal de
            respuesta es de <strong>15 días hábiles</strong> desde la
            presentación (DS 011-2011-PCM).
          </p>
        </div>

        {vencidos > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              <strong>{vencidos}</strong>{" "}
              {vencidos === 1 ? "reclamo pasó" : "reclamos pasaron"} el plazo de
              15 días hábiles sin respuesta.
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {["all", "pendiente", "en_proceso", "respondido", "resuelto", "cerrado"].map(f => (
            <button key={f} type="button"
              onClick={() => { setFilter(f); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f ? "bg-[#B42318] text-white"
                             : "bg-white border border-gray-200 text-[#6B7280] hover:border-[#D92D20]"}`}>
              {f === "all" ? "Todos" : ESTADOS[f].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-[#B42318]">Sin registros</p>
              <p className="text-xs text-[#6B7280] mt-1">No hay reclamos con este filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["N°", "Consumidor", "Tipo", "Estado", "Plazo", "Presentado", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#B42318] whitespace-nowrap">
                        {r.codigo ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#1E293B]">
                        <p className="font-medium whitespace-nowrap">{r.nombre}</p>
                        <p className="text-[11px] text-[#6B7280]">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPOS[r.tipo]?.cls ?? "bg-gray-100"}`}>
                          {TIPOS[r.tipo]?.label ?? r.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADOS[r.estado]?.cls ?? "bg-gray-100"}`}>
                          {ESTADOS[r.estado]?.label ?? r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><Plazo r={r} /></td>
                      <td className="px-4 py-3 text-[11px] text-[#6B7280] whitespace-nowrap">
                        {fechaLima(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => abrir(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-[#6B7280] hover:border-[#D92D20] hover:text-[#D92D20] transition-all">
                          <MessageSquare className="h-3.5 w-3.5" /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-xs text-[#6B7280]">Página {page + 1} de {pages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] disabled:opacity-40">
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Detalle y respuesta ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-[#B42318]">{selected.nombre}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPOS[selected.tipo]?.cls}`}>
                    {TIPOS[selected.tipo]?.label}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                  {selected.codigo ?? "sin correlativo"} · {fechaLima(selected.created_at)}
                </p>
                <div className="mt-1"><Plazo r={selected} /></div>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Identificación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-[#D92D20] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B]">
                    {selected.doc_tipo ? `${DOC_LABEL[selected.doc_tipo] ?? selected.doc_tipo} ` : ""}
                    {selected.documento ?? "—"}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#D92D20] flex-shrink-0" />
                  <span className="text-sm text-[#1E293B] truncate">{selected.email}</span>
                </div>
                {selected.telefono && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#D92D20] flex-shrink-0" />
                    <span className="text-sm text-[#1E293B]">{selected.telefono}</span>
                  </div>
                )}
                {selected.direccion && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#D92D20] flex-shrink-0" />
                    <span className="text-sm text-[#1E293B] truncate">{selected.direccion}</span>
                  </div>
                )}
              </div>

              {selected.es_menor && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-900">Consumidor menor de edad</p>
                  <p className="text-sm text-amber-900 mt-0.5">
                    Apoderado: {selected.apoderado ?? "—"}
                  </p>
                </div>
              )}

              {(selected.bien_servicio || selected.monto || selected.bien_descripcion) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#6B7280] mb-1">Bien contratado</p>
                  <p className="text-sm text-[#1E293B]">
                    {selected.bien_servicio ? selected.bien_servicio : "No indicado"}
                    {selected.monto ? ` · S/ ${Number(selected.monto).toFixed(2)}` : ""}
                  </p>
                  {selected.bien_descripcion && (
                    <p className="text-sm text-[#1E293B] mt-1.5 whitespace-pre-wrap">
                      {selected.bien_descripcion}
                    </p>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-[#6B7280] mb-1">Detalle del {selected.tipo}</p>
                <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{selected.descripcion}</p>
              </div>

              {selected.pedido && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#6B7280] mb-1">Pedido del consumidor</p>
                  <p className="text-sm text-[#1E293B] whitespace-pre-wrap">{selected.pedido}</p>
                </div>
              )}

              {/* Respuesta */}
              <div>
                <label className="block text-xs font-bold text-[#6B7280] mb-1.5">
                  Respuesta al consumidor
                </label>
                <textarea rows={5} value={respuesta} maxLength={4000}
                  onChange={e => { setRespuesta(e.target.value); setError(""); }}
                  placeholder="Qué se resolvió y qué se hará. Esto es la respuesta formal al reclamo."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent" />
                <p className="text-[10px] text-gray-400 mt-1">
                  Se guarda en el Libro. Enviarla al consumidor se hace por correo,
                  respondiendo al aviso que llegó con el reclamo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] mb-1.5">
                  Notas internas
                </label>
                <textarea rows={2} value={notas} maxLength={2000}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="No se comparten con el consumidor."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent" />
              </div>

              {error && (
                <p className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" /> {error}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-gray-100 space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={guardarBorrador} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#6B7280] hover:border-[#D92D20] disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar sin responder"}
                </button>
                <button type="button" onClick={() => responder("respondido")} disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7A6E] disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Marcar como respondido
                </button>
              </div>
              <div className="flex gap-2">
                {["en_proceso", "resuelto", "cerrado"].map(s => (
                  <button key={s} type="button" onClick={() => responder(s)}
                    disabled={saving || selected.estado === s}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-[#6B7280] hover:border-[#D92D20] disabled:opacity-40">
                    {ESTADOS[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
