"use client";

/* Subida de imágenes al bucket 'apurape'.
 *
 * Antes apuntaba a 'operation-docs', un nombre heredado de MARKARU que en
 * este proyecto no existe: toda subida fallaba, aquí y en el blog y los
 * banners del admin.
 *
 * La ruta SIEMPRE empieza por el id del usuario, porque las políticas de
 * storage solo permiten escribir cuando el primer segmento de la ruta es
 * auth.uid(). Eso es lo que impide que alguien sobrescriba el logo de otro.
 * Si cambias el convenio de rutas, revisa esas políticas.
 */

import { useRef, useState } from "react";
import { Upload, Loader2, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ImageHint } from "@/components/ImageHint";

const MAX_BYTES = 5 * 1024 * 1024;   // el bucket rechaza por encima de 5 MB
const BUCKET    = "apurape";

/** Tipos que el bucket acepta. Enviar otro da un error poco claro de
 *  storage, así que se corta antes. */
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

interface Props {
  value: string;
  onChange: (url: string) => void;
  inputClassName?: string;
  folder?: string;
}

export function ImageUpload({ value, onChange, inputClassName, folder = "imagenes" }: Props) {
  const fileRef             = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!TIPOS.includes(file.type)) {
      setError("Usa una imagen JPG, PNG, WebP o AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no puede superar 5 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Tu sesión expiró. Vuelve a entrar para subir imágenes.");
      setUploading(false);
      return;
    }

    const ext  = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(`Error al subir: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => { setError(null); onChange(e.target.value); }}
          placeholder="https://..."
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-[#D92D20] hover:text-[#D92D20] bg-white disabled:opacity-50 transition-all whitespace-nowrap"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Subiendo..." : "Subir imagen"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={TIPOS.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <ImageHint />
    </div>
  );
}
