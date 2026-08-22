import "server-only";
import { criarClienteServidor } from "./supabase/server";
import { criarClienteAdmin } from "./supabase/admin";
import type { ArteProduzida } from "./gerar";
import type { Formato, Tipo } from "./types";

/**
 * Grava a arte no banco no MESMO ponto em que ela custa dinheiro.
 *
 * Antes isto era um botão: gerar mostrava a prévia e só "Salvar na biblioteca"
 * criava a linha. Quem trocasse de aba antes de clicar perdia a arte — os
 * arquivos ficavam no bucket, órfãos, e a cobrança do modelo tinha acontecido
 * do mesmo jeito. Perder trabalho pago por causa de uma navegação é o tipo de
 * defeito que não aparece em teste nenhum e acontece toda semana.
 *
 * Agora quem gera, grava. O status nasce `rascunho` e a biblioteca mostra
 * assim mesmo, porque ela não é fila de aprovação — é o lugar onde a pessoa
 * reencontra o arquivo.
 */

type Entrada = {
  /** Existente = nova tentativa do mesmo pedido. Nulo = pedido novo. */
  pedidoId?: string | null;
  usuarioId: string;
  tipo: Tipo;
  formato: Formato;
  nome: string;
  clube?: string | null;
  frase?: string | null;
  jogador_id?: string | null;
  clube_id?: string | null;
  adversario_id?: string | null;
  adversario?: string | null;
  data_jogo?: string | null;
  hora_jogo?: string | null;
  campeonato?: string | null;
  estadio?: string | null;
  arte: ArteProduzida;
  marca_id: string | null;
  logo_modo: string;
  posicao_logo: string | null;
  logo_cor: string | null;
  uniforme_id: string | null;
};

export async function registrarGeracao(e: Entrada): Promise<string> {
  const sb = await criarClienteServidor();

  /**
   * O pedido é criado pelo cliente de SESSÃO, e por isso `org_id` se preenche
   * sozinho pelo default `minha_org()`. A geração usa o cliente ADMIN, que não
   * tem sessão — lá `minha_org()` devolveria nulo, então o `org_id` precisa vir
   * de uma linha que já tem a org certa: o próprio pedido.
   */
  let pedidoId = e.pedidoId ?? null;
  let orgId: string | null = null;

  if (pedidoId) {
    /* Confere que o pedido é mesmo desta org antes de pendurar uma geração
       nele. A RLS já recusaria um id de fora, mas devolver nulo aqui evita
       gravar a geração num pedido que a pessoa não pode ver. */
    const { data } = await sb.from("pedidos").select("id, org_id").eq("id", pedidoId).maybeSingle();
    if (data) orgId = data.org_id as string;
    else pedidoId = null;
  }

  if (!pedidoId) {
    const { data, error } = await sb
      .from("pedidos")
      .insert({
        tipo: e.tipo,
        formato: e.formato,
        nome_jogador: e.nome,
        clube: e.clube || null,
        frase: e.frase || null,
        adversario: e.adversario || null,
        data_jogo: e.data_jogo || null,
        hora_jogo: e.hora_jogo || null,
        campeonato: e.campeonato || null,
        estadio: e.estadio || null,
        jogador_id: e.jogador_id || null,
        clube_id: e.clube_id || null,
        adversario_id: e.adversario_id || null,
        referencia_id: e.arte.referencia_id,
        referencia_versao: e.arte.referencia_versao,
        status: "rascunho",
        criado_por: e.usuarioId,
      })
      .select("id, org_id")
      .single();

    if (error || !data) throw new Error(`Não consegui gravar o pedido: ${error?.message}`);
    pedidoId = data.id as string;
    orgId = data.org_id as string;
  }

  const { error: erroGeracao } = await criarClienteAdmin().from("geracoes").insert({
    pedido_id: pedidoId,
    org_id: orgId,
    imagem_url: e.arte.arte_path,
    fundo_url: e.arte.fundo_path,
    modelo: e.arte.modelo,
    provider: e.arte.provider,
    custo_usd: e.arte.custo_usd,
    duracao_ms: e.arte.duracao_ms,
    marca_id: e.marca_id,
    logo_modo: e.logo_modo,
    posicao_logo: e.posicao_logo,
    logo_cor: e.logo_cor,
    uniforme_id: e.uniforme_id,
  });

  if (erroGeracao) throw new Error(`Não consegui gravar a geração: ${erroGeracao.message}`);

  return pedidoId;
}
