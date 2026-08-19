import { MockProvider } from "./mock";
import { GeminiProvider } from "./gemini";
import type { ImageGenProvider } from "./provider";

export * from "./provider";

/**
 * Trocar de modelo e trocar IMAGE_PROVIDER no .env — nada mais.
 * Ao adicionar Flux Kontext Max ou Seedream 5.0, entra um `case` aqui.
 */
export function pegarProvider(arquivoMock = "/mock/arte-contratacao-feed.png"): ImageGenProvider {
  const escolhido = process.env.IMAGE_PROVIDER ?? "mock";

  switch (escolhido) {
    case "gemini":
      return new GeminiProvider(
        process.env.GEMINI_API_KEY ?? "",
        process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image",
      );
    case "mock":
      return new MockProvider(arquivoMock);
    default:
      throw new Error(
        `IMAGE_PROVIDER="${escolhido}" não existe. Use "mock" ou "gemini".`,
      );
  }
}

export function providerAtivo() {
  return process.env.IMAGE_PROVIDER ?? "mock";
}
