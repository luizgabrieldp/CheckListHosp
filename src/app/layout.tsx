import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "CheckList Hospitalar | Gestão de Enfermaria Cirúrgica",
  description:
    "Sistema colaborativo em tempo real para gestão de rotina hospitalar, enfermarias cirúrgicas, passagens de plantão e antibioticoterapia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        <RealtimeProvider>{children}</RealtimeProvider>
      </body>
    </html>
  );
}
