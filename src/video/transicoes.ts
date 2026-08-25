/**
 * O catálogo de transições — famílias e variações.
 *
 * POR QUE FAMÍLIAS, E NÃO UMA LISTA
 *
 * Trinta transições numa grade só voltariam a produzir a página de três telas
 * que acabamos de desfazer. E o problema não é só de espaço: "Estouro branco",
 * "Estouro preto" e "Estouro duplo" numa lista plana competem entre si como se
 * fossem escolhas independentes, quando na verdade são o mesmo gesto em três
 * doses. Escolher a família e depois a dose é uma pergunta de cada vez.
 *
 * O identificador é `familia:variante`. Uma string só atravessa o esquema, o
 * banco e as props sem exigir um objeto aninhado em cada lugar.
 *
 * O CÁLCULO MORA AQUI, e é importado pela composição e pela prévia do seletor.
 * Duas cópias divergiriam no dia em que alguém afinasse uma delas, e prévia que
 * mente é pior que prévia nenhuma — a escolha é feita em cima dela.
 */

export type Deformacao = {
  x: number;
  y: number;
  escala: number;
  escalaY: number;
  rot: number;
  borrao: number;
  clarao: number;
  escurece: number;
  /** Deslocamento dos canais de cor, em pixels. É o que produz o glitch. */
  rgb: number;
  /** Quantas fatias horizontais deslocadas. Zero = imagem inteira. */
  fatias: number;
  /** Cor do véu, quando não é branco nem preto. */
  veuCor?: string;
};

const ZERO: Deformacao = {
  x: 0,
  y: 0,
  escala: 0,
  escalaY: 0,
  rot: 0,
  borrao: 0,
  clarao: 0,
  escurece: 0,
  rgb: 0,
  fatias: 0,
};

export type Variante = { id: string; rotulo: string };
export type Familia = { rotulo: string; nota: string; variantes: Variante[] };

export const FAMILIAS: Record<string, Familia> = {
  corte: {
    rotulo: "Corte",
    nota: "Sem efeito",
    variantes: [{ id: "seco", rotulo: "Seco" }],
  },
  estouro: {
    rotulo: "Estouro",
    nota: "Clarão no instante do corte",
    variantes: [
      { id: "branco", rotulo: "Branco" },
      { id: "preto", rotulo: "Preto" },
      { id: "cor", rotulo: "Na cor do clube" },
      { id: "duplo", rotulo: "Duplo" },
      { id: "suave", rotulo: "Suave" },
    ],
  },
  whip: {
    rotulo: "Whip",
    nota: "Arrasto borrado, como virar a câmera",
    variantes: [
      { id: "esquerda", rotulo: "Para a esquerda" },
      { id: "direita", rotulo: "Para a direita" },
      { id: "cima", rotulo: "Para cima" },
      { id: "forte", rotulo: "Mais forte" },
    ],
  },
  zoom: {
    rotulo: "Zoom",
    nota: "Avanço ou recuo rápido",
    variantes: [
      { id: "entra", rotulo: "Entra" },
      { id: "sai", rotulo: "Sai" },
      { id: "socado", rotulo: "Socado" },
      { id: "borrado", rotulo: "Borrado" },
    ],
  },
  glitch: {
    rotulo: "Glitch",
    nota: "Falha de sinal",
    variantes: [
      { id: "rgb", rotulo: "Cores separadas" },
      { id: "fatias", rotulo: "Fatias deslocadas" },
      { id: "completo", rotulo: "Completo" },
    ],
  },
  deslize: {
    rotulo: "Deslize",
    nota: "O quadro escorrega",
    variantes: [
      { id: "esquerda", rotulo: "Esquerda" },
      { id: "direita", rotulo: "Direita" },
      { id: "cima", rotulo: "Cima" },
      { id: "baixo", rotulo: "Baixo" },
    ],
  },
  giro: {
    rotulo: "Giro",
    nota: "Inclina e desinclina",
    variantes: [
      { id: "leve", rotulo: "Leve" },
      { id: "forte", rotulo: "Forte" },
      { id: "inverso", rotulo: "Ao contrário" },
    ],
  },
  tremor: {
    rotulo: "Tremor",
    nota: "Sacode no impacto",
    variantes: [
      { id: "curto", rotulo: "Curto" },
      { id: "vertical", rotulo: "Vertical" },
      { id: "caotico", rotulo: "Caótico" },
    ],
  },
  estica: {
    rotulo: "Estica",
    nota: "Alonga como fita passando",
    variantes: [
      { id: "horizontal", rotulo: "Horizontal" },
      { id: "vertical", rotulo: "Vertical" },
    ],
  },
  cortina: {
    rotulo: "Cortina",
    nota: "O quadro fecha e reabre",
    variantes: [
      { id: "fecha", rotulo: "Escurece" },
      { id: "clareia", rotulo: "Clareia" },
    ],
  },
};

/** Todos os ids possíveis, para o esquema validar sem enumerar à mão. */
export const IDS_DE_TRANSICAO = Object.entries(FAMILIAS).flatMap(([f, meta]) =>
  meta.variantes.map((v) => `${f}:${v.id}`),
);

export const TRANSICAO_PADRAO = "whip:esquerda";

export function rotuloDaTransicao(id: string) {
  const [f, v] = id.split(":");
  const familia = FAMILIAS[f];
  const variante = familia?.variantes.find((x) => x.id === v);
  if (!familia) return id;
  return variante ? `${familia.rotulo} · ${variante.rotulo}` : familia.rotulo;
}

/**
 * A deformação de uma transição num instante.
 *
 * `u` atravessa a janela do corte de 0 a 1, com 0.5 no corte exato. `fase` só
 * serve aos tremores, que precisam de um valor que ande sozinho.
 *
 * A direção inverte em 0.5 porque antes do corte o quadro SAI e depois ele
 * ENTRA. Sem a inversão a imagem iria e voltaria pelo mesmo lado, que lê como
 * solavanco em vez de corte.
 */
export function deformacaoDaTransicao(
  id: string,
  u: number,
  intensidade: number,
  fase: number,
): Deformacao {
  const pico = Math.max(0, 1 - Math.abs(u - 0.5) * 2) * intensidade;
  if (pico <= 0) return ZERO;

  const lado = u < 0.5 ? -1 : 1;
  const [familia, variante] = id.split(":");

  switch (familia) {
    case "estouro":
      if (variante === "preto") return { ...ZERO, escurece: pico };
      if (variante === "cor") return { ...ZERO, clarao: pico, veuCor: "clube" };
      if (variante === "suave") return { ...ZERO, clarao: pico * 0.45 };
      /* O duplo pisca duas vezes dentro da mesma janela: o `sin` de dois ciclos
         produz o segundo pulso sem precisar de um segundo corte. */
      if (variante === "duplo") return { ...ZERO, clarao: pico * Math.abs(Math.sin(u * Math.PI * 2)) };
      return { ...ZERO, clarao: pico };

    case "whip": {
      const forca = variante === "forte" ? 320 : 200;
      if (variante === "cima") return { ...ZERO, y: lado * forca, borrao: 18 * pico };
      const dir = variante === "direita" ? -lado : lado;
      return { ...ZERO, x: dir * forca * pico, borrao: (variante === "forte" ? 24 : 16) * pico };
    }

    case "zoom":
      if (variante === "sai") return { ...ZERO, escala: -0.2 * pico, escalaY: -0.2 * pico };
      if (variante === "socado")
        return { ...ZERO, escala: 0.42 * pico, escalaY: 0.42 * pico, borrao: 4 * pico };
      if (variante === "borrado")
        return { ...ZERO, escala: 0.22 * pico, escalaY: 0.22 * pico, borrao: 18 * pico };
      return { ...ZERO, escala: 0.26 * pico, escalaY: 0.26 * pico, borrao: 8 * pico };

    case "glitch":
      if (variante === "fatias") return { ...ZERO, fatias: 7, x: lado * 30 * pico };
      if (variante === "completo")
        return { ...ZERO, rgb: 14 * pico, fatias: 9, x: lado * 24 * pico, clarao: pico * 0.16 };
      return { ...ZERO, rgb: 18 * pico };

    case "deslize": {
      const d = 340 * pico;
      if (variante === "direita") return { ...ZERO, x: -lado * d };
      if (variante === "cima") return { ...ZERO, y: lado * d };
      if (variante === "baixo") return { ...ZERO, y: -lado * d };
      return { ...ZERO, x: lado * d };
    }

    case "giro": {
      const g = variante === "forte" ? 9 : variante === "inverso" ? -5 : 4;
      return { ...ZERO, rot: lado * g * pico, escala: 0.1 * pico, escalaY: 0.1 * pico };
    }

    case "tremor":
      if (variante === "vertical") return { ...ZERO, y: Math.sin(fase * 2.6) * 30 * pico };
      if (variante === "caotico")
        return {
          ...ZERO,
          x: Math.sin(fase * 3.1) * 34 * pico,
          y: Math.cos(fase * 4.3) * 26 * pico,
          rot: Math.sin(fase * 2.2) * 2 * pico,
        };
      return { ...ZERO, x: Math.sin(fase * 1.9) * 24 * pico, y: Math.cos(fase * 2.3) * 16 * pico };

    case "estica":
      if (variante === "vertical") return { ...ZERO, escalaY: 0.5 * pico, borrao: 6 * pico };
      return { ...ZERO, escala: 0.5 * pico, borrao: 7 * pico };

    case "cortina":
      return variante === "clareia" ? { ...ZERO, clarao: pico * 0.95 } : { ...ZERO, escurece: pico * 0.95 };

    default:
      return ZERO;
  }
}

/** A deformação vira CSS, do mesmo jeito na composição e na prévia. */
export function estiloDaDeformacao(d: Deformacao) {
  return {
    transform: [
      `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px)`,
      `scale(${(1 + d.escala).toFixed(3)}, ${(1 + d.escalaY).toFixed(3)})`,
      d.rot ? `rotate(${d.rot.toFixed(2)}deg)` : "",
    ]
      .filter(Boolean)
      .join(" "),
    filter: d.borrao > 0.4 ? `blur(${d.borrao.toFixed(1)}px)` : undefined,
  };
}

/** Quanto dura a janela do corte, em segundos da linha do tempo de referência. */
export const JANELA_BASE = 0.32;
export const duracaoDaTransicao = (velocidade: number) => JANELA_BASE / velocidade;
