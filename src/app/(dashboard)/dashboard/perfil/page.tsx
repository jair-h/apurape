"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

const PERFIL: Record<string, string> = {
  proveedor: "/dashboard/proveedor/perfil",
  cliente:   "/dashboard/cliente/perfil",
};

export default function PerfilRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function go() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const dest = PERFIL[profile?.role ?? ""];
      router.replace(dest ?? "/dashboard");
    }
    go();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
    </div>
  );
}
