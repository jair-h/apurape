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
    .eq("id", id)
    .single();

  const displayName = profile?.business_name || profile?.name || "Perfil Apurape";
  const role = profile?.role ?? "usuario";
  const roleLabel: Record<string, string> = {
    proveedor: "Proveedor de servicios",
    cliente: "Cliente",
  };
  const description = `${displayName} — ${roleLabel[role] ?? role} en Apurape. ${profile?.bio ?? "Marketplace de servicios en Perú."}`.slice(0, 160);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.apurape.com"}/perfil/${id}`;

  return {
    title: `${displayName} | Apurape`,
    description,
    openGraph: {
      title: displayName,
      description,
      url,
      siteName: "Apurape",
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
