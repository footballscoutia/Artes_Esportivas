import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { GenInput, GenResult, ImageGenProvider } from "./provider";

/**
 * Provider de mentira: devolve uma imagem de exemplo depois de uma espera.
 * Serve para a interface inteira rodar sem chave de API e sem gastar credito.
 *
 * Ele NUNCA falha por falta de arquivo. Ja falhou: ao entrar a categoria
 * `matchday` nao havia `fundo-matchday-feed.png`, o readFile estourou e a tela
 * mostrou "falha ao gerar" como se o modelo tivesse recusado. Um dublê que
 * derruba o pipeline por nao ter o proprio adereço nao serve de dublê — se o
 * arquivo nao existe, ele pinta um fundo liso e segue.
 */
export class MockProvider implements ImageGenProvider {
  readonly nome = "mock";
  readonly modelo = "mock-arte-exemplo";

  constructor(private readonly arquivo: string) {}

  async gerar(input: GenInput): Promise<GenResult> {
    const inicio = Date.now();
    await new Promise((r) => setTimeout(r, 2600 + Math.random() * 1800));

    const imagem =
      (await readFile(path.join(process.cwd(), "public", this.arquivo)).catch(() => null)) ??
      (await fundoLiso(input.largura, input.altura));

    return {
      imagem,
      mime: "image/png",
      modelo: this.modelo,
      custoUsd: 0,
      duracaoMs: Date.now() - inicio,
    };
  }
}

/** Ultimo recurso: um degrade na cor da marca, so para a arte ter o que compor. */
function fundoLiso(largura: number, altura: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2A1140"/>
        <stop offset="60%" stop-color="#7B3BFF" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#05070D"/>
      </linearGradient>
    </defs>
    <rect width="${largura}" height="${altura}" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
