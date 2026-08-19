import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Estúdio de Artes — Marcio Bittencourt Sports",
  description: "Geração das artes promocionais dos atletas no padrão visual da agência.",
};

/**
 * Aplica o tema gravado antes da primeira pintura.
 *
 * Roda inline, de propósito: qualquer coisa que espere o React já chega tarde,
 * e a tela pisca no tema errado a cada carregamento. Escuro é o padrão, então
 * só o claro precisa marcar o atributo.
 */
const TEMA_ANTES_DA_PINTURA = `
try {
  if (localStorage.getItem("estudio:tema") === "claro") {
    document.documentElement.dataset.tema = "claro";
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DA_PINTURA }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
