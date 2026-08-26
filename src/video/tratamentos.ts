import type { CSSProperties } from "react";

/**
 * TRATAMENTO DA LETRA — o que faltava para o texto do vídeo parar de parecer
 * simples perto do texto das artes.
 *
 * O diagnóstico do usuário foi que a tipografia da imagem é mais bonita porque
 * vem da IA. É verdade e é meia verdade: ela é mais bonita porque é TRATADA —
 * tem contorno, gradiente, sombra longa, brilho, extrusão. O texto do vídeo era
 * Anton branco chapado. A distância não era limite do código; era trabalho que
 * faltava.
 *
 * E tratado em código tem uma vantagem que o tratado por IA não tem: sai igual
 * toda vez, não erra uma letra, e não custa geração.
 *
 * COMO ISTO É FEITO
 *
 * Quase tudo cabe em duas propriedades. `text-shadow` aceita uma LISTA de
 * sombras, e é ela que produz extrusão e sombra longa — dezenas de cópias
 * deslocadas um pixel de cada vez. E `background-clip: text` com preenchimento
 * transparente faz a letra virar uma janela: por ela passa um degradê metálico
 * ou a própria arte do fundo.
 */

export type Tratamento = {
  rotulo: string;
  nota: string;
};

export const TRATAMENTOS: Record<string, Tratamento> = {
  limpo: { rotulo: "Limpo", nota: "Sem tratamento, só a cor" },
  sombra: { rotulo: "Sombra", nota: "Descolado do fundo, com sombra suave" },
  contorno: { rotulo: "Contorno", nota: "Traço escuro em volta da letra" },
  vazado: { rotulo: "Vazado", nota: "Só o contorno, miolo transparente" },
  bloco: { rotulo: "Bloco", nota: "Extrusão sólida, como letra de pedra" },
  longa: { rotulo: "Sombra longa", nota: "A diagonal que atravessa o quadro" },
  metal: { rotulo: "Metal", nota: "Degradê cromado com brilho no meio" },
  ouro: { rotulo: "Ouro", nota: "Degradê dourado, para gol e título" },
  recorte: { rotulo: "Recorte", nota: "A arte do fundo aparece dentro da letra" },
};

export type Chave = keyof typeof TRATAMENTOS;

/** Preto sobre claro, branco sobre escuro — a mesma conta do resto do projeto. */
function contrasteDe(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#0b0b0b";
  const n = parseInt(m[1], 16);
  const lum =
    (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.55 ? "#0b0b0b" : "#ffffff";
}

/** Uma lista de sombras deslocadas — é o que produz extrusão e sombra longa. */
function degraus(passos: number, dx: number, dy: number, cor: string) {
  return Array.from({ length: passos }, (_, i) => `${(i + 1) * dx}px ${(i + 1) * dy}px 0 ${cor}`).join(", ");
}

export function estiloDoTratamento(
  nome: string,
  {
    cor,
    corpo,
    imagem,
    destaque,
  }: {
    cor: string;
    corpo: number;
    /** A cor do clube. É ela que dá contraste à extrusão e à sombra longa. */
    destaque?: string;
    /** A placa de fundo, para o tratamento "recorte" enxergar por dentro da letra. */
    imagem?: string;
  },
): CSSProperties {
  const oposto = contrasteDe(cor);

  /**
   * A extrusão e a sombra longa usam a cor do CLUBE, e não um cinza escuro.
   *
   * Renderizadas com preto sobre a placa — que é escura quase sempre — as duas
   * simplesmente não apareciam: sombra preta em fundo preto existe no código e
   * não existe na tela. Foi o mesmo defeito da barra do confronto lá atrás.
   *
   * Com a cor do clube elas ganham contraste E viram identidade: branco com
   * sombra vermelha é Flamengo, branco com sombra dourada é Criciúma. Se a cor
   * do clube for escura demais para servir de sombra, cai no oposto do texto.
   */
  const sombraForte =
    destaque && contrasteDe(destaque) !== contrasteDe(cor) ? destaque : oposto;
  /* A espessura acompanha o corpo: traço fixo some num título de 130px e engole
     uma tarja de 24px. Tudo aqui é proporção, nunca pixel cravado. */
  const traco = Math.max(1.5, corpo * 0.022);

  switch (nome) {
    case "sombra":
      return {
        color: cor,
        textShadow: `0 ${corpo * 0.05}px ${corpo * 0.16}px rgba(0,0,0,.75)`,
      };

    case "contorno":
      return {
        color: cor,
        WebkitTextStroke: `${traco}px ${oposto}`,
        /* `paint-order` põe o traço ATRÁS do preenchimento. Sem isso o contorno
           come metade da espessura da letra por dentro, e uma condensada como a
           Anton fica visivelmente mais magra. */
        paintOrder: "stroke fill",
        textShadow: `0 ${corpo * 0.03}px ${corpo * 0.1}px rgba(0,0,0,.5)`,
      } as CSSProperties;

    case "vazado":
      return {
        color: "transparent",
        WebkitTextStroke: `${traco * 1.1}px ${cor}`,
      } as CSSProperties;

    case "bloco":
      return {
        color: cor,
        /* A extrusão vai para baixo e para a direita, e a sombra de contato
           fecha o pé — sem ela o bloco flutua em vez de assentar. */
        textShadow: `${degraus(Math.round(corpo * 0.06), 1, 1, sombraForte)}, 0 ${corpo * 0.09}px ${corpo * 0.14}px rgba(0,0,0,.6)`,
      };

    case "longa":
      return {
        color: cor,
        /* Muitos degraus e translúcida: a diagonal precisa atravessar o quadro
           sem virar uma mancha sólida atrás da palavra. */
        textShadow: degraus(Math.round(corpo * 0.55), 1, 1, sombraForte),
      };

    case "metal":
      return {
        /* O brilho é a parada clara no meio do degradê. Dois cinzas e um branco
           no centro bastam — mais paradas viram listra e a letra perde o metal. */
        backgroundImage:
          "linear-gradient(180deg, #f6f7f9 0%, #b9bec7 34%, #ffffff 50%, #8d939c 64%, #e7eaee 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextStroke: `${traco * 0.55}px rgba(0,0,0,.55)`,
        paintOrder: "stroke fill",
        filter: `drop-shadow(0 ${corpo * 0.04}px ${corpo * 0.1}px rgba(0,0,0,.6))`,
      } as CSSProperties;

    case "ouro":
      return {
        backgroundImage:
          "linear-gradient(180deg, #fff2c2 0%, #d9a227 32%, #fff7d6 50%, #a9761a 66%, #f3de8a 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextStroke: `${traco * 0.55}px rgba(60,40,0,.6)`,
        paintOrder: "stroke fill",
        filter: `drop-shadow(0 ${corpo * 0.04}px ${corpo * 0.1}px rgba(0,0,0,.6))`,
      } as CSSProperties;

    case "recorte":
      /* Sem imagem o recorte deixaria a letra invisível. Cai no vazado, que é o
         parente mais próximo — contorno sem miolo. */
      if (!imagem) {
        return {
          color: "transparent",
          WebkitTextStroke: `${traco * 1.1}px ${cor}`,
        } as CSSProperties;
      }
      return {
        backgroundImage: `url(${imagem})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        /* O contorno é obrigatório aqui: sem ele, onde a arte por dentro tiver a
           mesma cor do que está atrás, a letra some. */
        WebkitTextStroke: `${traco}px ${cor}`,
        paintOrder: "stroke fill",
      } as CSSProperties;

    default:
      return { color: cor };
  }
}
