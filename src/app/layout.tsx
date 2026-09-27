import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { ThemeSync } from "@/components/providers/ThemeSync";

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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CheckList" />
        <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('checklist_theme_mode') || 'auto';
                  var mode = raw.replace(/['"]/g, '').trim();
                  var isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                  var meta = document.querySelector('meta[name="theme-color"]');
                  if (meta) meta.setAttribute('content', isDark ? '#0b1120' : '#0f172a');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-150">
        <ThemeSync />
        <RealtimeProvider>{children}</RealtimeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
