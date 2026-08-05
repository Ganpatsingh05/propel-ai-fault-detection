import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/lib/providers";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Propel AI — Fault Detection System",
  description: "AI-powered electricity grid fault detection and localization dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="antialiased">
        <Providers>
          <Sidebar />
          <main className="ml-[220px] min-h-screen p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
