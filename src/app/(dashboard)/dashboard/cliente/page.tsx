"use client";

/* PROVISIONAL — bloque 3.
 * Aterrizaje del Cliente para que la sesión no caiga en un 404 mientras
 * se construyen /solicitudes, /trabajos y /puntos. */

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ClienteHomePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ points: 0, level: "bronce" });

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("name, points, level")
        .eq("id", user.id)
        .single();
      if (data) {
        setName(data.name || "");
        setStats({ points: data.points ?? 0, level: data.level ?? "bronce" });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-[#0E9384] animate-spin" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#0E9384]">{stats.points}</p>
          <p className="text-xs text-gray-500 mt-1">Puntos acumulados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-2xl font-extrabold text-[#0E9384] capitalize">{stats.level}</p>
          <p className="text-xs text-gray-500 mt-1">Tu nivel</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-2xl">
        <Search className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">Panel en construcción</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Publicar solicitudes y contratar llega en el siguiente paso.
            Contratar en Apurape es gratis: ganas puntos por confirmar el servicio y calificar.
          </p>
        </div>
      </div>
    </div>
  );
}
