"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setLoading(false);
    // Always show success (avoid leaking whether the email exists)
    if (resetError && resetError.status && resetError.status >= 500) { setError(resetError.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/apurape-mark.svg" alt="Apurape" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">Apurape</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-[#FEF3F2] p-5 rounded-2xl mb-5">
                <MailCheck className="h-9 w-9 text-[#D92D20]" />
              </div>
              <h1 className="text-xl font-extrabold text-[#B42318] mb-2">{t("auth.forgot.sentTitle")}</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">{t("auth.forgot.sent")}</p>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D92D20] hover:underline">
                <ArrowLeft className="h-4 w-4" /> {t("auth.forgot.backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("auth.forgot.title")}</h1>
              <p className="text-sm text-gray-500 mb-6">{t("auth.forgot.subtitle")}</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.forgot.email")}</label>
                  <input type="email" required placeholder="tu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#D92D20] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#912018] transition-colors disabled:opacity-60">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.forgot.sending")}</> : <>{t("auth.forgot.submit")} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D92D20] hover:underline">
                  <ArrowLeft className="h-4 w-4" /> {t("auth.forgot.backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
