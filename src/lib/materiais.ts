import "server-only";
import { criarClienteServidor } from "./supabase/server";
import { BALDE, baixar } from "./storage";
import type { ClubeNaArte } from "./gerar";

/**
 * Junta o que o modelo precisa VER: a foto do atleta e os escudos dos clubes.
 *
 * O pedido guarda ids; o modelo precisa de bytes. Esta e a ponte, e ela mora
 * fora da rota porque tres caminhos passam por aqui — a previa em `/api/gerar`,
 * o `criarPedido` e o `gerarOutra`. Antes cada um baixava o que sabia baixar, e
 * o `gerarOutra` acabou nascendo sem a foto: gerava um jogador inventado a
 * dez centavos o clique.
 *
 * Nada aqui derruba a geracao. Escudo que nao baixa vira arte sem escudo, que
 * ainda serve; abortar deixaria o usuario sem nada por causa de um PNG.
 */
export type MateriaisDaArte = {
  foto: Buffer | null;
  clubes: ClubeNaArte[];
};

/**
 * A foto do manto escolhido, pronta para ir ao modelo.
 *
 * Nao derruba a geracao se nao vier: arte com a camisa da foto do atleta ainda
 * serve, e abortar deixaria a pessoa sem nada por causa de um JPEG.
 */
export async function uniformeDaArte(uniformeId?: string | null): Promise<Buffer | null> {
  if (!uniformeId) return null;

  const sb = await criarClienteServidor();
  const { data } = await sb
    .from("uniformes")
    .select("imagem_url")
    .eq("id", uniformeId)
    .eq("ativo", true)
    .maybeSingle();

  if (!data?.imagem_url) return null;
  return baixar(BALDE.uniformes, data.imagem_url).catch((e) => {
    console.error("[materiais] uniforme nao veio:", e);
    return null;
  });
}

type LinhaClube = {
  id: string;
  nome: string;
  nome_curto: string | null;
  escudo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
};

async function escudoDe(c: LinhaClube): Promise<Buffer | null> {
  if (!c.escudo_url) return null;
  return baixar(BALDE.referencias, c.escudo_url).catch((e) => {
    console.error(`[materiais] escudo do ${c.nome} não veio:`, e);
    return null;
  });
}

export async function materiaisDaArte({
  jogador_id,
  clube_id,
  adversario_id,
  foto_path,
}: {
  jogador_id?: string | null;
  clube_id?: string | null;
  adversario_id?: string | null;
  /** Caminho da foto ja no bucket, quando o pedido guarda o dela. */
  foto_path?: string | null;
}): Promise<MateriaisDaArte> {
  const sb = await criarClienteServidor();

  const ids = [clube_id, adversario_id].filter((v): v is string => Boolean(v));

  const [linhaJogador, linhasClube] = await Promise.all([
    jogador_id
      ? sb.from("jogadores").select("foto_url").eq("id", jogador_id).maybeSingle()
      : null,
    ids.length
      ? sb
          .from("clubes")
          .select("id, nome, nome_curto, escudo_url, cor_primaria, cor_secundaria")
          .in("id", ids)
      : null,
  ]);

  const caminhoFoto = (linhaJogador?.data?.foto_url as string | undefined) ?? foto_path ?? null;
  const foto = caminhoFoto
    ? await baixar(BALDE.fotos, caminhoFoto).catch((e) => {
        console.error("[materiais] foto do atleta não veio:", e);
        return null;
      })
    : null;

  const porId = new Map(
    ((linhasClube?.data ?? []) as LinhaClube[]).map((c) => [c.id, c] as const),
  );

  /**
   * A ordem importa: o clube do atleta primeiro, o adversario depois. O prompt
   * fala "o clube do atleta" e "o adversario" nessa sequencia, e trocar isso
   * pinta a arte com a cor do time errado.
   */
  const clubes: ClubeNaArte[] = [];
  for (const [id, rotulo] of [
    [clube_id, "clube do atleta"],
    [adversario_id, "adversário"],
  ] as const) {
    const c = id ? porId.get(id) : undefined;
    if (!c) continue;
    clubes.push({
      rotulo: `${c.nome_curto ?? c.nome} (${rotulo})`,
      escudo: await escudoDe(c),
      cor_primaria: c.cor_primaria,
      cor_secundaria: c.cor_secundaria,
    });
  }

  return { foto, clubes };
}

/**
 * A marca da org, pronta para carimbar.
 *
 * "Padrao" porque hoje toda org so cadastra uma. Quando a Fase 1 ganhar tela
 * de escolha manual, isto vira so o valor inicial do seletor — nao muda quem
 * chama.
 */
export async function marcaPadraoDaOrg(
  marcaId?: string | null,
): Promise<{ id: string; bytes: Buffer } | null> {
  const sb = await criarClienteServidor();

  /* Com id, e a marca que a pessoa escolheu na tela. Sem id, a mais antiga
     ativa — que e o comportamento de sempre e serve as orgs de uma marca so.
     O filtro de org nao entra aqui: a RLS de `marcas` ja recorta por org, e um
     id de outra agencia simplesmente nao devolve linha. */
  const consulta = sb.from("marcas").select("id, imagem_url").eq("ativa", true);
  const { data } = marcaId
    ? await consulta.eq("id", marcaId).maybeSingle()
    : await consulta.order("criado_em").limit(1).maybeSingle();

  if (!data) return null;

  const bytes = await baixar(BALDE.marcas, data.imagem_url).catch((e) => {
    console.error("[materiais] logo da marca não veio:", e);
    return null;
  });
  return bytes ? { id: data.id, bytes } : null;
}
