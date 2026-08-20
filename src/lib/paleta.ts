import "server-only";
import sharp from "sharp";

/**
 * Le as cores do clube a partir do proprio escudo.
 *
 * O formulario pedia dois hex. Ninguem sabe de cabeca que o azul do Estoril e
 * #0B4F9E — e quem nao sabe deixa em branco, e a arte sai com cor generica. Mas
 * a informacao ja estava na mao: o escudo que o usuario acabou de enviar E a
 * definicao das cores do clube. Entao a resposta nao era um campo melhor, era
 * campo nenhum.
 */

/** Duas cores prontas para o prompt, no formato "#RRGGBB". */
export type Paleta = { primaria: string | null; secundaria: string | null };

/** Lado da miniatura usada na contagem. 64x64 ja separa as cores de um escudo. */
const LADO = 64;

/**
 * Faixa de cada balde na contagem.
 *
 * Um escudo tem gradiente, borda e antialias, entao contar cor exata daria
 * milhares de tons com um pixel cada. Agrupar de 24 em 24 junta o que o olho
 * ja le como "o mesmo azul", sem colar azul e roxo no mesmo balde.
 */
const BALDE = 24;

/** Quao longe dois tons precisam estar para valerem como duas cores. */
const DISTANCIA_MINIMA = 90;

function hex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Distancia ate o tom dos cantos para um pixel contar como fundo. */
const TOLERANCIA_FUNDO = 40;

/**
 * Ate onde o fundo pode ocupar a imagem antes de virar cor legitima.
 *
 * Escudo em PNG recortado passa longe disso. Um escudo que preenche a moldura
 * inteira com a propria cor passaria de 70% e fica: nesse caso os cantos SAO a
 * cor do clube, e descartar deixaria o clube sem paleta.
 */
const TETO_DO_FUNDO = 0.7;

/**
 * O tom dos quatro cantos, quando os quatro concordam.
 *
 * Escudo em JPEG vem numa caixa branca, e a caixa e maior que qualquer detalhe
 * do brasao. Sem esse descarte o teste do Estoril devolvia "azul e branco": o
 * branco do fundo passava na frente do amarelo da faixa, e a arte sairia com a
 * cor do papel no lugar da cor do clube.
 */
function tomDoFundo(data: Buffer, canais: number, largura: number, altura: number) {
  const emXY = (x: number, y: number) => {
    const i = (y * largura + x) * canais;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };

  const cantos = [
    emXY(0, 0),
    emXY(largura - 1, 0),
    emXY(0, altura - 1),
    emXY(largura - 1, altura - 1),
  ];

  if (cantos.some((c) => c.a < 128)) return null; // ja e transparente: nada a descartar

  const [primeiro] = cantos;
  const iguais = cantos.every(
    (c) =>
      Math.hypot(c.r - primeiro.r, c.g - primeiro.g, c.b - primeiro.b) <= TOLERANCIA_FUNDO,
  );

  return iguais ? primeiro : null;
}

export async function paletaDoEscudo(bytes: Buffer): Promise<Paleta> {
  const { data, info } = await sharp(bytes)
    .resize(LADO, LADO, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const fundo = tomDoFundo(data, info.channels, info.width, info.height);

  /** balde -> soma dos canais e contagem, para devolver a media real e nao o centro do balde */
  const baldes = new Map<number, { r: number; g: number; b: number; n: number }>();
  let opacos = 0;
  let doFundo = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];

    // fundo transparente de PNG nao e cor do clube
    if (a < 128) continue;
    opacos += 1;

    const ehFundo =
      fundo !== null &&
      Math.hypot(r - fundo.r, g - fundo.g, b - fundo.b) <= TOLERANCIA_FUNDO;
    if (ehFundo) {
      doFundo += 1;
      continue;
    }

    const chave =
      Math.floor(r / BALDE) * 10000 + Math.floor(g / BALDE) * 100 + Math.floor(b / BALDE);
    const atual = baldes.get(chave) ?? { r: 0, g: 0, b: 0, n: 0 };
    atual.r += r;
    atual.g += g;
    atual.b += b;
    atual.n += 1;
    baldes.set(chave, atual);
  }

  /* fundo grande demais para ser fundo: era a cor do clube. Conta tudo de novo. */
  if (fundo && doFundo / opacos > TETO_DO_FUNDO) {
    const chave =
      Math.floor(fundo.r / BALDE) * 10000 +
      Math.floor(fundo.g / BALDE) * 100 +
      Math.floor(fundo.b / BALDE);
    baldes.set(chave, {
      r: fundo.r * doFundo,
      g: fundo.g * doFundo,
      b: fundo.b * doFundo,
      n: doFundo,
    });
  }

  const ordenados = [...baldes.values()]
    .sort((a, b) => b.n - a.n)
    .map((c) => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n }));

  if (ordenados.length === 0) return { primaria: null, secundaria: null };

  const [primeira] = ordenados;

  /**
   * A segunda cor tem que ser outra cor, nao um vizinho da primeira. Sem esse
   * corte, "azul e azul" era o resultado mais comum: os dois baldes mais cheios
   * de um escudo costumam ser o mesmo tom com e sem sombra.
   */
  const segunda = ordenados.slice(1).find((c) => {
    const d = Math.hypot(c.r - primeira.r, c.g - primeira.g, c.b - primeira.b);
    return d >= DISTANCIA_MINIMA;
  });

  return {
    primaria: hex(primeira.r, primeira.g, primeira.b),
    secundaria: segunda ? hex(segunda.r, segunda.g, segunda.b) : null,
  };
}
