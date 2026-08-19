import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import path from "node:path";
import { readFileSync } from "node:fs";
import { parse as parseFonte, type Font } from "opentype.js";
import { FORMATO_META, type Formato } from "./types";

/**
 * Composicao das camadas por cima do que a IA gerou.
 *
 *   fundo gerado  ->  nome do jogador  ->  recorte do jogador  ->  logo da agencia
 *
 * Logo e nome sao camadas de codigo, nunca geracao: a IA distorce marca e erra
 * letra de nome, e o custo de uma arte com o escudo torto no Instagram da agencia
 * e alto. Como camada, sai identico sempre e da para corrigir um nome errado sem
 * gastar outra geracao.
 */

export type ComposeInput = {
  /** Imagem que voltou do modelo. Vem maior que o formato final. */
  fundo: Buffer;
  /** Recorte do atleta com alpha, quando existir. Sem ele, assume-se que o atleta ja esta no fundo. */
  recorte?: Buffer | null;
  nome: string;
  clube?: string | null;
  frase?: string | null;
  /** Etiqueta curta acima do nome — "BEM-VINDO", "GOLAÇO", etc. */
  rotulo: string;
  formato: Formato;
  /** Caminho do arquivo de logo dentro de public/. */
  logo?: string;
};

export async function compor({
  fundo,
  recorte,
  nome,
  clube,
  frase,
  rotulo,
  formato,
  logo = "brand/logo.png",
}: ComposeInput): Promise<Buffer> {
  const { w, h } = FORMATO_META[formato];

  // 1. fundo — corta para o formato final ancorando no topo, para nao decepar cabeca
  const base = sharp(fundo).resize(w, h, { fit: "cover", position: "top" });

  const camadas: OverlayOptions[] = [];

  // 2. faixa + nome do jogador
  camadas.push({ input: Buffer.from(svgTexto({ w, h, nome, clube, frase, rotulo })), top: 0, left: 0 });

  // 3. recorte do atleta, quando houver
  if (recorte) {
    const alturaRecorte = Math.round(h * 0.82);
    const png = await sharp(recorte)
      .resize({ height: alturaRecorte, fit: "inside" })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    camadas.push({
      input: png,
      top: h - alturaRecorte - Math.round(h * 0.02),
      left: Math.round((w - (meta.width ?? w)) / 2),
    });
  }

  // 4. logo da agencia, sempre por ultimo e sempre na faixa criada pelo codigo
  const larguraLogo = Math.round(w * 0.3);
  const marca = await sharp(path.join(process.cwd(), "public", logo))
    .resize({ width: larguraLogo })
    .png()
    .toBuffer();
  const metaMarca = await sharp(marca).metadata();
  camadas.push({
    input: marca,
    top: Math.round(h - w * 0.075 - (metaMarca.height ?? 0)),
    left: w - larguraLogo - Math.round(w * 0.07),
  });

  return base.composite(camadas).png({ compressionLevel: 8 }).toBuffer();
}

/**
 * Texto como CONTORNO, nao como <text>.
 *
 * A versao anterior pedia `font-family="Arial, Helvetica, sans-serif"` e deixava
 * o rasterizador resolver. Isso funciona na maquina de quem desenvolve e falha
 * no servidor: runtime serverless nao tem fonte instalada nenhuma, e cada letra
 * do nome do jogador virava um quadrado vazio na arte publicada.
 *
 * Aqui o glifo e convertido em path pelo opentype.js antes de virar imagem.
 * O ambiente nao precisa ter fonte alguma — o arquivo .ttf vem no repositorio.
 * O que sai daqui e byte a byte igual em qualquer maquina.
 */

const DIR_FONTES = path.join(process.cwd(), "assets", "fontes");

type Peso = "display" | "regular" | "bold";

const ARQUIVO_FONTE: Record<Peso, string> = {
  display: "Anton-Regular.ttf", // nome do jogador: pesada e condensada
  regular: "Inter-Regular.ttf", // frase, clube
  bold: "Inter-Bold.ttf", // rotulo
};

const cache = new Map<Peso, Font>();

function fonte(peso: Peso): Font {
  const guardada = cache.get(peso);
  if (guardada) return guardada;
  const bytes = readFileSync(path.join(DIR_FONTES, ARQUIVO_FONTE[peso]));
  // opentype quer ArrayBuffer, e o slice evita carregar o Buffer inteiro do pool
  const f = parseFonte(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  cache.set(peso, f);
  return f;
}

type OpcoesTexto = {
  texto: string;
  peso: Peso;
  tamanho: number;
  x: number;
  /** Linha de base, como no atributo y de <text>. */
  y: number;
  fill: string;
  opacidade?: number;
  /** Espaco extra entre letras, em px. Negativo aperta. */
  tracking?: number;
  /** "fim" alinha a direita de x, como text-anchor="end". */
  ancora?: "inicio" | "fim";
  /** Inclinacao em graus, para simular italico — nao ha arquivo italico embutido. */
  inclinacao?: number;
};

/** Largura do texto ja considerando tracking, para poder alinhar a direita. */
function largura(f: Font, texto: string, tamanho: number, tracking: number) {
  let total = 0;
  for (let i = 0; i < texto.length; i++) {
    total += f.getAdvanceWidth(texto[i], tamanho) + tracking;
    if (i < texto.length - 1) total += kerning(f, texto[i], texto[i + 1], tamanho);
  }
  return total - tracking;
}

/**
 * Escrever glifo a glifo e o que permite tracking, mas perde o kerning que o
 * `getPath` da string inteira aplicaria. Entao ele volta na mao — sem isso,
 * pares como "AV" e "To" ficam com buraco visivel no nome grande.
 */
function kerning(f: Font, a: string, b: string, tamanho: number) {
  const escala = tamanho / f.unitsPerEm;
  return f.getKerningValue(f.charToGlyph(a), f.charToGlyph(b)) * escala;
}

function texto({
  texto: str,
  peso,
  tamanho,
  x,
  y,
  fill,
  opacidade = 1,
  tracking = 0,
  ancora = "inicio",
  inclinacao = 0,
}: OpcoesTexto): string {
  if (!str) return "";
  const f = fonte(peso);

  let cursor = ancora === "fim" ? x - largura(f, str, tamanho, tracking) : x;
  const partes: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c !== " ") partes.push(f.getPath(c, cursor, y, tamanho).toPathData(2));
    cursor += f.getAdvanceWidth(c, tamanho) + tracking;
    if (i < str.length - 1) cursor += kerning(f, c, str[i + 1], tamanho);
  }

  const d = partes.join(" ");
  if (!d) return "";

  // skew em torno da propria linha de base, para o texto nao "escorregar"
  const transform = inclinacao
    ? ` transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) skewX(${-inclinacao}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})"`
    : "";

  return `<path d="${d}" fill="${fill}"${opacidade < 1 ? ` fill-opacity="${opacidade}"` : ""}${transform}/>`;
}

/**
 * A faixa e o texto sao um SVG unico do tamanho da arte. As posicoes sao medidas
 * de baixo para cima em pixels, nao em fracao da altura: assim feed e story ficam
 * com o mesmo respiro, mesmo tendo alturas diferentes.
 */
function svgTexto({
  w,
  h,
  nome,
  clube,
  frase,
  rotulo,
}: {
  w: number;
  h: number;
  nome: string;
  clube?: string | null;
  frase?: string | null;
  rotulo: string;
}) {
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0] ?? "";
  const resto = partes.slice(1).join(" ");

  const margem = w * 0.075;
  const corpo = w * 0.082;
  const baseSobrenome = h - w * 0.06;
  const baseNome = baseSobrenome - corpo * 1.06;
  const baseRotulo = baseNome - corpo * 1.08;
  const baseFrase = baseRotulo - corpo * 0.8;
  const topoFaixa = Math.min(h * 0.6, baseFrase - corpo * 1.4);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="faixa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05070D" stop-opacity="0"/>
      <stop offset="55%" stop-color="#05070D" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#05070D" stop-opacity="0.97"/>
    </linearGradient>
    <linearGradient id="risco" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF2D6F"/>
      <stop offset="100%" stop-color="#7B3BFF"/>
    </linearGradient>
  </defs>

  <rect x="0" y="${topoFaixa}" width="${w}" height="${h - topoFaixa}" fill="url(#faixa)"/>

  ${
    frase
      ? texto({
          texto: `“${frase}”`,
          peso: "regular",
          tamanho: corpo * 0.44,
          x: margem,
          y: baseFrase,
          fill: "#FFFFFF",
          opacidade: 0.85,
          inclinacao: 10,
        })
      : ""
  }

  ${texto({
    texto: rotulo.toUpperCase(),
    peso: "bold",
    tamanho: corpo * 0.32,
    x: margem,
    y: baseRotulo,
    fill: "#FF2D6F",
    tracking: w * 0.006,
  })}
  <rect x="${margem}" y="${baseRotulo + corpo * 0.16}" width="${w * 0.17}"
        height="${Math.max(2, w * 0.004)}" fill="url(#risco)"/>

  ${texto({
    texto: primeiro.toUpperCase(),
    peso: "display",
    tamanho: corpo,
    x: margem,
    y: baseNome,
    fill: "#FFFFFF",
    tracking: -w * 0.002,
  })}
  ${texto({
    texto: resto.toUpperCase(),
    peso: "display",
    tamanho: corpo,
    x: margem,
    y: baseSobrenome,
    fill: "#FFFFFF",
    opacidade: 0.55,
    tracking: -w * 0.002,
  })}

  ${
    clube
      ? texto({
          texto: clube.toUpperCase(),
          peso: "regular",
          tamanho: corpo * 0.3,
          x: w - margem,
          y: baseRotulo,
          fill: "#FFFFFF",
          opacidade: 0.45,
          tracking: w * 0.004,
          ancora: "fim",
        })
      : ""
  }
</svg>`;
}
