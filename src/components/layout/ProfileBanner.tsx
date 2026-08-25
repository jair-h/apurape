"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

const PROFILE_HREF: Record<string, string> = {
  proveedor: "/dashboard/proveedor/perfil",
  cliente:   "/dashboard/cliente/perfil",
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
        .select("role, name, business_name, district")
        .eq("id", user.id)
        .single();

      if (!profile) return;
      const role = profile.role as string | null;
      if (!role || !PROFILE_HREF[role]) return; // admin doesn't need this

      setHref(PROFILE_HREF[role]);

      // Un perfil está "completo" si tiene nombre (o razón social) y distrito:
      // sin distrito no aparece en las búsquedas por zona.
      const hasName = !!(profile.name || profile.business_name);
      if (!hasName || !profile.district) setShow(true);
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
