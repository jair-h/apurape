"use client";

/* Corazón de favorito. Se usa en el perfil público y sobre las tarjetas
 * del buscador de servicios.
 *
 * En el buscador la tarjeta entera es un <Link>, así que el click tiene
 * que cortarse aquí (preventDefault + stopPropagation) o navegaría al
 * perfil en vez de guardar.
 *
 * Estado optimista: el corazón cambia al instante y se revierte si la
 * escritura falla. Guardar un favorito no debería sentirse lento. */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Props {
  providerId: string;
  /** "icon" para la tarjeta del buscador, "full" para el perfil. */
  variant?: "icon" | "full";
  className?: string;
}

export default function FavoriteButton({ providerId, variant = "icon", className = "" }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId]   = useState<string | null>(null);
  const [isFav, setIsFav]     = useState(false);
  const [ready, setReady]     = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("favorites")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("provider_id", providerId)
        .maybeSingle();

      setIsFav(!!data);
      setReady(true);
    })();
  }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) { router.push(`/login?next=/perfil/${providerId}`); return; }
    if (saving || userId === providerId) return;

    const siguiente = !isFav;
    setIsFav(siguiente);          // optimista
    setSaving(true);

    const { error } = siguiente
      ? await supabase.from("favorites").insert({ client_id: userId, provider_id: providerId })
      : await supabase.from("favorites").delete()
          .eq("client_id", userId).eq("provider_id", providerId);

    if (error) setIsFav(!siguiente);   // revertir
    setSaving(false);
  };

  // No tiene sentido guardarse a uno mismo.
  if (ready && userId === providerId) return null;

  if (variant === "full") {
    return (
      <button type="button" onClick={toggle} disabled={saving}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60 ${
          isFav
            ? "border-[#0E9384] text-[#0E9384] bg-teal-50"
            : "border-gray-200 text-[#6B7280] hover:border-[#0E9384] hover:text-[#0E9384]"
        } ${className}`}>
        {saving
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-[#0E9384]" : ""}`} />}
        {isFav ? "Guardado en favoritos" : "Guardar en favoritos"}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} disabled={saving}
      aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors ${className}`}>
      {saving
        ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        : <Heart className={`h-4 w-4 transition-colors ${isFav ? "text-[#0E9384] fill-[#0E9384]" : "text-gray-400"}`} />}
    </button>
  );
}
