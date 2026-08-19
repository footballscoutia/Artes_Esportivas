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
    prompt: referencia.prompt_mae,
    largura: Math.round(alvo.w * FOLGA),
    altura: Math.round(alvo.h * FOLGA),
  });

  // camadas de codigo por cima do que a IA devolveu
  const final = await compor({
    fundo: gerado.imagem,
    nome,
    clube,
    frase,
    rotulo: TIPO_META[tipo].rotulo,
    formato,
  });

  /**
   * Guarda o fundo cru junto com a arte composta. E o fundo separado que
   * permite corrigir um nome errado sem gastar outra geracao — na arte final o
   * texto ja esta queimado no pixel.
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
