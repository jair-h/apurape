"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2, Share2, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { findOrCreateConversation } from "@/lib/conversations";

/** Contact (chat if logged in, else /login) + share — the interactive part of the public profile. */
export default function ProfileActions({ profileUserId }: { profileUserId: string }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [shareOpen, setShareOpen]         = useState(false);
  const [copied, setCopied]               = useState(false);
  const [profileUrl, setProfileUrl]       = useState("");

  useEffect(() => {
    setProfileUrl(`${window.location.origin}/perfil/${profileUserId}`);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setCurrentUserId(user?.id ?? null);
    });
  }, [profileUserId]);

  const handleContact = async () => {
    if (!currentUserId) return;
    setContactLoading(true);
    const convId = await findOrCreateConversation(currentUserId, profileUserId);
    router.push(convId ? `/dashboard/mensajes?conv=${convId}` : "/dashboard/mensajes");
    setContactLoading(false);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(profileUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <>
      {isLoggedIn ? (
        <button type="button" onClick={handleContact} disabled={contactLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#085041] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
          {contactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Enviar mensaje
        </button>
      ) : (
        <Link href={`/login?next=/perfil/${profileUserId}`}
          className="w-full flex items-center justify-center gap-2 bg-[#085041] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D9E75] transition-colors shadow-sm">
          <MessageCircle className="h-4 w-4" /> Contactar
        </Link>
      )}
      {!isLoggedIn && <p className="text-[10px] text-center text-[#6B7280] mt-2">Inicia sesión para contactar</p>}

      {/* Share */}
      <div className="mt-3">
        <button type="button" onClick={() => setShareOpen((s) => !s)}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-[#6B7280] py-2 rounded-xl text-xs font-bold hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors">
          <Share2 className="h-3.5 w-3.5" /> Compartir perfil
        </button>
        {shareOpen && (
          <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-2">
            <button type="button" onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-[#374151] py-1.5 rounded-lg text-xs font-semibold hover:border-[#1D9E75] transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-[#1D9E75]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "¡Copiado!" : "Copiar link"}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent("Mira este perfil en MARKARU: " + profileUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#1877F2] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">Facebook</a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#0A66C2] text-white py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">LinkedIn</a>
          </div>
        )}
      </div>
    </>
  );
}
