import sharp from "sharp";
import { LOGO_COR_HEX } from "./types";

/**
 * Repinta a logo mantendo a forma.
 *
 * A forma vem do CANAL ALFA do arquivo, e só o RGB é substituído. É por isso
 * que um PNG com recorte limpo continua com o mesmo recorte, e é por isso que
 * logo com fundo branco chapado não ganha nada: para o alfa, o retângulo branco
 * também é desenho.
 *
 * Feito por composição de canais e não por varredura de pixels em JS: para uma
 * logo de 1024px isso são milhões de iterações por geração, e o sharp faz o
 * mesmo em C com uma chamada.
 */

/** "#RRGGBB" -> {r,g,b}. Devolve nulo no que não for hex, para o chamador decidir. */
function hexParaRgb(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(t)) return null;
  return {
    r: parseInt(t.slice(0, 2), 16),
    g: parseInt(t.slice(2, 4), 16),
    b: parseInt(t.slice(4, 6), 16),
  };
}

export async function pintarLogo(logo: Buffer, hex: string): Promise<Buffer<ArrayBuffer>> {
  const cor = hexParaRgb(hex);
  /* Hex inválido devolve a logo intacta. A alternativa seria estourar e deixar
     a pessoa sem arte por causa de um campo de cor — a logo original nunca é
     pior que erro. */
  if (!cor) return logo as Buffer<ArrayBuffer>;

  const { width, height } = await sharp(logo).metadata();
  if (!width || !height) return logo as Buffer<ArrayBuffer>;

  /**
   * Mascara por composicao (`dest-in`): um retangulo da cor pedida, recortado
   * pelo alfa da logo. O resultado guarda o alfa da origem, inclusive o
   * antialiasing das bordas.
   *
   * A primeira versao montava o resultado com `joinChannel`, juntando o alfa
   * como quarto canal. O sharp aceita sem reclamar, mas nao MARCA esse canal
   * como alfa — ele vira uma quarta banda qualquer, e o PNG sai opaco. Ou seja,
   * a logo virava um retangulo chapado da cor escolhida, colado por cima da
   * arte. Falha silenciosa: nenhum erro, nenhum aviso, so a arte destruida.
   * Um teste com a logo real mediu o alfa antes e depois — 66,6 virou 255,0 —
   * e foi o que denunciou.
   */
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: cor.r, g: cor.g, b: cor.b, alpha: 1 },
    },
  })
    .composite([{ input: await sharp(logo).ensureAlpha().png().toBuffer(), blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * Claro ou escuro, decidido pelo pedaço da arte onde a logo vai cair.
 *
 * Mede a luminância média daquele retângulo e devolve a cor que contrasta. Usa
 * a fórmula perceptual (0.2126 R, 0.7152 G, 0.0722 B) e não a média simples:
 * o olho enxerga verde muito mais que azul, e a média simples chamaria de
 * "claro" um azul saturado sobre o qual branco ainda é legível.
 *
 * O corte é 0.5 na luminância normalizada — o meio do caminho. Um limiar mais
 * esperto exigiria saber a cor da logo, e a logo vai ser repintada de qualquer
 * jeito, então não há o que preservar.
 */
export async function corQueContrasta(
  arte: Buffer,
  regiao: { left: number; top: number; width: number; height: number },
): Promise<string> {
  try {
    const { width, height } = await sharp(arte).metadata();
    if (!width || !height) return LOGO_COR_HEX.branca;

    /* A região pode encostar na borda depois das margens; sem este aperto o
       sharp recusa o extract e a arte inteira falharia por causa de uma cor. */
    const left = Math.max(0, Math.min(regiao.left, width - 1));
    const top = Math.max(0, Math.min(regiao.top, height - 1));
    const largura = Math.max(1, Math.min(regiao.width, width - left));
    const altura = Math.max(1, Math.min(regiao.height, height - top));

    const { channels } = await sharp(arte)
      .extract({ left, top, width: largura, height: altura })
      .stats();

    const [r, g, b] = channels;
    const luz = (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255;
    return luz > 0.5 ? LOGO_COR_HEX.preta : LOGO_COR_HEX.branca;
  } catch {
    /* Fundo escuro é o caso comum nestas artes: branco erra menos. */
    return LOGO_COR_HEX.branca;
  }
}
