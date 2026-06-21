import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPSS Web — Analisis Statistik Online",
  description: "Analisis data penelitian seperti SPSS langsung di browser. Gratis, akurat, tanpa install.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"
          strategy="beforeInteractive"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
