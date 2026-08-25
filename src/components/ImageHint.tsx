/**
 * Indicación de calidad de imagen — se muestra debajo de cada campo de subida de foto.
 * Texto único y reutilizable para mantener consistencia en toda la plataforma.
 */
export function ImageHint({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-[#6B7280] mt-1.5 ${className}`}>
      📷 Recomendado: JPG o PNG, mínimo 800x600px, máximo 5MB. Imágenes cuadradas se ven mejor.
    </p>
  );
}
