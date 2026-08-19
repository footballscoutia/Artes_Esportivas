"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "./supabase/server";
import { criarClienteAdmin } from "./supabase/admin";
import { usuarioAtual } from "./dados";
import { produzirArte, SemReferencia } from "./gerar";
import { FORMATOS, TIPOS, type Formato, type Tipo } from "./types";

/**
 * Escrita. Tudo que muda o banco passa por aqui.
 *
 * As gravacoes de `pedidos` usam o cliente de SESSAO, de proposito: quem decide
 * se alguem pode aprovar e a RLS, nao um `if` em TypeScript. `pode_aprovar()`
 * vive no banco e vale para qualquer caminho — inclusive um que a gente esqueca
 * de proteger aqui.
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

/** Grava o pedido e a primeira geracao. E o "Enviar para aprovacao" do /novo. */
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

  revalidatePath("/fila");
  return { ok: true, dados: { id: pedido.id } };
}

export async function aprovarPedido(pedidoId: string, geracaoId: string): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("pedidos")
    .update({
      status: "aprovado",
      aprovado_por: usuario.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("id");

  if (error) return falha(`Não consegui aprovar: ${error.message}`);
  // update valido que nao volta linha nenhuma = a RLS barrou, nao o SQL
  if (!data?.length) return falha("Seu perfil não tem permissão para aprovar.");

  await sb.from("geracoes").update({ aprovada: true, motivo_recusa: null }).eq("id", geracaoId);

  revalidatePath("/fila");
  revalidatePath(`/pedido/${pedidoId}`);
  return { ok: true, dados: undefined };
}

/**
 * A recusa fica gravada na geracao, nao apagada.
 *
 * Cinco recusas de "gol" pelo mesmo motivo apontam para o prompt-mae, nao para
 * a IA. Esse historico e o unico diagnostico que a agencia vai ter.
 */
export async function recusarGeracao(
  pedidoId: string,
  geracaoId: string,
  motivo: string,
): Promise<Resultado> {
  if (motivo.trim().length < 4) {
    return falha("Escreva o motivo — ele vira diagnóstico da referência.");
  }

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("geracoes")
    .update({ aprovada: false, motivo_recusa: motivo.trim() })
    .eq("id", geracaoId)
    .select("id");

  if (error) return falha(`Não consegui registrar a recusa: ${error.message}`);
  if (!data?.length) return falha("Seu perfil não tem permissão para recusar.");

  revalidatePath(`/pedido/${pedidoId}`);
  return { ok: true, dados: undefined };
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
    .select("tipo, formato, nome_jogador, clube, frase")
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) return falha("Pedido não encontrado.");

  try {
    const arte = await produzirArte({
      tipo: pedido.tipo as Tipo,
      formato: pedido.formato as Formato,
      nome: pedido.nome_jogador,
      clube: pedido.clube,
      frase: pedido.frase,
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
    revalidatePath("/fila");
    return { ok: true, dados: undefined };
  } catch (e) {
    if (e instanceof SemReferencia) return falha(e.message);
    console.error("[gerarOutra]", e);
    return falha("Falha ao gerar a arte. Tente de novo.");
  }
}

/**
 * Curadoria da referencia. Editar o prompt-mae sobe a versao em vez de
 * sobrescrever: cada pedido guarda com que versao nasceu, e sem o numero
 * subindo esse rastro vira mentira.
 */
export async function salvarPromptMae(
  referenciaId: string,
  promptMae: string,
): Promise<Resultado<{ versao: number }>> {
  if (promptMae.trim().length < 20) return falha("O prompt-mãe está curto demais.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data: atual } = await sb
    .from("referencias")
    .select("versao, prompt_mae")
    .eq("id", referenciaId)
    .maybeSingle();

  if (!atual) return falha("Referência não encontrada.");
  if (atual.prompt_mae.trim() === promptMae.trim()) return falha("Nada mudou no prompt-mãe.");

  const versao = atual.versao + 1;
  const { data, error } = await sb
    .from("referencias")
    .update({ prompt_mae: promptMae.trim(), versao })
    .eq("id", referenciaId)
    .select("id");

  if (error) return falha(`Não consegui salvar: ${error.message}`);
  if (!data?.length) return falha("Só quem aprova pode editar referências.");

  revalidatePath("/admin/referencias");
  return { ok: true, dados: { versao } };
}
