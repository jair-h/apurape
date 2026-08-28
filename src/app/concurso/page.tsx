"use client";

/* Bases del Concurso Mensual.
 *
 * Ojo con el vocabulario: el documento legal define esto explícitamente como
 * un CONCURSO de mérito y no como un sorteo, porque el ganador se determina
 * por desempeño y no por azar. Toda la copia de esta página usa "concurso"
 * a propósito. */

import Link from "next/link";
import { ArrowLeft, Trophy, ShieldCheck } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

type Section = { title: string; body: string; bullets?: string[]; after?: string };

const SECTIONS: Section[] = [
  {
    title: "1. Naturaleza del concurso",
    body: "Apurape organiza un Concurso Mensual dirigido a Proveedores y Clientes registrados. El ganador se determina exclusivamente por mérito: cantidad de servicios confirmados por el Cliente y calificación obtenida (mínimo 3 calificaciones de 5 estrellas en el periodo). No interviene el azar en la selección del ganador, por lo que este mecanismo constituye un concurso de habilidad y desempeño, no un sorteo ni juego de azar.",
  },
  {
    title: "2. Participantes",
    body: "Pueden participar los usuarios con cuenta activa en Plan Pro, separados por categoría de servicio y por tipo de cuenta (Persona / Negocio). La participación es gratuita y automática al cumplir los requisitos: no requiere pago adicional al plan que el usuario ya tenga activo.",
  },
  {
    title: "3. Premios",
    body: "Los premios varían cada mes y se anuncian con anticipación dentro de la Plataforma, indicando:",
    bullets: [
      "Descripción exacta del premio.",
      "Empresa auspiciadora, si aplica.",
      "Equivalencia en soles cuando el valor se exprese en otra moneda, con el mismo tamaño de letra que el resto del anuncio.",
    ],
  },
  {
    title: "4. Entrega de premios",
    body: "El ganador será contactado por los canales de contacto registrados en su perfil. Para la entrega de premios (efectivo, cursos, financiamiento u otros), el ganador deberá firmar un Acta de Entrega de Premio, presentando su DNI o Carné de Extranjería. Apurape podrá exigir la verificación de identidad antes de la entrega.",
  },
  {
    title: "5. Vigencia y número de premios",
    body: "El concurso se ejecuta mensualmente. El número de premios disponibles por mes se publica dentro de la sección correspondiente de la Plataforma antes del inicio de cada periodo.",
  },
  {
    title: "6. Prevención de fraude",
    body: "Apurape se reserva el derecho de excluir del conteo del concurso:",
    bullets: [
      "Cuentas con patrones de contratación recíproca entre Proveedores sin clientes externos reales.",
      "Calificaciones sospechosas de simulación.",
      "Cualquier cuenta bajo investigación por infringir los Términos de Uso.",
    ],
  },
];

export default function ConcursoPage() {
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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF3F2] flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 text-[#D92D20]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Bases del Concurso Mensual
            </h1>
          </div>
          <p className="text-sm text-gray-400 mb-8">Última actualización: 28 de agosto de 2026</p>

          <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-2xl p-5 mb-12">
            <ShieldCheck className="h-5 w-5 text-[#0E9384] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              El ganador sale de un <strong className="text-gray-900">ranking automático</strong> por
              servicios confirmados y calificaciones recibidas. No hay azar, ni votación,
              ni criterio discrecional de Apurape.
            </p>
          </div>

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
                {s.after && <p className="text-gray-600 leading-relaxed mt-3">{s.after}</p>}
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 leading-relaxed">
              Estas bases complementan los{" "}
              <Link href="/terminos" className="text-[#D92D20] font-semibold hover:underline">
                Términos y Condiciones de Uso
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="text-[#D92D20] font-semibold hover:underline">
                Política de Privacidad
              </Link>
              .
            </p>
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
