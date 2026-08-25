"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

const PROFILE_HREF: Record<string, string> = {
  productor:    "/dashboard/productor/perfil",
  exportador:   "/dashboard/exportador/perfil",
  forwarder:    "/dashboard/forwarder/perfil",
  comprador:    "/dashboard/comprador/perfil",
};

export default function ProfileBanner() {
  const [show, setShow] = useState(false);
  const [href, setHref]   = useState("/dashboard/perfil");

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name, business_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      const role = profile.role as string | null;
      if (!role || !PROFILE_HREF[role]) return; // admin/certificadora don't need this

      setHref(PROFILE_HREF[role]);

      // Check if the base profile has a name
      const hasName = !!(profile.name || profile.business_name);

      if (!hasName) { setShow(true); return; }

      // For productor and exportador also check role-specific profile
      if (role === "productor") {
        const { data: pp } = await supabase
          .from("producer_profiles")
          .select("farm_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!pp?.farm_name) setShow(true);
      } else if (role === "exportador") {
        const { data: ep } = await supabase
          .from("exporter_profiles")
          .select("razon_social")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!ep?.razon_social) setShow(true);
      }
    }
    check();
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex-shrink-0">
      <UserCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <p className="text-xs text-amber-800 flex-1">
        <span className="font-bold">Completa tu perfil</span> para que los demás te encuentren y puedan contactarte.
      </p>
      <Link
        href={href}
        className="flex-shrink-0 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors"
        onClick={() => setShow(false)}
      >
        Completar perfil
      </Link>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="flex-shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
