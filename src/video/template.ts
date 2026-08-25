/**
 * O TEMPLATE, portado do `scripts/video.mjs` para o motor novo.
 *
 * O ponto desta migracao e que este arquivo quase nao mudou. A coreografia
 * virou dado antes de o motor ser escolhido, de proposito: o que se joga fora
 * ao trocar de motor e o codigo de DESENHO, nunca a descricao. Quem fez a
 * etapa 1 primeiro paga a migracao uma vez; quem tivesse deixado os tempos
 * cravados dentro do desenho pagaria duas.
 *
 * Aqui isto tambem passa a ser o formato do DOCUMENTO que o editor manipula: as
 * mesmas propriedades que o Remotion Player le ao vivo no navegador sao as que
 * o servidor le para renderizar o mp4. Uma descricao, dois consumidores.
 */

import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export type Estilo = "etiqueta" | "titulo" | "subtitulo" | "dados";

export const ESTILOS: Record<Estilo, { fonte: string; corpo: number; tracking: number }> = {
  etiqueta: { fonte: '"Arial Black", Arial, sans-serif', corpo: 30, tracking: 10 },
  /* 360 e nao 300: a "VASCO" de 300px terminava DENTRO do atleta de bracos
     abertos, e o nome sumia por completo. A regra do genero e que a tipografia
     atravesse o corpo e sobre dos dois lados — se ela acaba dentro dele, nao e
     o atleta que esta grande, e o nome que esta estreito. */
  titulo: { fonte: "Impact, 'Arial Black', sans-serif", corpo: 360, tracking: -6 },
  subtitulo: { fonte: "Impact, 'Arial Black', sans-serif", corpo: 104, tracking: 0 },
  dados: { fonte: '"Arial Black", Arial, sans-serif', corpo: 30, tracking: 3 },
};

export type Animacao = "surge" | "desliza-esquerda" | "sobe" | "varre" | "cresce";

/** Onde o elemento vive na pilha. E o que a imagem chapada nao permitia. */
export type Camada = "atras" | "frente";

export type Elemento = {
  id: string;
  campo?: string;
  campos?: string[];
  juntar?: string;
  prefixo?: string;
  estilo: Estilo;
  camada: Camada;
  /** Fracao da altura do quadro, 0..1. Relativa para sobreviver a outro formato. */
  y: number;
  x?: number;
  em: number;
  dura: number;
  como: Animacao;
  fundo?: "escuro" | "clube";
};

export type Cena = {
  ate: number;
  /** Recorte nomeado da mesma placa: e o que da a transicao algo para ligar. */
  enquadramento: "cheio" | "detalhe" | "baixo";
  camera: "push-in" | "push-out" | "estatico";
};

export type Template = {
  id: string;
  nome: string;
  descricao: string;
  cenas: Cena[];
  transicoes: Array<"corte" | "flash" | "whip" | "punch">;
  reentrada?: { saiEm: number; voltaEm: number; dura: number };
  elementos: Elemento[];
};

export const ENQUADRAMENTOS = {
  cheio: { escala: 1.0, cx: 0.5, cy: 0.5 },
  detalhe: { escala: 1.3, cx: 0.5, cy: 0.32 },
  baixo: { escala: 1.18, cx: 0.5, cy: 0.7 },
} as const;

export const TEMPLATES: Record<string, Template> = {
  atravessa: {
    id: "atravessa",
    nome: "Nome atravessa",
    descricao: "O nome do clube passa por tras do atleta, largo o bastante para sobrar dos dois lados.",
    cenas: [
      { ate: 4.2, enquadramento: "cheio", camera: "push-in" },
      { ate: 8.0, enquadramento: "detalhe", camera: "push-in" },
    ],
    transicoes: ["whip"],
    reentrada: { saiEm: 3.9, voltaEm: 4.45, dura: 0.4 },
    elementos: [
      { id: "campeonato", campo: "campeonato", estilo: "etiqueta", camada: "frente", y: 0.09, em: 2.6, dura: 0.5, como: "surge" },
      { id: "confronto", campo: "adversario", prefixo: "X ", estilo: "subtitulo", camada: "atras", y: 0.14, em: 0.9, dura: 0.7, como: "desliza-esquerda" },
      /* O titulo mora ATRAS: e a razao de existir das camadas. A oclusao virou
         ordem de pilha, e nao um pedido ao modelo que custou tres artes. */
      { id: "clube", campo: "clube", estilo: "titulo", camada: "atras", y: 0.24, x: -0.045, em: 0.5, dura: 0.8, como: "desliza-esquerda" },
      { id: "dados", campos: ["data", "hora", "estadio"], juntar: "   ·   ", estilo: "dados", camada: "frente", y: 0.81, em: 1.9, dura: 0.6, como: "varre", fundo: "escuro" },
    ],
  },

  "sobe-limpo": {
    id: "sobe-limpo",
    nome: "Sobe limpo",
    descricao: "Tudo na frente, subindo do rodape, com punch no meio. Para arte que fala sozinha.",
    cenas: [
      { ate: 3.4, enquadramento: "cheio", camera: "push-out" },
      { ate: 8.0, enquadramento: "baixo", camera: "push-in" },
    ],
    transicoes: ["punch"],
    reentrada: { saiEm: 3.1, voltaEm: 3.6, dura: 0.4 },
    elementos: [
      { id: "clube", campo: "clube", estilo: "titulo", camada: "frente", y: 0.55, x: -0.01, em: 0.4, dura: 0.9, como: "sobe" },
      { id: "confronto", campo: "adversario", prefixo: "X ", estilo: "subtitulo", camada: "frente", y: 0.72, em: 0.9, dura: 0.8, como: "sobe" },
      { id: "dados", campos: ["data", "hora", "estadio"], juntar: "   ·   ", estilo: "dados", camada: "frente", y: 0.85, em: 1.5, dura: 0.7, como: "varre", fundo: "escuro" },
      { id: "campeonato", campo: "campeonato", estilo: "etiqueta", camada: "frente", y: 0.09, em: 2.1, dura: 0.6, como: "surge" },
    ],
  },
};

/* =========================================================================
   O ESQUEMA — e daqui que sai o formulario do editor.

   Nao e so validacao. O Remotion le este esquema e MONTA a interface de
   controle sozinho: enum vira seletor, numero com min/max vira campo com
   limite, cor vira seletor de cor. E o editor que voce pediu, na sua forma
   mais crua, sem uma linha de tela escrita.

   Por isso os tipos sao INFERIDOS do esquema em vez de declarados ao lado
   dele: um tipo e um formulario que podem discordar viram, mais cedo ou mais
   tarde, um controle que grava um valor que o codigo nao aceita.
   ========================================================================= */

export const EsquemaDados = z.object({
  clube: z.string(),
  adversario: z.string(),
  data: z.string(),
  hora: z.string(),
  estadio: z.string(),
  campeonato: z.string(),
});

export const EsquemaCamadas = z.object({
  fundo: z.string(),
  atleta: z.string(),
  logo: z.string().optional(),
});

export const EsquemaOpcoes = z.object({
  template: z.enum(["atravessa", "sobe-limpo"]),
  /* Os limites nao sao enfeite: sao o que impede o editor de produzir um video
     de 0,2s ou um texto de 40x que estoura o quadro. */
  duracao: z.number().min(4).max(20),
  escalaTexto: z.number().min(0.6).max(2),
  velocidade: z.number().min(0.5).max(2),
  intensidade: z.number().min(0).max(2),
  corTexto: zColor(),
  corBarra: zColor(),
});

export const EsquemaMatchday = z.object({
  dados: EsquemaDados,
  camadas: EsquemaCamadas,
  opcoes: EsquemaOpcoes,
});

export type Dados = z.infer<typeof EsquemaDados>;
export type Camadas = z.infer<typeof EsquemaCamadas>;
export type Opcoes = z.infer<typeof EsquemaOpcoes>;

export const OPCOES_PADRAO: Opcoes = {
  template: "atravessa",
  duracao: 8,
  escalaTexto: 1,
  velocidade: 1,
  intensidade: 1,
  corTexto: "#ffffff",
  corBarra: "#0b0b0b",
};

export function textoDo(el: Elemento, d: Dados): string {
  if (el.campos) {
    const partes = el.campos.map((c) => d[c as keyof Dados]).filter(Boolean);
    return partes.length ? partes.join(el.juntar ?? " ").toUpperCase() : "";
  }
  const bruto = el.campo ? d[el.campo as keyof Dados] : "";
  if (!bruto) return "";
  return `${el.prefixo ?? ""}${bruto}`.toUpperCase();
}
