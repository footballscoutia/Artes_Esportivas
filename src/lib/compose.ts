import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { corQueContrasta, pintarLogo } from "./logo-cor";
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
  /**
   * Cor pedida para a logo: "auto", um hex, ou nada para deixar como veio.
   *
   * Existe porque o arquivo da logo foi feito para um fundo que nao e o desta
   * arte: logo escura sobre arte escura some, e a assinatura da agencia e
   * justamente o elemento que nao pode sumir.
   */
  logoCor?: string | null;
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
  logoCor = null,
}: ComposeInput): Promise<Buffer> {
  const { w, h } = FORMATO_META[formato];

  /**
   * O corte vira BUFFER aqui, e nao segue como pipeline ate o fim.
   *
   * A cor automatica precisa medir a luminancia do pedaco da arte onde a logo
   * vai cair, e nao da para medir o que ainda nao foi renderizado. O preco e
   * uma codificacao a mais; a alternativa seria adivinhar a cor sem olhar a
   * imagem, que e exatamente o problema que esta opcao existe para resolver.
   */
  const base = await sharp(fundo)
    .resize(w, h, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

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
    let marca = await sharp(logo).resize({ width: larguraLogo }).png().toBuffer();
    const metaMarca = await sharp(marca).metadata();
    const onde = posicaoDaLogo(posicaoLogo, w, h, larguraLogo, metaMarca.height ?? 0);

    if (logoCor && logoCor !== "original") {
      /* "auto" so se resolve aqui, com a arte pronta e o lugar ja conhecido —
         antes disso nao ha o que medir. */
      const cor =
        logoCor === "auto"
          ? await corQueContrasta(base, {
              left: onde.left,
              top: onde.top,
              width: larguraLogo,
              height: metaMarca.height ?? 0,
            })
          : logoCor;
      marca = await pintarLogo(marca, cor);
    }

    camadas.push({ input: marca, ...onde });
  }

  /**
   * A arte final sai em JPEG, nao em PNG.
   *
   * PNG e sem perdas e otimo para grafico de cor chapada; para imagem
   * FOTOGRAFICA ele so guarda o mesmo pixel ocupando o triplo. Medido nas
   * geracoes reais: o que o modelo devolve tem ~630KB em JPEG e a arte final
   * saia com ~2MB depois do nosso PNG. Nao havia ganho de qualidade nenhum —
   * so espera na hora de carregar a previa e storage a mais.
   *
   * Qualidade 92 com `mozjpeg`: acima disso o arquivo cresce sem diferenca
   * visivel, e e onde o texto desenhado pelo modelo ainda fica com a borda
   * limpa. Nao ha alfa a preservar — o fundo cobre a tela inteira.
   */
  return sharp(base)
    .composite(camadas)
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
