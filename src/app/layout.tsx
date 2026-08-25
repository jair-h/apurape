import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://markaru.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MARKARU - El hub agroexportador de LATAM",
  description:
    "Conectamos productores, exportadores y compradores del agro latinoamericano con el mundo. Sin intermediarios, más negocio.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "MARKARU",
    title: "MARKARU - El hub agroexportador de LATAM",
    description:
      "Conectamos productores, exportadores y compradores del agro latinoamericano con el mundo. Sin intermediarios, más negocio.",
    url: SITE_URL,
    images: [{ url: "/images/markaru-logo.png", width: 500, height: 500, alt: "MARKARU" }],
  },
  twitter: {
    card: "summary",
    title: "MARKARU - El hub agroexportador de LATAM",
    description:
      "Conectamos productores, exportadores y compradores del agro latinoamericano con el mundo. Sin intermediarios, más negocio.",
    images: ["/images/markaru-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
          <GoogleAnalytics />
        </body>
    </html>
  );
}
