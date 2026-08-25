"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";

const SECTIONS = [
  {
    title: "1. Aceptación de los términos",
    body: "Al registrarte y usar MARKARU, aceptas estos Términos de Uso. MARKARU es una plataforma digital que conecta a productores, exportadores, agentes de carga, certificadoras y compradores del sector agrícola. Si no estás de acuerdo con estos términos, no debes usar la plataforma.",
  },
  {
    title: "2. Qué es MARKARU",
    body: "MARKARU es un espacio de conexión entre actores del comercio agrícola. Facilitamos el contacto, la comunicación y el seguimiento de operaciones entre las partes. MARKARU no compra, no vende, no transporta ni certifica productos directamente; son los usuarios quienes realizan sus operaciones entre sí.",
  },
  {
    title: "3. Registro y cuenta",
    body: "Para usar ciertas funciones debes registrarte con información veraz y actualizada. Eres responsable de mantener la confidencialidad de tu cuenta y de todas las actividades que ocurran en ella. MARKARU puede verificar la información proporcionada y suspender cuentas con datos falsos.",
  },
  {
    title: "4. Rol de MARKARU en las operaciones",
    body: "MARKARU actúa como facilitador tecnológico. Las negociaciones, acuerdos, pagos y entregas se realizan directamente entre las partes. MARKARU no es responsable por incumplimientos, calidad de productos, pagos o cualquier disputa entre usuarios, aunque ofrece herramientas de seguimiento y calificación para mayor transparencia.",
  },
  {
    title: "5. Obligaciones del usuario",
    body: "El usuario se compromete a usar la plataforma de forma lícita, a no publicar información falsa, a no suplantar identidades y a cumplir las leyes de comercio aplicables en su país y en los países de destino de sus operaciones.",
  },
  {
    title: "6. Planes y pagos",
    body: "MARKARU ofrece planes gratuitos y de pago según el rol. Las condiciones, precios y beneficios de cada plan se detallan en la página de Planes. MARKARU puede modificar los planes notificando a los usuarios.",
  },
  {
    title: "7. Propiedad intelectual",
    body: "La marca MARKARU, su logo, diseño y contenido son propiedad de MARKARU. El contenido que suben los usuarios es responsabilidad de cada usuario, quien declara tener derecho a publicarlo.",
  },
  {
    title: "8. Limitación de responsabilidad",
    body: "MARKARU no garantiza resultados comerciales ni se responsabiliza por pérdidas derivadas de operaciones entre usuarios. La plataforma se ofrece buscando siempre el mejor servicio posible.",
  },
  {
    title: "9. Modificaciones",
    body: "MARKARU puede actualizar estos términos. Los cambios se notificarán en la plataforma y el uso continuado implica su aceptación.",
  },
  {
    title: "10. Contacto",
    body: "Para cualquier consulta sobre estos términos, escríbenos a través de la página de Contacto.",
  },
  {
    title: "11. Política de reembolsos",
    body: "Los planes anuales de MARKARU no son reembolsables una vez activados y el acceso a la plataforma haya comenzado. Si experimentas un problema técnico grave imputable a MARKARU en los primeros 7 días desde la activación de tu plan, puedes contactarnos a través de la página de Contacto para evaluar tu caso. Los reembolsos, si aplicaran, se procesarán en un plazo de 10 días hábiles. Las pruebas gratuitas no dan derecho a reembolso.",
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
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#1D9E75] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Términos de Uso
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
