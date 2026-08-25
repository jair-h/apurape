"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function CursosPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mx-auto mb-5">
          <BookOpen className="h-8 w-8 text-[#1D9E75]" />
        </div>
        <h1 className="text-xl font-extrabold text-[#085041] mb-2">Cursos y formación</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Estamos preparando contenido especializado en agroexportación, normativas internacionales y buenas prácticas agrícolas.
        </p>
        <span className="inline-block bg-[#E1F5EE] text-[#085041] text-xs font-bold px-4 py-2 rounded-full">
          Próximamente
        </span>
        <div className="mt-6">
          <Link href="/dashboard" className="text-xs text-[#1D9E75] hover:underline font-medium">
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
