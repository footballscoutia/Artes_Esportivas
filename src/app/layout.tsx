import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Display só para título.
 *
 * As 78 referências do acervo são todas tipografia pesada e condensada, e a
 * marca da agência é um itálico squarish. Anton fala essa língua.
 *
 * Fica em h1 e nada mais: numa ferramenta de trabalho, display em rótulo, botão
 * ou dado atrapalha a leitura. Em título não atrapalha nada.
 */
const anton = Anton({ variable: "--fonte-anton", subsets: ["latin"], weight: "400" });

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

/*
 * As classes de fonte vão no <html>, não no <body>.
 *
 * O next/font declara as variáveis no elemento que recebe a classe, e os tokens
 * do tema vivem no :root. Um var() aninhado se resolve onde a variável é
 * DECLARADA, não onde é usada: com as fontes no body, o :root não as enxergava,
 * --font-sans virava inválido e a declaração inteira caía fora.
 *
 * O app rodou na fonte do sistema desde o primeiro dia por causa disso.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DA_PINTURA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
