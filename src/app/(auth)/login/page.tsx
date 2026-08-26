"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(t("auth.login.incorrectCredentials"));
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <img src="/images/apurape-mark.svg" alt="Apurape" className="h-10 w-auto object-contain" />
          <span className="font-bold text-lg text-gray-900">
            Apurape
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t("auth.login.welcome")}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("auth.login.subtitle")}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.login.email")}
              </label>
              <input
                type="email"
                required
                placeholder={t("auth.login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  {t("auth.login.password")}
                </label>
                <Link href="/forgot-password" className="text-xs text-[#D92D20] hover:underline">
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={t("auth.login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#D92D20] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#912018] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.login.signingIn")}</>
              ) : (
                <>{t("auth.login.signIn")} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <GoogleAuthButton context="login" />

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              {t("auth.login.noAccount")}{" "}
              <Link href="/register" className="text-[#D92D20] font-semibold hover:underline">
                {t("auth.login.createAccount")}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Apurape
        </p>
      </div>
    </div>
  );
}
