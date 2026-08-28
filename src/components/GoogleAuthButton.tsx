"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

/**
 * ─── Google OAuth: DESACTIVADO ───────────────────────────────────────────
 * Apurape todavía no tiene credenciales de Google OAuth propias (las que
 * había eran del proyecto MARKARU). Mientras no existan, el botón no se
 * muestra: pulsarlo llevaría a una pantalla de error de Google.
 *
 * Para reactivarlo, cuando el proveedor esté configurado:
 *   1. Google Cloud Console → crear credenciales OAuth para este proyecto.
 *   2. Supabase → Authentication → Providers → Google → pegar client id y
 *      secret, y añadir la URL de callback del sitio.
 *   3. Poner GOOGLE_AUTH_ENABLED en true, aquí abajo. Nada más.
 *
 * Ojo con el estado de la app en Google: si queda en "Testing", solo los
 * correos añadidos como testers podrán entrar. Para abrirlo a todos hay que
 * publicarla (OAuth consent screen → Publish app).
 * ─────────────────────────────────────────────────────────────────────────
 */
const GOOGLE_AUTH_ENABLED = false;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export default function GoogleAuthButton({ context }: { context: "login" | "register" }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates to Google; only reset on error.
    if (error) setLoading(false);
  };

  // El return va después de los hooks para no romper el orden de llamada.
  if (!GOOGLE_AUTH_ENABLED) return null;

  return (
    <div>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">
            {t(context === "login" ? "auth.google.orLogin" : "auth.google.orRegister")}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        {t("auth.google.continue")}
      </button>
    </div>
  );
}
