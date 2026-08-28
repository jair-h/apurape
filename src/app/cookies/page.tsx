"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

type Section = { title: string; body: string; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    title: "1. Qué son",
    body: "Las cookies son pequeños archivos que se almacenan en el navegador del usuario para mejorar su experiencia y recordar sus preferencias.",
  },
  {
    title: "2. Cookies que usamos",
    body: "Usamos dos tipos de cookies:",
    bullets: [
      "Necesarias: mantener la sesión iniciada y la seguridad del sitio.",
      "Analíticas: entender el uso de la Plataforma (por ejemplo, Google Analytics).",
    ],
  },
  {
    title: "3. Gestión de cookies",
    body: "Al ingresar por primera vez, se muestra un aviso de cookies donde el usuario puede aceptar o rechazar las no esenciales. El usuario puede eliminar o bloquear cookies desde la configuración de su navegador en cualquier momento.",
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
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#D92D20] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Política de Cookies
          </h1>
          <p className="text-sm text-gray-400 mb-12">Última actualización: 28 de agosto de 2026</p>

          <div className="space-y-10">
            {SECTIONS.map((s, i) => (
              <section key={i}>
                <h2 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
                <p className="text-gray-600 leading-relaxed">{s.body}</p>
                {s.bullets && (
                  <ul className="mt-3 space-y-2 list-disc pl-5">
                    {s.bullets.map((b) => (
                      <li key={b} className="text-gray-600 leading-relaxed">{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
