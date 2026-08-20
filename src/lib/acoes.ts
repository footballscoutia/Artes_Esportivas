"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "./supabase/server";
import { criarClienteAdmin } from "./supabase/admin";
import { usuarioAtual } from "./dados";
import { produzirArte, SemReferencia } from "./gerar";
import { BALDE, baixar } from "./storage";
import { FORMATOS, TIPOS, type Formato, type Tipo } from "./types";

/**
 * Escrita. Tudo que muda o banco passa por aqui.
 *
 * As gravacoes usam o cliente de SESSAO, de proposito: quem decide o que cada
 * papel pode fazer e a RLS, nao um `if` em TypeScript. `pode_aprovar()` vive no
 * banco e vale para qualquer caminho — inclusive um que a gente esqueca de
 * proteger aqui. Update valido que nao volta linha nenhuma significa que a
 * policy barrou, e isso vira mensagem em vez de sucesso silencioso.
 *
 * `geracoes` e a excecao: o esquema nao da insert para `authenticated`, porque
 * geracao e registro do servidor depois que o modelo responde. Ali entra o
 * cliente admin.
 */

export type Resultado<T = void> = { ok: true; dados: T } | { ok: false; erro: string };

function falha(erro: string): Resultado<never> {
  return { ok: false, erro };
}

const Novo = z.object({
  tipo: z.enum(TIPOS),
  formato: z.enum(FORMATOS),
  nome: z.string().min(2).max(60),
  clube: z.string().max(60).nullish(),
  frase: z.string().max(180).nullish(),
  adversario: z.string().max(60).nullish(),
  data_jogo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  hora_jogo: z.string().max(20).nullish(),
  campeonato: z.string().max(80).nullish(),
  estadio: z.string().max(80).nullish(),
  referencia_id: z.string().uuid(),
  referencia_versao: z.number().int(),
  arte_path: z.string().min(1),
  fundo_path: z.string().min(1),
  foto_path: z.string().nullish(),
  modelo: z.string(),
  provider: z.string(),
  custo_usd: z.number(),
  duracao_ms: z.number().int().nullish(),
});

/** Grava o pedido e a primeira geracao. E o "Salvar na biblioteca" do /novo. */
export async function criarPedido(entrada: unknown): Promise<Resultado<{ id: string }>> {
  const p = Novo.safeParse(entrada);
  if (!p.success) return falha("Dados do pedido inválidos.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data: pedido, error } = await sb
    .from("pedidos")
    .insert({
      tipo: p.data.tipo,
      formato: p.data.formato,
      nome_jogador: p.data.nome,
      clube: p.data.clube || null,
      frase: p.data.frase || null,
      adversario: p.data.adversario || null,
      data_jogo: p.data.data_jogo || null,
      hora_jogo: p.data.hora_jogo || null,
      campeonato: p.data.campeonato || null,
      estadio: p.data.estadio || null,
      foto_jogador_url: p.data.foto_path || null,
      referencia_id: p.data.referencia_id,
      referencia_versao: p.data.referencia_versao,
      status: "em_revisao",
      criado_por: usuario.id,
    })
    .select("id")
    .single();

  if (error || !pedido) return falha(`Não consegui salvar o pedido: ${error?.message ?? "sem retorno"}`);

  const { error: erroGeracao } = await criarClienteAdmin().from("geracoes").insert({
    pedido_id: pedido.id,
    imagem_url: p.data.arte_path,
    fundo_url: p.data.fundo_path,
    modelo: p.data.modelo,
    provider: p.data.provider,
    custo_usd: p.data.custo_usd,
    duracao_ms: p.data.duracao_ms ?? null,
  });

  if (erroGeracao) {
    // pedido sem geracao e um fantasma na fila: some para nao virar lixo
    await criarClienteAdmin().from("pedidos").delete().eq("id", pedido.id);
    return falha(`Não consegui salvar a geração: ${erroGeracao.message}`);
  }

  revalidatePath("/biblioteca");
  return { ok: true, dados: { id: pedido.id } };
}

/**
 * Nova tentativa para um pedido que ja existe.
 *
 * A geracao anterior NAO e apagada — vira historico. E o que permite olhar
 * cinco recusas seguidas de "gol" e concluir que o problema esta no prompt-mae,
 * nao na IA.
 */
export async function gerarOutra(pedidoId: string): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data: pedido } = await sb
    .from("pedidos")
    .select(
      "tipo, formato, nome_jogador, clube, frase, foto_jogador_url, adversario, data_jogo, hora_jogo, campeonato, estadio",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) return falha("Pedido não encontrado.");

  try {
    /**
     * A foto do atleta precisa voltar junto. Sem ela o modelo inventa um jogador
     * generico — e uma arte com o rosto errado no perfil da agencia e pior que
     * arte nenhuma. Falhar em baixar nao aborta: gerar sem foto ainda e util
     * para conferir estilo, e o erro fica no log.
     */
    const foto = pedido.foto_jogador_url
      ? await baixar(BALDE.fotos, pedido.foto_jogador_url).catch((e) => {
          console.error("[gerarOutra] não recuperei a foto do atleta:", e);
          return null;
        })
      : null;

    const arte = await produzirArte({
      foto,
      tipo: pedido.tipo as Tipo,
      formato: pedido.formato as Formato,
      nome: pedido.nome_jogador,
      clube: pedido.clube,
      frase: pedido.frase,
      adversario: pedido.adversario,
      data_jogo: pedido.data_jogo,
      hora_jogo: pedido.hora_jogo,
      campeonato: pedido.campeonato,
      estadio: pedido.estadio,
    });

    const { error } = await criarClienteAdmin().from("geracoes").insert({
      pedido_id: pedidoId,
      imagem_url: arte.arte_path,
      fundo_url: arte.fundo_path,
      modelo: arte.modelo,
      provider: arte.provider,
      custo_usd: arte.custo_usd,
      duracao_ms: arte.duracao_ms,
    });

    if (error) return falha(`Gerei a arte mas não consegui gravar: ${error.message}`);

    revalidatePath(`/pedido/${pedidoId}`);
    revalidatePath("/biblioteca");
    return { ok: true, dados: undefined };
  } catch (e) {
    if (e instanceof SemReferencia) return falha(e.message);
    console.error("[gerarOutra]", e);
    return falha("Falha ao gerar a arte. Tente de novo.");
  }
}
