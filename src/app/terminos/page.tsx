"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

type Section = { title: string; body: string; bullets?: string[]; after?: string };

const SECTIONS: Section[] = [
  {
    title: "1. Objeto del servicio",
    body: "Apurape (“la Plataforma”, “nosotros”) es un marketplace digital que conecta a personas y negocios que ofrecen servicios o productos (“Proveedores”) con personas que los buscan (“Clientes”), operando en Perú. Apurape facilita el contacto, la cotización y la confirmación de servicios entre Proveedores y Clientes, pero no presta los servicios ni vende los productos ofrecidos por los Proveedores, ni es parte del acuerdo comercial entre Proveedor y Cliente.",
  },
  {
    title: "2. Registro y cuentas",
    body: "Para usar la Plataforma es necesario crear una cuenta:",
    bullets: [
      "Cualquier persona natural o negocio puede registrarse como Cliente, de forma gratuita, sin límites de uso.",
      "Para publicar servicios y recibir solicitudes como Proveedor, el usuario puede operar en el Plan Básico (gratuito, con límite de cotizaciones mensuales) o en el Plan Pro (pago anual).",
      "Un mismo usuario puede actuar como Proveedor y Cliente con el mismo perfil (“rol dual”).",
      "El usuario es responsable de la veracidad de la información de su perfil (nombre, contacto, servicios ofrecidos, precios).",
    ],
  },
  {
    title: "3. Planes y precios",
    body: "Los planes disponibles son:",
    bullets: [
      "Básico (Proveedor) — Gratis, vigencia indefinida, con límite de cotizaciones mensuales.",
      "Pro Persona — S/120, vigencia anual.",
      "Pro Negocio — S/330, vigencia anual.",
    ],
    after: "Los Clientes nunca pagan por registrarse ni por usar la Plataforma. Apurape no cobra comisión sobre las ventas realizadas entre Proveedor y Cliente. Los pagos se procesan a través de Culqi y los planes se activan automáticamente al confirmarse el pago. En el primer registro, el Proveedor recibe un mes gratuito de prueba, y un mes adicional gratuito al confirmar su primer pago anual.",
  },
  {
    title: "4. Responsabilidad sobre los servicios contratados",
    body: "Apurape actúa únicamente como intermediario tecnológico. La calidad, cumplimiento, plazos y condiciones del servicio contratado son responsabilidad exclusiva del Proveedor. Apurape no garantiza resultados, no participa en la ejecución del servicio, y no es responsable por daños, incumplimientos o disputas derivadas de la relación entre Proveedor y Cliente.",
  },
  {
    title: "5. Calificaciones y confirmación de servicios",
    body: "Cada servicio contratado a través de la Plataforma debe ser marcado como completado por el Proveedor y confirmado por el Cliente. Solo la confirmación del Cliente valida el servicio dentro del sistema. Las calificaciones reflejan la opinión de cada usuario y no constituyen una certificación de calidad por parte de Apurape.",
  },
  {
    title: "6. Conducta prohibida",
    body: "Está prohibido: crear cuentas falsas o duplicadas, simular servicios o confirmaciones para obtener beneficios del Concurso Mensual, publicar información falsa, ofrecer servicios ilegales, y evadir el uso de la Plataforma para el contacto inicial con fines de incumplir estos Términos.",
  },
  {
    title: "7. Modificaciones",
    body: "Apurape puede modificar estos Términos, notificando los cambios relevantes a través de la Plataforma. El uso continuado tras la modificación implica su aceptación.",
  },
  {
    title: "8. Ley aplicable",
    body: "Estos Términos se rigen por las leyes de la República del Perú.",
  },
  {
    title: "9. Política de reembolsos",
    body: "Los planes anuales de Apurape no son reembolsables una vez activados y el acceso a la plataforma haya comenzado. Si experimentas un problema técnico grave imputable a Apurape en los primeros 7 días desde la activación de tu plan, puedes contactarnos a través de la página de Contacto para evaluar tu caso. Los reembolsos, si aplicaran, se procesarán en un plazo de 10 días hábiles. Las pruebas gratuitas no dan derecho a reembolso.",
  },
];

export default function TerminosPage() {
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
            Términos y Condiciones de Uso
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

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 leading-relaxed">
              Las reglas del Concurso Mensual se detallan en un documento aparte:{" "}
              <Link href="/concurso" className="text-[#D92D20] font-semibold hover:underline">
                Bases del Concurso Mensual
              </Link>
              .
            </p>
          </div>
        </div>

        <footer className="bg-gray-900 py-8">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/images/apurape-mark.svg" alt="Apurape" className="h-8 w-auto object-contain" />
              <span className="font-bold text-sm text-white">Apurape</span>
            </div>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Apurape
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
