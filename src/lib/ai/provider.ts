/**
 * Fronteira unica com o modelo de imagem.
 *
 * Nada fora de `src/lib/ai/` sabe que existe Gemini. Para rodar o comparativo
 * com Flux Kontext Max ou Seedream 5.0 basta criar um arquivo irmao que exporte
 * um `ImageGenProvider` e apontar IMAGE_PROVIDER no .env — nenhuma tela muda.
 */

export type GenInput = {
  /** Arte curada que define o estilo. Buffer da imagem de referencia. */
  referencia: Buffer | null;
  /** Foto do jogador enviada pelo usuario. */
  foto: Buffer | null;
  /** Prompt-mae da referencia. O usuario nunca escreve isto. */
  prompt: string;
  /** Resolucao pedida ao modelo — maior que o formato final, o corte vem depois. */
  largura: number;
  altura: number;
};

export type GenResult = {
  imagem: Buffer;
  mime: string;
  modelo: string;
  custoUsd: number;
  duracaoMs: number;
};

export interface ImageGenProvider {
  readonly nome: string;
  readonly modelo: string;
  gerar(input: GenInput): Promise<GenResult>;
}

export class GenError extends Error {
  constructor(
    message: string,
    readonly causa?: unknown,
  ) {
    super(message);
    this.name = "GenError";
  }
}
