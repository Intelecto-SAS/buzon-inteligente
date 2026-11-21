import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "Buzón Inteligente",
  description: "Gestión institucional de comunicaciones electrónicas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
