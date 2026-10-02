"use client";

/* Fotos de un servicio del catálogo, con el tope del plan.
 *
 * El tope real lo aplica guard_catalog_limits en la base; esto solo evita
 * llegar hasta allí y explica por qué. El número viene de config, así que si
 * cambia no hay que desplegar.
 *
 * La primera foto es la que sale en el buscador, y eso se dice en la
 * interfaz: sin saberlo, nadie elige el orden a propósito.
 */

import { useState, useEffect } from "react";
import { Loader2, Trash2, ImagePlus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Props {
  value: string[];
  onChange: (fotos: string[]) => void;
  accountType: string;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent";

export default function PhotoEditor({ value, onChange, accountType }: Props) {
  const supabase = createClient();
  const esNegocio = accountType === "negocio";

  const [max, setMax]       = useState(esNegocio ? 8 : 3);
  const [nueva, setNueva]   = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const clave = esNegocio ? "photos_max_negocio" : "photos_max_persona";
      const { data } = await supabase.from("config").select("value").eq("key", clave).maybeSingle();
      if (data?.value != null) setMax(Number(data.value));
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType]);

  const agregar = (url: string) => {
    const u = url.trim();
    if (!u || value.includes(u) || value.length >= max) return;
    onChange([...value, u]);
    setNueva("");
  };

  const quitar = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  /* Mover al frente en vez de arrastrar: en móvil arrastrar es frágil, y lo
     único que de verdad importa es cuál queda primera. */
  const alFrente = (i: number) => {
    if (i === 0) return;
    const copia = [...value];
    const [f] = copia.splice(i, 1);
    onChange([f, ...copia]);
  };

  const lleno = value.length >= max;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wide">Fotos</p>
        <p className="text-[11px] text-[#6B7280]">
          {cargando ? "…" : `${value.length} de ${max}`}
          {!esNegocio && !cargando && <span className="text-[#0E9384]"> · Negocio permite 8</span>}
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />

              {i === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-[#0E9384] text-white text-[9px] font-bold text-center py-0.5">
                  Portada
                </span>
              ) : (
                <button type="button" onClick={() => alFrente(i)}
                  title="Usar como portada"
                  className="absolute bottom-1 left-1 p-1 rounded bg-white/90 text-[#6B7280] hover:text-[#0E9384] transition-colors">
                  <Star className="h-3 w-3" />
                </button>
              )}

              <button type="button" onClick={() => quitar(i)}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute top-1 right-1 p-1 rounded bg-white/90 text-gray-500 hover:text-[#D92D20] transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lleno ? (
        <p className="text-[11px] text-[#6B7280] bg-gray-50 rounded-lg px-3 py-2">
          {esNegocio
            ? `Llegaste a las ${max} fotos. Quita una para subir otra.`
            : `Llegaste a las ${max} fotos del plan Persona. El plan Negocio permite 8.`}
        </p>
      ) : (
        <>
          <ImageUpload value={nueva} onChange={agregar} folder="servicios" inputClassName={inputClass} />
          <p className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
            <ImagePlus className="h-3 w-3" /> La primera foto es la que se ve en el buscador.
          </p>
        </>
      )}
    </div>
  );
}
