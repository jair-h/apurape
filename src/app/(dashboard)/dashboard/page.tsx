"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

const REDIRECT: Record<string, string> = {
  productor:    "/dashboard/productor",
  exportador:   "/dashboard/exportador",
  forwarder:    "/dashboard/forwarder",
  admin:        "/dashboard/admin",
  comprador:    "/dashboard/comprador",
  certificadora:"/dashboard/certificadora",
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
        .eq("user_id", user.id)
        .single();

      const dest = REDIRECT[profile?.role ?? ""] ?? "/login";
      startTransition(() => router.replace(dest));
    }

    redirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 text-[#1D9E75] animate-spin" />
        <p className="text-sm text-gray-500">Cargando tu dashboard...</p>
      </div>
    </div>
  );
}
