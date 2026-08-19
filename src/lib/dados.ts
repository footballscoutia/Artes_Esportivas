import "server-only";
import { criarClienteServidor } from "./supabase/server";
import * as mock from "./mock";
import { BALDE, assinar, assinarVarios } from "./storage";
import type { Formato, Geracao, Pedido, Referencia, Tipo, Usuario } from "./types";

/**
 * Camada de leitura. Toda tela passa por aqui — nenhuma delas fala com o
 * Supabase direto.
 *
 * Sem chave no .env, cai no `src/lib/mock.ts`. Isso nao e sobra da fase 1: o
 * README promete que o projeto roda sem chave nenhuma, e quem clona o
 * repositorio para mexer no visual continua tendo tela cheia de dados.
 *
 * As funcoes viraram `async` — o unico ajuste que as telas sentiram foi ganhar
 * um `await`. As consultas usam o cliente de sessao, entao a RLS vale: cada um
 * ve o que o papel dele deixa, e nao ha filtro de permissao escrito em TS que
 * possa ser esquecido.
 */

const LIGADO = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** O banco usa uuid; os ids de mentira da fase 1 sao "p1". Evita erro 22P02. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function estourar(o: string, error: { message: string } | null) {
  if (error) throw new Error(`Falha ao ${o}: ${error.message}`);
}

/** O join devolve `{ nome }` ou null; PostgREST as vezes tipa como array. */
type Perfil = { nome: string } | { nome: string }[] | null;

function nome(p: Perfil): string | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0]?.nome ?? null) : p.nome;
}

const CAMPOS_PEDIDO =
  "*, autor:perfis!pedidos_criado_por_fkey(nome), aprovador:perfis!pedidos_aprovado_por_fkey(nome)";

type LinhaPedido = Omit<Pedido, "criado_por_nome" | "aprovado_por_nome"> & {
  autor: Perfil;
  aprovador: Perfil;
};

function montarPedido(l: LinhaPedido): Pedido {
  const { autor, aprovador, ...resto } = l;
  return {
    ...resto,
    criado_por_nome: nome(autor) ?? "—",
    aprovado_por_nome: nome(aprovador),
  };
}

export async function listarPedidos(): Promise<Pedido[]> {
  if (!LIGADO) return mock.listarPedidos();

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("pedidos")
    .select(CAMPOS_PEDIDO)
    .order("criado_em", { ascending: false });

  estourar("listar os pedidos", error);
  return (data ?? []).map((l) => montarPedido(l as unknown as LinhaPedido));
}

export async function buscarPedido(id: string): Promise<Pedido | null> {
  if (!LIGADO) return mock.buscarPedido(id);
  if (!UUID.test(id)) return null;

  const sb = await criarClienteServidor();
  const { data, error } = await sb.from("pedidos").select(CAMPOS_PEDIDO).eq("id", id).maybeSingle();

  estourar("buscar o pedido", error);
  return data ? montarPedido(data as unknown as LinhaPedido) : null;
}

export async function geracoesDoPedido(id: string): Promise<Geracao[]> {
  if (!LIGADO) return mock.geracoesDoPedido(id);
  if (!UUID.test(id)) return [];

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("geracoes")
    .select("*")
    .eq("pedido_id", id)
    .order("criado_em", { ascending: false });

  estourar("listar as gerações", error);

  // o banco guarda o caminho no bucket; a tela precisa de URL que o <img> abra
  const linhas = (data ?? []) as Geracao[];
  const urls = await assinarVarios(BALDE.geracoes, linhas.map((g) => g.imagem_url));
  return linhas.map((g, i) => ({ ...g, imagem_url: urls[i] }));
}

/**
 * A imagem mais recente de cada pedido, para as capas da fila.
 *
 * Existe para nao chamar `geracoesDoPedido` dentro do map da fila: com 40
 * pedidos aquilo vira 40 consultas em sequencia. Aqui e uma so, e o mais
 * recente de cada um vence porque a lista chega ordenada.
 */
export async function capasDosPedidos(ids: string[]): Promise<Record<string, string | null>> {
  if (ids.length === 0) return {};

  if (!LIGADO) {
    return Object.fromEntries(
      ids.map((id) => [id, mock.geracoesDoPedido(id)[0]?.imagem_url ?? null]),
    );
  }

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("geracoes")
    .select("pedido_id, imagem_url, criado_em")
    .in("pedido_id", ids)
    .order("criado_em", { ascending: false });

  estourar("buscar as capas", error);

  const maisRecente: Record<string, string | null> = {};
  for (const g of data ?? []) {
    if (!(g.pedido_id in maisRecente)) maisRecente[g.pedido_id] = g.imagem_url;
  }

  const chaves = Object.keys(maisRecente);
  const urls = await assinarVarios(BALDE.geracoes, chaves.map((k) => maisRecente[k]));
  return Object.fromEntries(chaves.map((k, i) => [k, urls[i]]));
}

/**
 * A referencia ativa daquela combinacao. So uma pode estar ativa por vez — o
 * indice unico `referencias_ativa_unica` garante isso no banco, entao aqui nao
 * precisa desempatar nada.
 */
export async function buscarReferencia(
  tipo: Tipo,
  formato: Formato,
): Promise<Referencia | null> {
  if (!LIGADO) return mock.buscarReferencia(tipo, formato);

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("referencias")
    .select("*")
    .eq("tipo", tipo)
    .eq("formato", formato)
    .eq("ativa", true)
    .maybeSingle();

  estourar("buscar a referência", error);
  if (!data) return null;
  const r = data as Referencia;
  return { ...r, imagem_url: await assinar(BALDE.referencias, r.imagem_url) };
}

export async function listarReferencias(): Promise<Referencia[]> {
  if (!LIGADO) return mock.REFERENCIAS;

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("referencias")
    .select("*")
    .order("tipo")
    .order("formato");

  estourar("listar as referências", error);
  const linhas = (data ?? []) as Referencia[];
  const urls = await assinarVarios(BALDE.referencias, linhas.map((r) => r.imagem_url));
  return linhas.map((r, i) => ({ ...r, imagem_url: urls[i] }));
}

/** Quem esta logado. `null` quando nao ha sessao — o proxy ja tratou disso. */
export async function usuarioAtual(): Promise<Usuario | null> {
  if (!LIGADO) return mock.USUARIO_ATUAL;

  const sb = await criarClienteServidor();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await sb
    .from("perfis")
    .select("nome, email, papel")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    // perfil recem-criado vem com nome vazio; o e-mail sempre serve de rotulo
    nome: perfil?.nome || (perfil?.email ?? user.email ?? "").split("@")[0],
    email: perfil?.email ?? user.email ?? "",
    papel: perfil?.papel ?? "submete",
  };
}
