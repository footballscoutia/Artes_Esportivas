import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import path from "node:path";
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

function esc(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * A faixa e o texto sao um SVG unico do tamanho da arte. As posicoes sao medidas
 * de baixo para cima em pixels, nao em fracao da altura: assim feed e story ficam
 * com o mesmo respiro, mesmo tendo alturas diferentes.
 *
 * Fonte: enquanto a fonte da marca nao chega, cai no stack do sistema.
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

  const linhaFrase = frase
    ? `<text x="${margem}" y="${baseFrase}" font-family="Arial, Helvetica, sans-serif"
             font-size="${corpo * 0.44}" font-style="italic"
             fill="#FFFFFF" fill-opacity="0.85">${esc(`“${frase}”`)}</text>`
    : "";

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

  ${linhaFrase}

  <text x="${margem}" y="${baseRotulo}" font-family="Arial, Helvetica, sans-serif"
        font-size="${corpo * 0.32}" font-weight="700"
        letter-spacing="${w * 0.006}" fill="#FF2D6F">${esc(rotulo.toUpperCase())}</text>
  <rect x="${margem}" y="${baseRotulo + corpo * 0.16}" width="${w * 0.17}"
        height="${Math.max(2, w * 0.004)}" fill="url(#risco)"/>

  <text x="${margem}" y="${baseNome}" font-family="Arial, Helvetica, sans-serif"
        font-size="${corpo}" font-weight="800" letter-spacing="${-w * 0.002}"
        fill="#FFFFFF">${esc(primeiro.toUpperCase())}</text>
  <text x="${margem}" y="${baseSobrenome}" font-family="Arial, Helvetica, sans-serif"
        font-size="${corpo}" font-weight="800" letter-spacing="${-w * 0.002}"
        fill="#FFFFFF" fill-opacity="0.55">${esc(resto.toUpperCase())}</text>

  ${
    clube
      ? `<text x="${w - margem}" y="${baseRotulo}" text-anchor="end"
               font-family="Arial, Helvetica, sans-serif" font-size="${corpo * 0.3}"
               letter-spacing="${w * 0.004}" fill="#FFFFFF" fill-opacity="0.45">${esc(clube.toUpperCase())}</text>`
      : ""
  }
</svg>`;
}
