import type { Metadata } from "next";
import { Chakra_Petch, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Display só para título.
 *
 * Era Anton, escolhido quando o produto ainda era um estúdio de cartazes. O
 * mundo visual mudou — fundo em shader, borda que corre luz, título que ondula
 * — e o Anton ficou falando outra língua: ele é cartaz esportivo IMPRESSO, e
 * isso já não é o que a tela mostra. Some a isso que é a face que quase todo
 * material de futebol usa, então não distinguia nada.
 *
 * Chakra Petch tem cantos cortados e hastes retas: vocabulário de esporte
 * técnico, que é onde o produto foi parar. E, ao contrário do Anton, tem mais
 * de um peso — o 700 aqui é escolha, não a única opção disponível.
 *
 * Fica em h1 e nada mais: numa ferramenta de trabalho, display em rótulo,
 * botão ou dado atrapalha a leitura. Em título não atrapalha nada.
 */
const display = Chakra_Petch({
  variable: "--fonte-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "MatchPost",
  description: "Artes promocionais de atletas, geradas no padrão visual de cada agência.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DA_PINTURA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
