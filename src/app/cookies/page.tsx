"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

const SECTIONS = [
  {
    title: "1. Qué son las cookies",
    body: "Las cookies son pequeños archivos que se guardan en tu dispositivo cuando visitas una web. Permiten que la web recuerde tus preferencias y mejore tu experiencia.",
  },
  {
    title: "2. Qué cookies usamos",
    body: "Cookies esenciales: mantienen tu sesión activa y recuerdan si aceptaste las cookies. Cookies de preferencias: recuerdan tu idioma y país/moneda para mostrar precios locales. No usamos cookies publicitarias ni vendemos datos a anunciantes.",
  },
  {
    title: "3. Cómo gestionar las cookies",
    body: "Puedes aceptar o rechazar desde el banner al entrar. También puedes configurar tu navegador para bloquear cookies, aunque algunas funciones pueden no funcionar sin ellas.",
  },
];

export default function CookiesPage() {
  return (
    <>
      <LandingNavbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#1D9E75] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Política de Cookies
          </h1>
          <p className="text-sm text-gray-400 mb-12">Última actualización: julio 2026</p>

          <div className="space-y-10">
            {SECTIONS.map((s, i) => (
              <section key={i}>
                <h2 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
                <p className="text-gray-600 leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/markaru-logo.png" alt="MARKARU" className="h-8 w-auto object-contain" />
            <span className="font-bold text-sm text-white">MARKARU</span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} MARKARU. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}
