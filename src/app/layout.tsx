import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "CheckList Hospitalar | Gestão de Enfermaria Cirúrgica",
  description:
    "Sistema colaborativo em tempo real para gestão de rotina hospitalar, enfermarias cirúrgicas, passagens de plantão e antibioticoterapia.",
  manifest: "manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CheckList",
  },
  icons: {
    icon: [
      { url: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CheckList" />
        <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        <RealtimeProvider>{children}</RealtimeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
