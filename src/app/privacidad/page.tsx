"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

type Section = { title: string; body: string; bullets?: string[]; after?: string };

/* El correo de contacto para derechos ARCO queda pendiente hasta que exista
 * la casilla dedicada de Apurape. Aparece marcado en la sección 6. */
const CONTACTO_ARCO = "[PENDIENTE — correo de contacto de Apurape]";

const SECTIONS: Section[] = [
  {
    title: "1. Responsable del tratamiento",
    body: "Apurape es responsable del tratamiento de los datos personales que los usuarios proporcionan al registrarse y usar la Plataforma, conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su Reglamento.",
  },
  {
    title: "2. Datos que recopilamos",
    body: "Recopilamos los siguientes datos:",
    bullets: [
      "Datos de registro: nombre, correo electrónico, teléfono, tipo de cuenta (persona/negocio).",
      "Datos de perfil: región, distrito, servicios ofrecidos, fotos, precios.",
      "Datos de uso: mensajes dentro del chat, cotizaciones, historial de servicios confirmados, calificaciones.",
      "Datos de pago: procesados directamente por Culqi; Apurape no almacena datos completos de tarjetas.",
      "Para entrega de premios del Concurso Mensual: nombre completo, DNI o Carné de Extranjería, firma (Acta de Entrega), únicamente a quienes resulten ganadores.",
    ],
  },
  {
    title: "3. Finalidad del tratamiento",
    body: "Los datos se usan para: operar la Plataforma (registro, contacto, cotización, pagos), calcular el ranking del Concurso Mensual, comunicar novedades y confirmaciones por correo, y cumplir obligaciones legales (incluyendo sustento ante SUNAT de premios entregados).",
  },
  {
    title: "4. Consentimiento",
    body: "Al registrarse, el usuario debe marcar expresamente una casilla de aceptación del tratamiento de sus datos para los fines descritos, incluyendo su participación en el Concurso Mensual si aplica.",
  },
  {
    title: "5. Terceros con acceso a datos",
    body: "Compartimos datos únicamente con:",
    bullets: [
      "Culqi: procesamiento de pagos.",
      "Brevo: envío de correos transaccionales (bienvenida, confirmaciones, vencimientos).",
      "Auspiciadores del Concurso Mensual, únicamente los datos necesarios para hacer entrega del premio a un ganador, con su consentimiento expreso.",
    ],
  },
  {
    title: "6. Derechos del usuario (derechos ARCO)",
    body: `El usuario puede solicitar en cualquier momento el acceso, rectificación, cancelación u oposición al tratamiento de sus datos, escribiendo a ${CONTACTO_ARCO}.`,
  },
  {
    title: "7. Conservación de datos",
    body: "Los datos se conservan mientras la cuenta esté activa y, tras su eliminación, por el plazo legal necesario para cumplir obligaciones tributarias y de defensa del consumidor.",
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
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#D92D20] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Política de Privacidad
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
                {s.after && <p className="text-gray-600 leading-relaxed mt-3">{s.after}</p>}
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
