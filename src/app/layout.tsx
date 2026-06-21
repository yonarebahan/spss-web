import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPSS Web — Analisis Statistik Online",
  description: "Analisis data penelitian seperti SPSS langsung di browser. Gratis, akurat, tanpa install.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
