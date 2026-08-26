"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

const REDIRECT: Record<string, string> = {
  proveedor: "/dashboard/proveedor",
  cliente:   "/dashboard/cliente",
  admin:     "/dashboard/admin",
};

export default function DashboardIndexPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    async function redirect() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        startTransition(() => router.replace("/login"));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Sin rol reconocido cae a Cliente: es el rol por defecto de
      // profiles y el único que no requiere onboarding.
      const dest = REDIRECT[profile?.role ?? ""] ?? "/dashboard/cliente";
      startTransition(() => router.replace(dest));
    }

    redirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 text-[#D92D20] animate-spin" />
        <p className="text-sm text-gray-500">Cargando tu dashboard...</p>
      </div>
    </div>
  );
}
