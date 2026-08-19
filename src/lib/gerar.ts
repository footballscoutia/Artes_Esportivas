import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pegarProvider, providerAtivo } from "./ai";
import { compor } from "./compose";
import { buscarReferencia } from "./dados";
import { BALDE, subir } from "./storage";
import { FORMATO_META, TIPO_META, type Formato, type Tipo } from "./types";

/**
 * O caminho unico de "pedir uma arte ao modelo e guardar o resultado".
 *
 * Vive fora da rota porque dois lugares precisam dele: `/api/gerar`, que serve
 * a previa antes de o pedido existir, e a acao "gerar outra", que roda com o
 * pedido ja gravado. Duplicar isso significaria consertar bug de composicao
 * duas vezes e esquecer uma.
 */

/** Pede ao modelo uma imagem maior que o formato final — a sobra vira margem do corte. */
const FOLGA = 1.18;

export type ArteProduzida = {
  arte_path: string;
  fundo_path: string;
  modelo: string;
  provider: string;
  custo_usd: number;
  duracao_ms: number;
  referencia_id: string;
  referencia_versao: number;
};

export class SemReferencia extends Error {}

type Textos = { nome: string; clube?: string | null; frase?: string | null; rotulo: string };

/**
 * Injeta os textos no prompt-mae.
 *
 * O curador escreve `{{nome}}`, `{{clube}}`, `{{frase}}` e `{{rotulo}}` onde
 * quiser dentro do prompt — assim ele controla como o nome entra na cena, que e
 * metade do resultado. Se o prompt nao tiver marcador nenhum, os textos vao num
 * bloco no fim, para uma referencia antiga nao sair sem nome.
 *
 * O nome vai entre aspas e soletrado. Modelo de imagem erra letra de nome
 * proprio, e "Famalicao" no lugar de "Famalicão" e o tipo de erro que so aparece
 * depois de publicado.
 */
export function montarPrompt(promptMae: string, t: Textos): string {
  const valores: Record<string, string> = {
    nome: t.nome.trim(),
    clube: t.clube?.trim() ?? "",
    frase: t.frase?.trim() ?? "",
    rotulo: t.rotulo,
  };

  const temMarcador = /\{\{\s*(nome|clube|frase|rotulo)\s*\}\}/.test(promptMae);

  const comValores = promptMae.replace(
    /\{\{\s*(nome|clube|frase|rotulo)\s*\}\}/g,
    (_, chave: string) => valores[chave] ?? "",
  );

  if (temMarcador) return comValores;

  const linhas = [
    `Escreva na arte, exatamente como está entre aspas, sem alterar acentuação:`,
    `- Nome do atleta: "${valores.nome}" — em destaque, tipografia pesada.`,
    `- Etiqueta: "${valores.rotulo}" — menor, acima do nome.`,
  ];
  if (valores.clube) linhas.push(`- Clube: "${valores.clube}" — discreto.`);
  if (valores.frase) linhas.push(`- Frase do atleta: "${valores.frase}" — em itálico.`);
  linhas.push(
    `Nenhum outro texto na imagem. Não inventar palavras, números nem escudos de clube.`,
    `Deixar o canto inferior direito limpo: a logo da agência entra ali por cima.`,
  );

  return `${comValores}\n\n${linhas.join("\n")}`;
}

export async function produzirArte({
  tipo,
  formato,
  nome,
  clube,
  frase,
  foto,
}: {
  tipo: Tipo;
  formato: Formato;
  nome: string;
  clube?: string | null;
  frase?: string | null;
  foto?: Buffer | null;
}): Promise<ArteProduzida> {
  const alvo = FORMATO_META[formato];

  const referencia = await buscarReferencia(tipo, formato);
  if (!referencia || !referencia.ativa) {
    throw new SemReferencia(
      `Não há referência ativa para ${tipo} em ${formato}. Cadastre em Referências.`,
    );
  }

  // referencia curada: caminho em public/ na fase de andaime, URL assinada depois
  const refBuffer = referencia.imagem_url?.startsWith("/")
    ? await readFile(path.join(process.cwd(), "public", referencia.imagem_url)).catch(() => null)
    : referencia.imagem_url
      ? await fetch(referencia.imagem_url)
          .then((r) => r.arrayBuffer())
          .then((b) => Buffer.from(b))
          .catch(() => null)
      : null;

  const sufixo = formato === "feed_4x5" ? "feed" : "story";
  const provider = pegarProvider(`/mock/fundo-${tipo}-${sufixo}.png`);

  const gerado = await provider.gerar({
    referencia: refBuffer,
    foto: foto ?? null,
    prompt: montarPrompt(referencia.prompt_mae, {
      nome,
      clube,
      frase,
      rotulo: TIPO_META[tipo].rotulo,
    }),
    largura: Math.round(alvo.w * FOLGA),
    altura: Math.round(alvo.h * FOLGA),
  });

  // corte para o formato final e a logo por cima
  const final = await compor({ fundo: gerado.imagem, formato });

  /**
   * Guarda tambem o que o modelo devolveu sem corte e sem logo. Serve para
   * conferir depois se um problema veio do modelo ou do acabamento — e e o
   * unico jeito de reaproveitar a arte se a logo mudar de lugar.
   */
  const [arte_path, fundo_path] = await Promise.all([
    subir(BALDE.geracoes, final),
    subir(BALDE.geracoes, gerado.imagem),
  ]);

  return {
    arte_path,
    fundo_path,
    modelo: gerado.modelo,
    provider: providerAtivo(),
    custo_usd: gerado.custoUsd,
    duracao_ms: gerado.duracaoMs,
    referencia_id: referencia.id,
    referencia_versao: referencia.versao,
  };
}
