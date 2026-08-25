import Link from "next/link";
import { Users } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <Users className="h-16 w-16 text-gray-300 mb-4" />
      <h1 className="text-xl font-bold text-[#085041] mb-2">Perfil no encontrado</h1>
      <p className="text-sm text-[#6B7280] mb-6">Este perfil no existe o ya no está disponible.</p>
      <Link href="/servicios" className="bg-[#D92D20] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#B42318] transition-colors">
        Buscar servicios
      </Link>
    </div>
  );
}
