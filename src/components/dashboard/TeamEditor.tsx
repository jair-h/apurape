"use client";

/* "Nuestro equipo" del perfil de Negocio: fotos y nombres.
 *
 * Sin cuentas separadas, a propósito: son retratos del negocio, no usuarios
 * que entran a Apurape. Nadie inicia sesión como "Rosa, estilista".
 *
 * Guarda cada cambio al momento en vez de acumular un borrador: la lista es
 * corta y un botón de "guardar equipo" aparte del resto del formulario se
 * olvida con facilidad.
 */

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Miembro {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  order_num: number;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent";

export default function TeamEditor({ providerId }: { providerId: string }) {
  const supabase = createClient();

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [max, setMax]           = useState(12);
  const [error, setError]       = useState<string | null>(null);

  /* Borrador del nuevo integrante. */
  const [nombre, setNombre] = useState("");
  const [rol, setRol]       = useState("");
  const [foto, setFoto]     = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: rows }, { data: cfg }] = await Promise.all([
        supabase.from("team_members")
          .select("id, name, role, photo_url, order_num")
          .eq("provider_id", providerId)
          .order("order_num"),
        supabase.from("config").select("value").eq("key", "team_max").maybeSingle(),
      ]);
      setMiembros((rows as Miembro[]) ?? []);
      if (cfg?.value != null) setMax(Number(cfg.value));
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const agregar = async () => {
    const n = nombre.trim();
    if (!n) { setError("Escribe el nombre."); return; }

    setGuardando(true);
    setError(null);

    const { data, error: e } = await supabase.from("team_members")
      .insert({
        provider_id: providerId,
        name: n,
        role: rol.trim() || null,
        photo_url: foto.trim() || null,
        order_num: miembros.length,
      })
      .select("id, name, role, photo_url, order_num")
      .single();

    if (e) {
      /* El trigger guard_team_size corta en el máximo; su mensaje ya está
         en español y dice el número, así que se muestra tal cual. */
      setError(e.message);
    } else if (data) {
      setMiembros(prev => [...prev, data as Miembro]);
      setNombre(""); setRol(""); setFoto("");
    }
    setGuardando(false);
  };

  const quitar = async (id: string) => {
    const previos = miembros;
    setMiembros(prev => prev.filter(m => m.id !== id));   // optimista
    const { error: e } = await supabase.from("team_members").delete().eq("id", id);
    if (e) { setMiembros(previos); setError("No se pudo quitar. Intenta de nuevo."); }
  };

  if (cargando) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#D92D20]" /></div>;
  }

  const lleno = miembros.length >= max;

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
          <Users className="h-4 w-4 text-[#0E9384]" /> Nuestro equipo
        </p>
        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
          Las personas que trabajan en tu negocio. No necesitan cuenta propia:
          solo se muestran en tu perfil. {miembros.length} de {max}.
        </p>
      </div>

      {miembros.length > 0 && (
        <ul className="space-y-2">
          {miembros.map(m => (
            <li key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                {m.photo_url
                  ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                {m.role && <p className="text-[11px] text-[#6B7280] truncate">{m.role}</p>}
              </div>
              <button type="button" onClick={() => quitar(m.id)}
                className="p-2 text-gray-400 hover:text-[#D92D20] transition-colors" aria-label={`Quitar a ${m.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lleno ? (
        <p className="text-[11px] text-[#6B7280] bg-gray-50 rounded-xl p-3">
          Llegaste al máximo de {max} integrantes. Quita uno para agregar otro.
        </p>
      ) : (
        <div className="border border-dashed border-gray-300 rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input type="text" value={nombre} maxLength={80}
              onChange={e => { setNombre(e.target.value); setError(null); }}
              placeholder="Nombre" className={inputClass} />
            <input type="text" value={rol} maxLength={60}
              onChange={e => setRol(e.target.value)}
              placeholder="Qué hace (opcional)" className={inputClass} />
          </div>

          <ImageUpload value={foto} onChange={setFoto} folder="equipo" inputClassName={inputClass} />

          <button type="button" onClick={agregar} disabled={guardando || !nombre.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E9384] text-white text-xs font-bold hover:bg-[#0B7A6E] disabled:opacity-40 transition-colors">
            {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Agregar al equipo
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-[#B42318] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" /> {error}
        </p>
      )}
    </div>
  );
}
