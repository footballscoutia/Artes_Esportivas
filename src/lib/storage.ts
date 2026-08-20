import "server-only";
import { randomUUID } from "node:crypto";
import { criarClienteAdmin } from "./supabase/admin";

/**
 * Os tres buckets sao privados. Nada aqui devolve URL publica: a leitura sai
 * sempre por URL assinada, com validade curta.
 *
 * Quem escreve e o cliente admin, nao o de sessao. E deliberado: a policy de
 * storage deixa a equipe subir foto de jogador, mas gravar geracao e trabalho
 * do servidor depois que o modelo responde — o navegador nunca precisa desse
 * poder.
 */

export const BALDE = {
  fotos: "fotos-jogadores",
  geracoes: "geracoes",
  referencias: "referencias",
  marcas: "marcas",
} as const;

type Balde = (typeof BALDE)[keyof typeof BALDE];

/** Uma hora. Suficiente para revisar uma arte sem virar link eterno vazado. */
const VALIDADE_S = 60 * 60;

export async function subir(
  balde: Balde,
  bytes: Buffer,
  tipo = "image/png",
  extensao = "png",
): Promise<string> {
  const caminho = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${extensao}`;
  const { error } = await criarClienteAdmin()
    .storage.from(balde)
    .upload(caminho, bytes, { contentType: tipo, upsert: false });

  if (error) throw new Error(`Falha ao subir para ${balde}: ${error.message}`);
  return caminho;
}

/**
 * Caminho guardado no banco -> URL que o <img> consegue abrir.
 *
 * Aceita tambem os caminhos de mentira da fase 1 (`/mock/...`), que ja sao
 * servidos por `public/` e nao precisam de assinatura. Sem isso, rodar sem
 * Supabase quebraria as telas.
 */
export async function assinar(
  balde: Balde,
  caminho: string | null,
): Promise<string | null> {
  if (!caminho) return null;
  if (caminho.startsWith("/") || caminho.startsWith("http")) return caminho;

  const { data, error } = await criarClienteAdmin()
    .storage.from(balde)
    .createSignedUrl(caminho, VALIDADE_S);

  // link expirado ou arquivo sumido nao pode derrubar a tela inteira
  if (error) {
    console.error(`[storage] nao assinei ${balde}/${caminho}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

/** Assina varios de uma vez, preservando a ordem. */
export async function assinarVarios(balde: Balde, caminhos: (string | null)[]) {
  return Promise.all(caminhos.map((c) => assinar(balde, c)));
}

/** Baixa de volta o que foi guardado — usado para recompor camadas sobre o fundo. */
export async function baixar(balde: Balde, caminho: string): Promise<Buffer> {
  const { data, error } = await criarClienteAdmin().storage.from(balde).download(caminho);
  if (error || !data) throw new Error(`Falha ao baixar ${balde}/${caminho}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}
