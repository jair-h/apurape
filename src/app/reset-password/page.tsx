"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The recovery link puts a token in the URL hash; the Supabase browser client
  // establishes the session automatically. Confirm it's available.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError(t("auth.reset.tooShort")); return; }
    if (password !== confirm) { setError(t("auth.reset.mismatch")); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(/session|Auth session missing/i.test(updateError.message) ? t("auth.reset.invalidLink") : (updateError.message || t("auth.reset.error")));
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/markaru-logo.png" alt="MARKARU" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">MARKARU</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {done ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-[#E1F5EE] p-5 rounded-2xl mb-5">
                <CheckCircle2 className="h-9 w-9 text-[#1D9E75]" />
              </div>
              <h1 className="text-xl font-extrabold text-[#085041] mb-2">{t("auth.reset.successTitle")}</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">{t("auth.reset.success")}</p>
              <Link href="/login" className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#167a5a] transition-colors">
                {t("auth.reset.goToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("auth.reset.title")}</h1>
              <p className="text-sm text-gray-500 mb-6">{t("auth.reset.subtitle")}</p>

              {hasSession === false && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  {t("auth.reset.invalidLink")}
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.reset.password")}</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} required minLength={8}
                      value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.reset.confirm")}</label>
                  <input type={show ? "text" : "password"} required minLength={8}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#167a5a] transition-colors disabled:opacity-60">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.reset.saving")}</> : t("auth.reset.submit")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
