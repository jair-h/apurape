"use client";

import { Award, Clock } from "lucide-react";
import Link from "next/link";

export default function CertificadoraCertificacionesPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#085041]">Certificaciones</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Historial y estado de todas las certificaciones emitidas.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-5">
          <Award className="h-8 w-8 text-[#1D9E75]" />
        </div>
        <h2 className="text-lg font-bold text-[#085041] mb-2">Sin certificaciones aún</h2>
        <p className="text-sm text-[#6B7280] max-w-xs">
          Cuando emitas certificaciones a productores aparecerán aquí con su estado y fecha de vencimiento.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Módulo de emisión próximamente disponible
        </div>
        <Link href="/dashboard/certificadora" className="mt-6 text-xs text-[#1D9E75] hover:underline font-medium">
          ← Volver al panel
        </Link>
      </div>
    </div>
  );
}

