import { GoogleGenAI } from "@google/genai";
import { GenError, type GenInput, type GenResult, type ImageGenProvider } from "./provider";

/** Preco por imagem, por faixa de resolucao (US$). Referencia do contexto do projeto. */
const CUSTO_POR_RESOLUCAO = [
  { ate: 512, usd: 0.045 },
  { ate: 1024, usd: 0.067 },
  { ate: 2048, usd: 0.1 },
  { ate: Infinity, usd: 0.15 },
];

function custoEstimado(largura: number, altura: number) {
  const lado = Math.max(largura, altura);
  return CUSTO_POR_RESOLUCAO.find((f) => lado <= f.ate)!.usd;
}

/**
 * Nano Banana 2 via Gemini API.
 *
 * Exige projeto com billing ativo: no tier gratuito o Google usa o que sobe para
 * treinar modelo e revisor humano pode ver o arquivo — contratacao nao anunciada
 * e informacao confidencial.
 */
export class GeminiProvider implements ImageGenProvider {
  readonly nome = "gemini";
  readonly modelo: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, modelo = "gemini-3.1-flash-image") {
    if (!apiKey) throw new GenError("GEMINI_API_KEY ausente no .env");
    this.client = new GoogleGenAI({ apiKey });
    this.modelo = modelo;
  }

  async gerar({
    referencia,
    foto,
    escudos,
    uniforme,
    logo,
    prompt,
    largura,
    altura,
  }: GenInput): Promise<GenResult> {
    const inicio = Date.now();

    const partes: Array<Record<string, unknown>> = [];
    if (referencia) {
      partes.push({ text: "Imagem 1 — referencia de estilo da agencia:" });
      partes.push({ inlineData: { mimeType: "image/png", data: referencia.toString("base64") } });
    }
    if (foto) {
      partes.push({ text: "Imagem 2 — foto do atleta, preservar a identidade dele:" });
      partes.push({ inlineData: { mimeType: "image/jpeg", data: foto.toString("base64") } });
    }
    /**
     * O manto entra logo DEPOIS da foto do atleta.
     *
     * A ordem importa: a foto manda no rosto, o uniforme manda na roupa, e as
     * duas instrucoes precisam chegar juntas para o modelo entender que sao a
     * mesma pessoa vestida de outro jeito — e nao duas pessoas.
     */
    if (uniforme) {
      partes.push({
        text: "Imagem de referencia do UNIFORME. O atleta deve vestir exatamente esta camisa: mesmas cores, mesmas faixas, mesmo padrao, mesma gola, escudo e patrocinios nas mesmas posicoes. Nao inventar patrocinador, nao trocar o desenho, nao misturar com a camisa que aparece na foto do atleta. O rosto continua sendo o da foto do atleta:",
      });
      partes.push({
        inlineData: { mimeType: "image/jpeg", data: uniforme.toString("base64") },
      });
    }

    for (const escudo of escudos ?? []) {
      partes.push({ text: `Escudo do ${escudo.rotulo}, reproduzir fielmente, sem redesenhar:` });
      partes.push({
        inlineData: { mimeType: "image/png", data: escudo.imagem.toString("base64") },
      });
    }
    /**
     * A logo entra DEPOIS dos escudos e antes do prompt-mae.
     *
     * A ordem nao e enfeite: o modelo le as partes em sequencia, e a logo
     * precisa chegar ja tendo passado a foto e os escudos, para nao competir
     * com eles pela mesma instrucao de "reproduza fielmente". Colocada por
     * ultimo entre as imagens, ela e a que fica mais perto do texto que manda
     * integra-la na composicao.
     *
     * O pedido e explicito em nao redesenhar. Um teste com a logo real (letra
     * cursiva metalica, com boneco) voltou fiel e bem posicionada, no ceu vazio
     * do topo — mas fidelidade de logo varia por geracao, e por isso o modo
     * `carimbo` continua existindo para quando a forma exata for inegociavel.
     */
    if (logo) {
      partes.push({
        text: "Logo da agência. Reproduzir EXATAMENTE como está — mesmas letras, mesmas cores, mesmas proporções, sem redesenhar nem estilizar:",
      });
      partes.push({ inlineData: { mimeType: "image/png", data: logo.toString("base64") } });
      partes.push({
        text: "Integrar essa logo na arte, no ponto da composição em que ela fique legível e não cubra o atleta nem os escudos. Tamanho discreto, como assinatura da agência. Não repetir a logo em mais de um lugar.",
      });
    }

    partes.push({ text: prompt });

    try {
      const resposta = await this.client.models.generateContent({
        model: this.modelo,
        contents: [{ role: "user", parts: partes }],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: proporcao(largura, altura) },
        },
      });

      const dados = resposta.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data,
      )?.inlineData;

      if (!dados?.data) {
        throw new GenError(
          "O modelo respondeu sem imagem. Pode ter sido bloqueio de conteúdo — confira o prompt-mãe da referência.",
        );
      }

      return {
        imagem: Buffer.from(dados.data, "base64"),
        mime: dados.mimeType ?? "image/png",
        modelo: this.modelo,
        custoUsd: custoEstimado(largura, altura),
        duracaoMs: Date.now() - inicio,
      };
    } catch (e) {
      if (e instanceof GenError) throw e;
      throw new GenError("Falha na chamada ao Gemini", e);
    }
  }
}

function proporcao(largura: number, altura: number) {
  const r = largura / altura;
  if (Math.abs(r - 4 / 5) < 0.02) return "4:5";
  if (Math.abs(r - 9 / 16) < 0.02) return "9:16";
  if (Math.abs(r - 1) < 0.02) return "1:1";
  return "4:5";
}
