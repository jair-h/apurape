/* Insignia de verificado, distinta según el tipo de cuenta.
 *
 * Antes era el mismo check teal para todos, así que no distinguía a un
 * negocio formal de una persona con identidad comprobada — justo la
 * diferencia que el plan Negocio paga por mostrar.
 *
 * La otorga un administrador, no el sistema: tener un RUC bien formado no
 * prueba que el negocio exista ni que sea suyo (ver migración 030). La
 * insignia dice "alguien lo revisó", y eso es lo que la hace valer.
 */

import { CheckCircle2, Store } from "lucide-react";

type Size = "sm" | "md";

interface Props {
  verified: boolean | null | undefined;
  accountType: string | null | undefined;
  /** "icon" para tarjetas apretadas, "full" para el perfil. */
  variant?: "icon" | "full";
  size?: Size;
}

export default function VerifiedBadge({
  verified, accountType, variant = "icon", size = "sm",
}: Props) {
  if (!verified) return null;

  const esNegocio = accountType === "negocio";
  const icono = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const Icono = esNegocio ? Store : CheckCircle2;
  const texto = esNegocio ? "Negocio Verificado" : "Identidad verificada";

  /* El negocio va en teal sólido y la persona en contorno: se distinguen de
     un vistazo, sin tener que leer. */
  if (variant === "icon") {
    return esNegocio ? (
      <span title={texto}
        className="inline-flex items-center gap-1 bg-[#0E9384] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
        <Store className="h-2.5 w-2.5" /> Negocio
      </span>
    ) : (
      <CheckCircle2 className={`${icono} text-[#0E9384] flex-shrink-0`} aria-label={texto} />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap ${
      esNegocio
        ? "bg-[#0E9384] text-white px-3 py-1 text-[11px]"
        : "border border-teal-300 bg-teal-50 text-[#0E9384] px-2.5 py-1 text-[11px]"}`}>
      <Icono className={icono} /> {texto}
    </span>
  );
}
