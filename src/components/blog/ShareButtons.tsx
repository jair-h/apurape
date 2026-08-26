"use client";

import { useState } from "react";
import { Link2, Check, MessageCircle } from "lucide-react";

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  const shareWhatsApp = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-gray-500">Compartir:</span>
      <button type="button" onClick={copyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:border-[#D92D20] hover:text-[#D92D20] transition-all">
        {copied ? <Check className="h-3.5 w-3.5 text-[#D92D20]" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>
      <button type="button" onClick={shareWhatsApp}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:border-[#D92D20] hover:text-[#D92D20] transition-all">
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </button>
    </div>
  );
}
