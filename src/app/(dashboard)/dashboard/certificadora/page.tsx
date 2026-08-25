"use client";

import { Award, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CertificadoraDashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#085041]">Panel de Certificadora</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Gestiona las certificaciones de productores en tu cartera.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: CheckCircle2, label: "Certificaciones activas", value: "—", color: "text-[#1D9E75]", bg: "bg-[#E1F5EE]" },
          { icon: Clock,        label: "Por vencer (60 días)",    value: "—", color: "text-amber-600",   bg: "bg-amber-50" },
          { icon: AlertTriangle,label: "Vencidas",                value: "—", color: "text-red-500",     bg: "bg-red-50"   },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center flex-shrink-0`}>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#085041]">{m.value}</p>
              <p className="text-xs text-[#6B7280]">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Acceso rápido */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-[#085041] mb-4">Acceso rápido</h2>
        <div className="space-y-2">
          <Link href="/dashboard/certificadora/certificaciones"
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-all group">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-[#1D9E75]" />
              <div>
                <p className="text-sm font-semibold text-[#085041]">Gestionar certificaciones</p>
                <p className="text-xs text-[#6B7280]">Ver y emitir certificaciones para productores</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#1D9E75] opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

      {/* Próximamente */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <Clock className="h-10 w-10 text-[#1D9E75] mx-auto mb-3" />
        <p className="text-sm font-bold text-[#085041]">Módulo completo próximamente</p>
        <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
          Pronto podrás emitir, renovar y gestionar certificaciones directamente desde este panel.
        </p>
      </div>
    </div>
  );
}

