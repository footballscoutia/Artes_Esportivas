import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { FORMATO_META, type Formato, type PosicaoLogo } from "./types";

/**
 * Acabamento sobre o que a IA devolveu.
 *
 *   arte gerada (ja com o texto)  ->  recorte do jogador  ->  logo do cliente
 *
 * O texto NAO passa mais por aqui. O nome, o rotulo e a frase sao pedidos ao
 * modelo dentro do prompt-mae — texto desenhado por cima ficava chapado, sem a
 * perspectiva e a luz da arte.
 *
 * A logo continua sendo camada de codigo, e por um motivo diferente do texto:
 * um nome errado se corrige, mas a marca do cliente tem forma exata e o modelo
 * nao a conhece. Mesmo com referencia ele aproxima, e escudo torto publicado no
 * perfil do cliente e um erro de outra categoria.
 */

export type ComposeInput = {
  /** Imagem que voltou do modelo. Vem maior que o formato final. */
  fundo: Buffer;
  /** Recorte do atleta com alpha, quando existir. Sem ele, o atleta ja veio na arte. */
  recorte?: Buffer | null;
  formato: Formato;
  /**
   * Bytes da logo escolhida. Nulo/ausente = nenhuma logo — a escolha e de
   * cada geracao, nao mais um arquivo fixo do codigo (era `public/brand/logo.png`
   * sempre, sem opcao).
   */
  logo?: Buffer | null;
  /**
   * Onde a logo entra. Fixo era so "inferior-direito", e nem sempre sobra
   * espaco ali: a composicao muda a cada geracao, e o canto livre so se sabe
   * depois de ver a arte pronta.
   */
  posicaoLogo?: PosicaoLogo;
};

const MARGEM = 0.07;

function posicaoDaLogo(posicao: PosicaoLogo, w: number, h: number, larguraLogo: number, alturaLogo: number) {
  const margemX = Math.round(w * MARGEM);
  const margemYBase = Math.round(w * 0.075);
  const esquerda = posicao.endsWith("esquerdo");
  const emCima = posicao.startsWith("superior");
  return {
    left: esquerda ? margemX : w - larguraLogo - margemX,
    top: emCima ? margemYBase : h - alturaLogo - margemYBase,
  };
}

export async function compor({
  fundo,
  recorte,
  formato,
  logo,
  posicaoLogo = "inferior-direito",
}: ComposeInput): Promise<Buffer> {
  const { w, h } = FORMATO_META[formato];

  // corta para o formato final ancorando no topo, para nao decepar cabeca
  const base = sharp(fundo).resize(w, h, { fit: "cover", position: "top" });

  const camadas: OverlayOptions[] = [];

  if (recorte) {
    const alturaRecorte = Math.round(h * 0.82);
    const png = await sharp(recorte).resize({ height: alturaRecorte, fit: "inside" }).png().toBuffer();
    const meta = await sharp(png).metadata();
    camadas.push({
      input: png,
      top: h - alturaRecorte - Math.round(h * 0.02),
      left: Math.round((w - (meta.width ?? w)) / 2),
    });
  }

  if (logo) {
    const larguraLogo = Math.round(w * 0.3);
    const marca = await sharp(logo).resize({ width: larguraLogo }).png().toBuffer();
    const metaMarca = await sharp(marca).metadata();
    camadas.push({
      input: marca,
      ...posicaoDaLogo(posicaoLogo, w, h, larguraLogo, metaMarca.height ?? 0),
    });
  }

  return base.composite(camadas).png({ compressionLevel: 8 }).toBuffer();
}
