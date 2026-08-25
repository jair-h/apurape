"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

const SECTIONS = [
  {
    title: "1. Quiénes somos",
    body: "MARKARU es una plataforma digital de comercio agrícola. Esta política explica qué datos recopilamos, cómo los usamos y cómo los protegemos.",
  },
  {
    title: "2. Datos que recopilamos",
    body: "Al registrarte y usar MARKARU recopilamos: nombre, email, país, región, empresa, productos que publicas, mensajes dentro de la plataforma, datos de operaciones y calificaciones. Los datos de pago los procesa Culqi directamente, no MARKARU.",
  },
  {
    title: "3. Para qué usamos tus datos",
    body: "Usamos tus datos para operar la plataforma, enviarte notificaciones relevantes, mejorar el servicio y cumplir obligaciones legales.",
  },
  {
    title: "4. Con quién compartimos tus datos",
    body: "No vendemos tus datos. Los compartimos solo con otros usuarios (tu perfil y productos visibles según tu configuración) y proveedores necesarios para operar (Supabase, Vercel). Solo cuando la ley lo exija.",
  },
  {
    title: "5. Cookies",
    body: "Usamos cookies para mantener tu sesión, recordar tus preferencias de idioma y moneda. Ver Política de Cookies.",
  },
  {
    title: "6. Tus derechos",
    body: "Puedes acceder, corregir o eliminar tus datos contactándonos. También puedes cerrar tu cuenta en cualquier momento.",
  },
  {
    title: "7. Seguridad",
    body: "Usamos conexión cifrada HTTPS y base de datos protegida con autenticación para proteger tus datos.",
  },
  {
    title: "8. Cambios",
    body: "Podemos actualizar esta política. Los cambios importantes se notificarán en la plataforma.",
  },
];

export default function PrivacidadPage() {
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
            Política de Privacidad
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
