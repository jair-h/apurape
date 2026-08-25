"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = "G-R42V79QXCK";
const LS_KEY = "markaru_cookie_consent";

/**
 * Google Analytics 4.
 * - Loads only in production (never in local dev).
 * - Loads only after the user accepted cookies (markaru_cookie_consent === "accepted").
 *   Reacts to the "markaru-cookie-consent" event so it activates right after accepting,
 *   without needing a page reload.
 */
export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const check = () => setConsented(localStorage.getItem(LS_KEY) === "accepted");
    check();
    window.addEventListener("markaru-cookie-consent", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("markaru-cookie-consent", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  if (process.env.NODE_ENV !== "production" || !consented) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
