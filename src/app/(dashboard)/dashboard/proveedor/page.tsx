"use client";

/* PROVISIONAL — bloque 3.
 * Aterrizaje del Proveedor para que la sesión no caiga en un 404 mientras
 * se construyen /servicios, /solicitudes, /cotizaciones y /trabajos. */

import { useEffect, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ProveedorHomePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ rating: 0, jobs: 0, fiveStars: 0 });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("name, business_name, rating, confirmed_jobs_count, five_star_count")
        .eq("id", user.id)
        .single();
      if (data) {
        setName(data.business_name || data.name || "");
        setStats({
          rating: Number(data.rating ?? 0),
          jobs: data.confirmed_jobs_count ?? 0,
          fiveStars: data.five_star_count ?? 0,
        });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-[#D92D20] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Hola{name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Tú me ayudas, yo te ayudo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        {[
          { label: "Calificación", value: stats.rating.toFixed(2) },
          { label: "Servicios confirmados", value: stats.jobs },
          { label: "Calificaciones de 5★", value: stats.fiveStars },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-2xl font-extrabold text-[#D92D20]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-2xl">
        <Wrench className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">Panel en construcción</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Tus servicios, cotizaciones y trabajos llegan en el siguiente paso.
            Con 3 calificaciones de 5 estrellas en el mes entras al sorteo de tu categoría.
          </p>
        </div>
      </div>
    </div>
  );
}
