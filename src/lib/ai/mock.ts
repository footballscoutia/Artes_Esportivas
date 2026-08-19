import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GenResult, ImageGenProvider } from "./provider";

/**
 * Provider da fase 1: devolve uma das artes de exemplo depois de uma espera.
 * Serve para a interface inteira rodar sem chave de API e sem gastar credito.
 */
export class MockProvider implements ImageGenProvider {
  readonly nome = "mock";
  readonly modelo = "mock-arte-exemplo";

  constructor(private readonly arquivo: string) {}

  async gerar(): Promise<GenResult> {
    const inicio = Date.now();
    await new Promise((r) => setTimeout(r, 2600 + Math.random() * 1800));
    const imagem = await readFile(path.join(process.cwd(), "public", this.arquivo));
    return {
      imagem,
      mime: "image/png",
      modelo: this.modelo,
      custoUsd: 0,
      duracaoMs: Date.now() - inicio,
    };
  }
}
