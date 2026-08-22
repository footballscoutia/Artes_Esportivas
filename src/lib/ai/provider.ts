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
  /**
   * Escudos dos clubes envolvidos, na ordem em que o prompt fala deles.
   *
   * Vao como IMAGEM, nao como descricao: escudo descrito em texto sai
   * inventado, e escudo inventado parece escudo — o pior tipo de erro, porque
   * ninguem confere.
   */
  escudos?: Array<{ rotulo: string; imagem: Buffer }>;
  /**
   * Logo da agencia, para o MODELO integrar na composicao.
   *
   * So vem preenchida no modo `ia`. No modo `carimbo` a logo nao passa por
   * aqui: ela e colada depois, em codigo, sobre a imagem pronta. A diferenca
   * decide qual erro e possivel — o modelo acerta o lugar e pode errar a forma;
   * o codigo acerta a forma e escolhe o lugar as cegas.
   */
  logo?: Buffer | null;
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
