"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const LS_KEY = "markaru_cookie_consent";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(LS_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(LS_KEY, "accepted");
    // Notify listeners (e.g. Google Analytics) so they can load without a reload
    window.dispatchEvent(new Event("markaru-cookie-consent"));
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(LS_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="h-5 w-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed">
            {t("cookieBanner.text")}{" "}
            <Link href="/cookies" className="text-[#1D9E75] hover:underline font-medium">
              {t("cookieBanner.learnMore")}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
          >
            {t("cookieBanner.reject")}
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-bold text-white bg-[#1D9E75] hover:bg-[#17876a] rounded-lg transition-colors"
          >
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
