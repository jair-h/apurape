"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, Building2, Truck, Globe, Users, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

/* Same roles as /register (the ones with a dashboard) */
const ROLES = [
  { id: "productor",     icon: Sprout,    iconClass: "text-[#1D9E75] bg-green-100",   borderClass: "hover:border-[#1D9E75]" },
  { id: "exportador",    icon: Building2, iconClass: "text-blue-600 bg-blue-100",     borderClass: "hover:border-blue-500" },
  { id: "forwarder",     icon: Truck,     iconClass: "text-orange-600 bg-orange-100", borderClass: "hover:border-orange-500" },
  { id: "comprador",     icon: Globe,     iconClass: "text-purple-600 bg-purple-100", borderClass: "hover:border-purple-500" },
  { id: "certificadora", icon: Users,     iconClass: "text-pink-600 bg-pink-100",     borderClass: "hover:border-pink-500" },
] as const;

export default function RegisterRolePage() {
  const { t, lang } = useTranslation();
  const [ready, setReady]   = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError]   = useState("");

  // Require an authenticated (OAuth) session; skip if a role already exists.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (profile?.role) { window.location.href = "/dashboard"; return; }
      setReady(true);
    })();
  }, []);

  const choose = async (roleId: string) => {
    setError("");
    setSaving(roleId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const name = (user.user_metadata?.full_name as string)
      || (user.user_metadata?.name as string)
      || user.email
      || "Usuario";

    // Upsert: update the role if a profile row already exists, otherwise create it.
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const { error: saveError } = existing
      ? await supabase.from("profiles").update({ role: roleId }).eq("user_id", user.id)
      : await supabase.from("profiles").insert({ user_id: user.id, role: roleId, name });

    if (saveError) { setError(saveError.message); setSaving(null); return; }

    // Email de bienvenida (best-effort). Se envía siempre que el usuario acaba de elegir su rol:
    // esta pantalla solo se alcanza SIN rol previo (si ya tenía rol, el useEffect redirige al dashboard),
    // así que es un registro nuevo aunque ya exista una fila en profiles creada por un trigger.
    if (user.email) {
      console.log("[register] llamando a brevo welcome...");
      try {
        await fetch("/api/brevo/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, name, rol: roleId }),
        });
      } catch { /* no bloquea el registro */ }

      // Best-effort CRM sync en Brevo (nunca bloquea el registro)
      try {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        await fetch("/api/brevo/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            nombre: parts[0] || name,
            apellido: parts.slice(1).join(" "),
            rol: roleId,
            estadoPlan: "trial",
            fechaRegistro: new Date().toISOString(),
            idioma: lang,
          }),
        });
      } catch { /* best-effort */ }
    }

    window.location.href = "/dashboard";
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1D9E75] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/markaru-logo.png" alt="MARKARU" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">MARKARU</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("auth.google.chooseRoleTitle")}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("auth.google.chooseRoleSubtitle")}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                disabled={saving !== null}
                onClick={() => choose(role.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 border-gray-200 bg-white ${role.borderClass} disabled:opacity-60`}
              >
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${role.iconClass}`}>
                  {saving === role.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <role.icon className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t(`auth.register.roles.${role.id}.label`)}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{t(`auth.register.roles.${role.id}.description`)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
