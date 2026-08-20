"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "./supabase/server";
import { criarClienteAdmin } from "./supabase/admin";
import { usuarioAtual } from "./dados";
import { produzirArte, SemReferencia } from "./gerar";
import { materiaisDaArte } from "./materiais";
import { paletaDoEscudo, type Paleta } from "./paleta";
import { BALDE, subir } from "./storage";
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
  /**
   * De quem e a arte e contra quem. A foto e os escudos nao trafegam por aqui:
   * o servidor busca pelos ids na hora de gerar, e o pedido guarda so a
   * referencia. `pedidos.foto_jogador_url` ficou de legado, dos pedidos
   * anteriores ao elenco.
   */
  jogador_id: z.string().uuid().nullish(),
  clube_id: z.string().uuid().nullish(),
  adversario_id: z.string().uuid().nullish(),
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
      jogador_id: p.data.jogador_id || null,
      clube_id: p.data.clube_id || null,
      adversario_id: p.data.adversario_id || null,
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
      "tipo, formato, nome_jogador, clube, frase, foto_jogador_url, jogador_id, clube_id, adversario_id, adversario, data_jogo, hora_jogo, campeonato, estadio",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (!pedido) return falha("Pedido não encontrado.");

  try {
    /**
     * A foto e os escudos voltam junto. Sem a foto o modelo inventa um jogador
     * generico — e uma arte com o rosto errado no perfil da agencia e pior que
     * arte nenhuma; sem os escudos ela sai com a cor de outro time. O pedido
     * guarda o caminho antigo da foto para os que nasceram antes do elenco.
     */
    const { foto, clubes } = await materiaisDaArte({
      jogador_id: pedido.jogador_id,
      clube_id: pedido.clube_id,
      adversario_id: pedido.adversario_id,
      foto_path: pedido.foto_jogador_url,
    });

    const arte = await produzirArte({
      foto,
      clubes,
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

const Atleta = z.object({
  id: z.string().uuid().nullish(),
  nome: z.string().min(2).max(60),
  clube_id: z.string().uuid().nullish(),
  posicao: z.string().max(40).nullish(),
});

/**
 * Cadastra ou atualiza um atleta da carteira.
 *
 * A foto chega como File e vai para o bucket privado antes da linha. Se o
 * upload falhar num cadastro novo, nada e gravado: atleta sem foto nao serve
 * para gerar arte, e melhor falhar na cara do usuario do que criar um registro
 * quebrado que ele so descobre na hora de usar.
 */
export async function salvarJogador(form: FormData): Promise<Resultado<{ id: string }>> {
  const p = Atleta.safeParse({
    id: form.get("id") || null,
    nome: form.get("nome"),
    clube_id: form.get("clube_id") || null,
    posicao: form.get("posicao") || null,
  });
  if (!p.success) return falha("Confira o nome do atleta: mínimo de dois caracteres.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const arquivo = form.get("foto");
  const temFoto = arquivo instanceof File && arquivo.size > 0;

  if (!p.data.id && !temFoto) return falha("Envie a foto do atleta.");

  let foto_url: string | null = null;
  if (temFoto) {
    try {
      const bytes = Buffer.from(await arquivo.arrayBuffer());
      foto_url = await subir(BALDE.fotos, bytes, arquivo.type || "image/jpeg", "jpg");
    } catch (e) {
      console.error("[salvarJogador] upload:", e);
      return falha("Não consegui enviar a foto. Tente de novo.");
    }
  }

  const sb = await criarClienteServidor();

  /**
   * O nome do clube fica copiado na linha do atleta.
   *
   * Duplicar dado costuma ser erro, mas aqui paga: e esse texto que sai escrito
   * na arte e que aparece na lista, e ler pelo join em toda tela custaria uma
   * consulta a mais para um dado que muda de ano em ano. Quem manda e o
   * clube_id; o texto so acompanha.
   */
  let clube: string | null = null;
  if (p.data.clube_id) {
    const { data: c } = await sb
      .from("clubes")
      .select("nome, nome_curto")
      .eq("id", p.data.clube_id)
      .maybeSingle();
    if (!c) return falha("Clube não encontrado. Cadastre-o em Clubes.");
    clube = c.nome_curto || c.nome;
  }

  if (p.data.id) {
    const campos: Record<string, unknown> = {
      nome: p.data.nome.trim(),
      clube_id: p.data.clube_id || null,
      clube,
      posicao: p.data.posicao?.trim() || null,
    };
    // sem foto nova, a antiga fica: editar o clube nao pode apagar o retrato
    if (foto_url) campos.foto_url = foto_url;

    const { data, error } = await sb.from("jogadores").update(campos).eq("id", p.data.id).select("id");
    if (error) return falha(`Não consegui salvar: ${error.message}`);
    if (!data?.length) return falha("Atleta não encontrado.");

    revalidatePath("/elenco");
    revalidatePath("/novo");
    return { ok: true, dados: { id: p.data.id } };
  }

  const { data, error } = await sb
    .from("jogadores")
    .insert({
      nome: p.data.nome.trim(),
      clube_id: p.data.clube_id || null,
      clube,
      posicao: p.data.posicao?.trim() || null,
      foto_url,
      criado_por: usuario.id,
    })
    .select("id")
    .single();

  if (error || !data) return falha(`Não consegui cadastrar: ${error?.message ?? "sem retorno"}`);

  revalidatePath("/elenco");
  revalidatePath("/novo");
  return { ok: true, dados: { id: data.id } };
}

/** Tira da lista de escolha sem apagar: pedido antigo aponta para ele. */
export async function arquivarJogador(id: string): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data, error } = await sb.from("jogadores").update({ ativo: false }).eq("id", id).select("id");
  if (error) return falha(`Não consegui arquivar: ${error.message}`);
  if (!data?.length) return falha("Atleta não encontrado.");

  revalidatePath("/elenco");
  revalidatePath("/novo");
  return { ok: true, dados: undefined };
}

const HEX = /^#?[0-9a-fA-F]{6}$/;

const ClubeEntrada = z.object({
  id: z.string().uuid().nullish(),
  nome: z.string().min(2).max(60),
  nome_curto: z.string().max(30).nullish(),
  /* correcao manual pelo seletor de cor; o normal e vir vazio e sair do escudo */
  cor_primaria: z.string().regex(HEX).nullish().or(z.literal("")),
  cor_secundaria: z.string().regex(HEX).nullish().or(z.literal("")),
});

/** Normaliza para "#RRGGBB", que e como o prompt vai citar a cor. */
function cor(v: unknown) {
  const t = typeof v === "string" ? v.trim() : "";
  if (!t || !HEX.test(t)) return null;
  return t.startsWith("#") ? t.toUpperCase() : `#${t.toUpperCase()}`;
}

/**
 * Cadastra ou atualiza um clube.
 *
 * O escudo vai para o bucket de referencias, nao para o de fotos: ele e ativo
 * da agencia, do mesmo lado do acervo, e nao conteudo enviado por pedido.
 *
 * As cores saem do proprio escudo. O formulario chegou a pedir dois hex, o que
 * era pedir o impossivel: quem esta cadastrando o Estoril nao sabe que o azul
 * dele e #0B4F9E, deixa em branco, e a arte sai com cor generica.
 */
export async function salvarClube(form: FormData): Promise<Resultado<{ id: string }>> {
  const p = ClubeEntrada.safeParse({
    id: form.get("id") || null,
    nome: form.get("nome"),
    nome_curto: form.get("nome_curto") || null,
    cor_primaria: form.get("cor_primaria") || null,
    cor_secundaria: form.get("cor_secundaria") || null,
  });
  if (!p.success) return falha("Confira o nome do clube: mínimo de dois caracteres.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const arquivo = form.get("escudo");
  const temEscudo = arquivo instanceof File && arquivo.size > 0;
  if (!p.data.id && !temEscudo) return falha("Envie o escudo do clube.");

  let escudo_url: string | null = null;
  let daImagem: Paleta = { primaria: null, secundaria: null };

  if (temEscudo) {
    try {
      const bytes = Buffer.from(await arquivo.arrayBuffer());
      escudo_url = await subir(BALDE.referencias, bytes, arquivo.type || "image/png");
      /* ler a paleta nao pode derrubar o cadastro: clube sem cor ainda serve */
      daImagem = await paletaDoEscudo(bytes).catch((e) => {
        console.error("[salvarClube] não li as cores do escudo:", e);
        return { primaria: null, secundaria: null };
      });
    } catch (e) {
      console.error("[salvarClube] upload:", e);
      return falha("Não consegui enviar o escudo. Tente de novo.");
    }
  }

  const campos: Record<string, unknown> = {
    nome: p.data.nome.trim(),
    nome_curto: p.data.nome_curto?.trim() || null,
  };
  if (escudo_url) campos.escudo_url = escudo_url;

  /**
   * Escudo novo redefine a paleta; sem escudo novo, vale a correcao manual.
   *
   * Nessa ordem porque o seletor de cor SEMPRE manda um valor, mesmo intocado.
   * Se o manual ganhasse sempre, trocar o escudo de um clube manteria as cores
   * do escudo antigo, e ninguem entenderia por que. A tela ajuda: enquanto ha um
   * escudo novo escolhido, ela esconde os seletores e avisa que as cores vem
   * dele.
   */
  const primaria = daImagem.primaria ?? cor(p.data.cor_primaria);
  const secundaria = daImagem.secundaria ?? cor(p.data.cor_secundaria);
  if (primaria) campos.cor_primaria = primaria;
  if (secundaria) campos.cor_secundaria = secundaria;

  const sb = await criarClienteServidor();

  if (p.data.id) {
    const { data, error } = await sb.from("clubes").update(campos).eq("id", p.data.id).select("id");
    if (error) return falha(`Não consegui salvar: ${error.message}`);
    if (!data?.length) return falha("Clube não encontrado.");
    revalidatePath("/clubes");
    revalidatePath("/novo");
    return { ok: true, dados: { id: p.data.id } };
  }

  const { data, error } = await sb
    .from("clubes")
    .insert({ ...campos, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data) return falha(`Não consegui cadastrar: ${error?.message ?? "sem retorno"}`);

  revalidatePath("/clubes");
  revalidatePath("/novo");
  return { ok: true, dados: { id: data.id } };
}

export async function arquivarClube(id: string): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data, error } = await sb.from("clubes").update({ ativo: false }).eq("id", id).select("id");
  if (error) return falha(`Não consegui arquivar: ${error.message}`);
  if (!data?.length) return falha("Clube não encontrado.");

  revalidatePath("/clubes");
  revalidatePath("/novo");
  return { ok: true, dados: undefined };
}

/**
 * Libera um e-mail a criar conta.
 *
 * Quem barra de verdade e o gatilho `exigir_convite()` em auth.users, nao esta
 * acao: conta criada pela API do Supabase, por OAuth ou pelo painel nao passa
 * por aqui, e uma checagem que so existe na aplicacao protege so a aplicacao.
 * Aqui a RLS decide quem pode convidar; o banco decide quem pode entrar.
 */
export async function convidar(form: FormData): Promise<Resultado<{ email: string }>> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const bruto = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(bruto)) return falha("Confira o e-mail digitado.");

  const sb = await criarClienteServidor();
  const { error } = await sb.from("convites").insert({ email: bruto, criado_por: usuario.id });

  if (error) {
    // chave primaria e o proprio e-mail: repetir nao e erro, ja esta liberado
    if (error.code === "23505") return { ok: true, dados: { email: bruto } };
    if (error.code === "42501") return falha("Só quem aprova pode convidar.");
    return falha(`Não consegui convidar: ${error.message}`);
  }

  revalidatePath("/equipe");
  return { ok: true, dados: { email: bruto } };
}

/** Tira o convite. Quem ja criou conta continua entrando: a conta e que vale. */
export async function retirarConvite(email: string): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { error } = await sb.from("convites").delete().eq("email", email.toLowerCase());
  if (error) return falha(`Não consegui retirar: ${error.message}`);

  revalidatePath("/equipe");
  return { ok: true, dados: undefined };
}
