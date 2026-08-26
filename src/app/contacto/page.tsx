"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Clock, Share2, CheckCircle2 } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { useTranslation } from "@/lib/i18n";

export default function ContactoPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <LandingNavbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#D92D20] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("legal.backToHome")}
          </Link>

          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              {t("contact.title")}
            </h1>
            <p className="text-lg text-gray-500">{t("contact.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Form */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-[#D92D20] mb-4" />
                  <p className="text-lg font-bold text-gray-900 mb-2">{t("contact.form.success")}</p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: "", email: "", message: "" }); }}
                    className="mt-6 text-sm text-[#D92D20] font-medium hover:underline"
                  >
                    {t("contact.form.sendAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t("contact.form.name")}
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder={t("contact.form.namePlaceholder")}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t("contact.form.email")}
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t("contact.form.message")}
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      value={form.message}
                      onChange={handleChange}
                      placeholder={t("contact.form.messagePlaceholder")}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D92D20] focus:border-transparent transition resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#D92D20] hover:bg-[#912018] text-white font-bold py-3.5 rounded-xl transition-colors"
                  >
                    {t("contact.form.send")}
                  </button>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-red-100 p-2 rounded-xl">
                    <Mail className="h-5 w-5 text-[#D92D20]" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t("contact.info.emailLabel")}</h3>
                </div>
                <p className="text-sm text-[#D92D20] font-medium">{t("contact.info.email")}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-red-100 p-2 rounded-xl">
                    <Clock className="h-5 w-5 text-[#D92D20]" />
                  </div>
                  <h3 className="font-bold text-gray-900">Tiempos de respuesta</h3>
                </div>
                <p className="text-sm text-gray-500">{t("contact.info.response")}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-red-100 p-2 rounded-xl">
                    <Share2 className="h-5 w-5 text-[#D92D20]" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t("contact.info.socialsLabel")}</h3>
                </div>
                <p className="text-sm text-gray-500">{t("contact.info.comingSoon")}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
            <span className="font-bold text-sm text-white">Apurape</span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Apurape. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}
