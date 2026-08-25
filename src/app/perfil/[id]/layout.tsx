import type { Metadata } from "next";
import { createClient } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, business_name, role, avatar_url, bio")
    .eq("user_id", id)
    .single();

  const displayName = profile?.business_name || profile?.name || "Perfil MARKARU";
  const role = profile?.role ?? "usuario";
  const roleLabel: Record<string, string> = {
    productor: "Productor agrícola",
    exportador: "Exportador",
    comprador: "Comprador",
    forwarder: "Forwarder",
    certificadora: "Certificadora",
  };
  const description = `${displayName} — ${roleLabel[role] ?? role} en MARKARU. ${profile?.bio ?? "Plataforma de comercio agro en Perú y LATAM."}`.slice(0, 160);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://MARKARU.com"}/perfil/${id}`;

  return {
    title: `${displayName} | MARKARU`,
    description,
    openGraph: {
      title: displayName,
      description,
      url,
      siteName: "MARKARU",
      type: "profile",
      ...(profile?.avatar_url ? { images: [{ url: profile.avatar_url, width: 400, height: 400, alt: displayName }] } : {}),
    },
    twitter: {
      card: "summary",
      title: displayName,
      description,
      ...(profile?.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
