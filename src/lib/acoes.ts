"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteServidor } from "./supabase/server";
import { criarClienteAdmin } from "./supabase/admin";
import { usuarioAtual } from "./dados";
import { compor } from "./compose";
import { produzirArte, SemReferencia } from "./gerar";
import { materiaisDaArte, marcaPadraoDaOrg, uniformeDaArte } from "./materiais";
import { paletaDoEscudo, type Paleta } from "./paleta";
import { normalizar } from "./padroes";
import { EsquemaOpcoes, OPCOES_PADRAO } from "@/video/template";
import { BALDE, baixar, subir } from "./storage";
import {
  POSICOES_LOGO,
  type Formato,
  type LogoModo,
  type PosicaoLogo,
  type Tipo,
} from "./types";

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
  /* O segundo lugar onde o modelo e chamado — e portanto o segundo lugar onde
     o saldo sai. A rota /api/gerar tem a mesma trava; sao dois caminhos, e
     travar so um deixaria a porta dos fundos aberta. */
  if (!usuario.podeGerar) {
    return falha("Esta conta ainda não está liberada para gerar arte.");
  }

  const sb = await criarClienteServidor();
  const { data: pedido } = await sb
    .from("pedidos")
    .select(
      "org_id, tipo, formato, nome_jogador, clube, frase, foto_jogador_url, jogador_id, clube_id, adversario_id, adversario, data_jogo, hora_jogo, campeonato, estadio",
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
    /**
     * "Gerar outra" repete a ESCOLHA de logo da tentativa anterior.
     *
     * Sem isto ela caia no padrao antigo — marca padrao, canto inferior
     * direito — e a segunda tentativa saia diferente da primeira em algo que
     * ninguem pediu para mudar. Quem clica "gerar outra" quer variar a arte,
     * nao a assinatura.
     */
    const { data: anterior } = await sb
      .from("geracoes")
      .select(
        "marca_id, logo_modo, posicao_logo, logo_cor, uniforme_id, escudo_modo, zona_texto, paleta, nome_clube",
      )
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const logoModo = (anterior?.logo_modo as LogoModo | null) ?? "ia";
    /* a coluna aceita 'nenhuma', que nao e um canto — normaliza aqui, uma vez,
       para o resto do fluxo so lidar com cantos de verdade */
    const cantoAnterior = anterior?.posicao_logo as string | null;
    const posicaoLogo: PosicaoLogo = POSICOES_LOGO.includes(cantoAnterior as PosicaoLogo)
      ? (cantoAnterior as PosicaoLogo)
      : "inferior-direito";

    /* Passa pela mesma fronteira do resto: geracao antiga, gravada antes das
       colunas existirem, cai nos defaults em vez de chegar nula ao prompt. */
    const opcoes = normalizar({
      escudo: anterior?.escudo_modo,
      zonaTexto: anterior?.zona_texto,
      paleta: anterior?.paleta,
      nomeClube: anterior?.nome_clube,
    });

    const [{ foto, clubes }, marca] = await Promise.all([
      materiaisDaArte({
        jogador_id: pedido.jogador_id,
        clube_id: pedido.clube_id,
        adversario_id: pedido.adversario_id,
        foto_path: pedido.foto_jogador_url,
      }),
      logoModo === "nenhuma" ? null : marcaPadraoDaOrg(anterior?.marca_id ?? null),
    ]);

    const arte = await produzirArte({
      foto,
      clubes,
      tipo: pedido.tipo as Tipo,
      formato: pedido.formato as Formato,
      nome: pedido.nome_jogador,
      clube: opcoes.nomeClube ? pedido.clube : null,
      frase: pedido.frase,
      adversario: pedido.adversario,
      data_jogo: pedido.data_jogo,
      hora_jogo: pedido.hora_jogo,
      campeonato: pedido.campeonato,
      estadio: pedido.estadio,
      marcaLogo: marca?.bytes ?? null,
      logoModo,
      posicaoLogo,
      logoCor: anterior?.logo_cor ?? null,
      uniforme: await uniformeDaArte(anterior?.uniforme_id ?? null),
      /* Mesma razao da logo logo acima: quem clica "gerar outra" quer variar a
         ARTE, nao as escolhas. Sem isto a segunda tentativa voltaria aos
         defaults e mudaria escudo, faixa e paleta sem ninguem ter pedido. */
      opcoes,
    });

    const { error } = await criarClienteAdmin().from("geracoes").insert({
      pedido_id: pedidoId,
      org_id: pedido.org_id,
      imagem_url: arte.arte_path,
      fundo_url: arte.fundo_path,
      modelo: arte.modelo,
      provider: arte.provider,
      custo_usd: arte.custo_usd,
      duracao_ms: arte.duracao_ms,
      marca_id: marca?.id ?? null,
      logo_modo: marca ? logoModo : "nenhuma",
      posicao_logo: marca && logoModo === "carimbo" ? posicaoLogo : "nenhuma",
      logo_cor: marca ? (anterior?.logo_cor ?? null) : null,
      uniforme_id: anterior?.uniforme_id ?? null,
      escudo_modo: opcoes.escudo,
      zona_texto: opcoes.zonaTexto,
      paleta: opcoes.paleta,
      nome_clube: opcoes.nomeClube,
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

const Recompor = z.object({
  pedido_id: z.string().uuid(),
  /** De qual geração vem o fundo — normalmente a mais recente. */
  geracao_id: z.string().uuid(),
  marca_id: z.string().uuid().nullish(),
  posicao_logo: z.enum(POSICOES_LOGO).nullish(),
});

/**
 * Troca a logo ou o canto sem gastar geração nova.
 *
 * O modelo so e chamado uma vez; daqui pra frente, trocar canto e recompor
 * `fundo_url` — a imagem crua, sem nenhuma camada de codigo — com uma logo e
 * posicao diferentes. Custa uma composicao local, nao uma chamada de API.
 *
 * Vira uma geracao NOVA na lista, do mesmo jeito que "gerar outra": o
 * historico continua contando a verdade de cada tentativa, e o `custo_usd`
 * zerado ja mostra na tela que essa troca não pesou na conta.
 */
export async function recompor(entrada: unknown): Promise<Resultado> {
  const p = Recompor.safeParse(entrada);
  if (!p.success) return falha("Dados inválidos.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();

  const [{ data: geracao }, { data: pedido }] = await Promise.all([
    sb
      .from("geracoes")
      .select("fundo_url, modelo, org_id, logo_modo")
      .eq("id", p.data.geracao_id)
      .eq("pedido_id", p.data.pedido_id)
      .maybeSingle(),
    sb.from("pedidos").select("formato").eq("id", p.data.pedido_id).maybeSingle(),
  ]);

  if (!geracao?.fundo_url) return falha("Não achei o fundo desta geração para recompor.");

  /**
   * Logo desenhada pelo modelo nao se move.
   *
   * Recompor existe porque a logo era CAMADA: o fundo guardado nao tinha logo
   * nenhuma, entao trocar de canto era colar de novo, de graca. No modo `ia` a
   * logo esta nos pixels do fundo — mover exigiria apagar e repintar, ou seja,
   * uma geracao nova, que custa. Dizer isso e melhor que devolver uma arte com
   * a logo duas vezes, que e o que aconteceria em silencio.
   */
  if (geracao.logo_modo === "ia") {
    return falha(
      "Nesta arte a logo foi posicionada pela IA, então ela faz parte da imagem e não dá para movê-la. Gere outra escolhendo \"Canto fixo\" se quiser controlar o lugar.",
    );
  }
  if (!pedido) return falha("Pedido não encontrado.");

  try {
    const fundo = await baixar(BALDE.geracoes, geracao.fundo_url);

    let logo: Buffer | null = null;
    if (p.data.marca_id) {
      const { data: marca } = await sb
        .from("marcas")
        .select("imagem_url")
        .eq("id", p.data.marca_id)
        .maybeSingle();
      if (marca) logo = await baixar(BALDE.marcas, marca.imagem_url).catch(() => null);
    }

    const posicao: PosicaoLogo = p.data.posicao_logo ?? "inferior-direito";
    const final = await compor({
      fundo,
      formato: pedido.formato as Formato,
      logo,
      posicaoLogo: posicao,
    });
    const arte_path = await subir(BALDE.geracoes, final, "image/jpeg", "jpg");

    const { error } = await criarClienteAdmin().from("geracoes").insert({
      pedido_id: p.data.pedido_id,
      org_id: geracao.org_id,
      imagem_url: arte_path,
      fundo_url: geracao.fundo_url,
      modelo: geracao.modelo,
      provider: "recomposicao",
      custo_usd: 0,
      duracao_ms: 0,
      marca_id: logo ? p.data.marca_id : null,
      posicao_logo: logo ? posicao : "nenhuma",
    });
    if (error) return falha(`Recompus mas não consegui gravar: ${error.message}`);

    revalidatePath(`/pedido/${p.data.pedido_id}`);
    return { ok: true, dados: undefined };
  } catch (e) {
    console.error("[recompor]", e);
    return falha("Falha ao recompor a arte. Tente de novo.");
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
 * Liga e desliga a liberacao de gerar arte de uma conta.
 *
 * Quem decide de verdade e a funcao `liberar_geracao()` no banco: ela recusa
 * quem nao e administrador da plataforma e so deixa a coluna `pode_gerar` se
 * mover. Se a checagem morasse aqui, valeria so para quem passa por esta acao
 * — e a API do Supabase esta aberta para qualquer sessao.
 */
export async function liberarGeracao(perfilId: string, pode: boolean): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { error } = await sb.rpc("liberar_geracao", { p_perfil: perfilId, p_pode: pode });

  if (error) {
    if (error.code === "42501") return falha("Só quem administra o MatchPost libera geração.");
    return falha(`Não consegui salvar: ${error.message}`);
  }

  revalidatePath("/conta");
  return { ok: true, dados: undefined };
}

/**
 * Encerra a sessao.
 *
 * Acao de servidor, e nao `signOut()` no navegador, porque quem guarda a
 * sessao e um cookie httpOnly: o cliente do navegador limpa o que enxerga e o
 * servidor continua respondendo logado ate o cookie vencer. Sair pela metade e
 * pior que nao sair, porque parece que saiu.
 *
 * O `redirect` fica aqui dentro para nao existir o intervalo em que a sessao
 * ja morreu e a tela ainda mostra a biblioteca.
 */
export async function sair(): Promise<void> {
  const sb = await criarClienteServidor();
  await sb.auth.signOut();
  redirect("/login");
}

/**
 * Pede o link de recuperacao de senha.
 *
 * Roda no servidor, e nao pelo cliente do navegador, por causa do PKCE. O
 * `resetPasswordForEmail` do `@supabase/ssr` guarda um verificador em cookie e
 * manda um link `?code=`, que so vale no MESMO navegador que pediu — quem abre
 * o e-mail no aplicativo do celular cai noutro navegador, o cookie nao esta la,
 * e o link morre sem explicacao.
 *
 * Chamado daqui nao ha verificador nenhum, entao o Supabase manda o formato
 * antigo, com a sessao na propria URL. Esse funciona em qualquer navegador.
 *
 * Responde igual para e-mail que existe e para e-mail que nao existe: dizer
 * "essa conta nao existe" transforma a tela de entrada num confirmador de quem
 * trabalha na agencia, para quem quiser ficar testando enderecos.
 */
export async function pedirRecuperacao(email: string, origem: string): Promise<Resultado> {
  const alvo = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(alvo)) return falha("Confira o e-mail digitado.");

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !chave) return falha("Supabase não configurado.");

  /**
   * O destino vai na QUERY, nao no corpo — o endpoint le `redirect_to` de la.
   *
   * A origem chega da tela para o link voltar para o mesmo endereco de onde
   * foi pedido (producao, preview ou localhost). Nao e um buraco: o Supabase
   * so aceita destino que esteja na lista de URLs permitidas do projeto, e
   * ignora qualquer outro.
   */
  const url = new URL(`${base}/auth/v1/recover`);
  if (/^https?:\/\//.test(origem)) {
    url.searchParams.set("redirect_to", `${origem.replace(/\/$/, "")}/nova-senha`);
  }

  const r = await fetch(url, {
    method: "POST",
    headers: { apikey: chave, "Content-Type": "application/json" },
    body: JSON.stringify({ email: alvo }),
  });

  if (r.status === 429) return falha("Muitos pedidos seguidos. Espere alguns minutos e tente de novo.");
  if (!r.ok) {
    const corpo = await r.text();
    console.error("[pedirRecuperacao]", r.status, corpo.slice(0, 300));
    return falha("Não consegui enviar agora. Tente de novo em alguns minutos.");
  }
  return { ok: true, dados: undefined };
}

/**
 * Cadastra ou renomeia uma marca.
 *
 * Ate aqui a unica logo do sistema tinha entrado por script — nao havia tela,
 * e "cadastrar a logo do cliente" significava abrir o terminal. Uma tarefa
 * assim ou nao acontece, ou acontece errado.
 *
 * A imagem vai para o bucket privado `marcas`, lido so por URL assinada. PNG
 * com transparencia e o que funciona: no carimbo, fundo branco vira retangulo
 * branco sobre a arte; no modo IA, o modelo copia o retangulo tambem.
 */
export async function salvarMarca(form: FormData): Promise<Resultado<{ id: string }>> {
  const id = (form.get("id") as string) || null;
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return falha("Dê um nome à marca — o do cliente serve.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const arquivo = form.get("imagem");
  const temImagem = arquivo instanceof File && arquivo.size > 0;
  if (!id && !temImagem) return falha("Envie a imagem da logo.");

  const campos: Record<string, unknown> = { nome };

  if (temImagem) {
    try {
      const bytes = Buffer.from(await arquivo.arrayBuffer());
      campos.imagem_url = await subir(BALDE.marcas, bytes, arquivo.type || "image/png");
    } catch (e) {
      console.error("[salvarMarca] upload:", e);
      return falha("Não consegui enviar a logo. Tente de novo.");
    }
  }

  const sb = await criarClienteServidor();

  if (id) {
    const { data, error } = await sb.from("marcas").update(campos).eq("id", id).select("id");
    if (error) return falha(`Não consegui salvar: ${error.message}`);
    if (!data?.length) return falha("Marca não encontrada.");
    revalidatePath("/marcas");
    revalidatePath("/novo");
    return { ok: true, dados: { id } };
  }

  const { data, error } = await sb
    .from("marcas")
    .insert({ ...campos, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data) return falha(`Não consegui cadastrar: ${error?.message ?? "sem retorno"}`);

  revalidatePath("/marcas");
  revalidatePath("/novo");
  return { ok: true, dados: { id: data.id } };
}

/** Tira da escolha sem apagar: geracao antiga aponta para esta linha. */
export async function arquivarMarca(id: string): Promise<Resultado> {
  const sb = await criarClienteServidor();
  const { data, error } = await sb.from("marcas").update({ ativa: false }).eq("id", id).select("id");
  if (error) return falha(`Não consegui arquivar: ${error.message}`);
  if (!data?.length) return falha("Marca não encontrada.");
  revalidatePath("/marcas");
  revalidatePath("/novo");
  return { ok: true, dados: undefined };
}

/**
 * Cadastra ou renomeia um uniforme.
 *
 * A foto e de ALGUEM VESTINDO, e nao mockup da camisa: o modelo precisa ver
 * como o tecido cai no corpo. Mockup chapado produz camisa chapada.
 */
export async function salvarUniforme(form: FormData): Promise<Resultado<{ id: string }>> {
  const id = (form.get("id") as string) || null;
  const clubeId = (form.get("clube_id") as string) || null;
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return falha("Dê um nome ao uniforme — \"Titular 2026\" já serve.");
  if (!id && !clubeId) return falha("Escolha de qual clube é este uniforme.");

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const arquivo = form.get("imagem");
  const temImagem = arquivo instanceof File && arquivo.size > 0;
  if (!id && !temImagem) return falha("Envie a foto do uniforme.");

  const campos: Record<string, unknown> = { nome };
  if (clubeId) campos.clube_id = clubeId;

  if (temImagem) {
    try {
      const bytes = Buffer.from(await arquivo.arrayBuffer());
      campos.imagem_url = await subir(BALDE.uniformes, bytes, arquivo.type || "image/jpeg", "jpg");
    } catch (e) {
      console.error("[salvarUniforme] upload:", e);
      return falha("Não consegui enviar a foto. Tente de novo.");
    }
  }

  const sb = await criarClienteServidor();

  if (id) {
    const { data, error } = await sb.from("uniformes").update(campos).eq("id", id).select("id");
    if (error) return falha(`Não consegui salvar: ${error.message}`);
    if (!data?.length) return falha("Uniforme não encontrado.");
    revalidatePath("/uniformes");
    revalidatePath("/novo");
    return { ok: true, dados: { id } };
  }

  const { data, error } = await sb
    .from("uniformes")
    .insert({ ...campos, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data) return falha(`Não consegui cadastrar: ${error?.message ?? "sem retorno"}`);

  revalidatePath("/uniformes");
  revalidatePath("/novo");
  return { ok: true, dados: { id: data.id } };
}

/** Tira da escolha sem apagar: geracao antiga aponta para esta linha. */
export async function arquivarUniforme(id: string): Promise<Resultado> {
  const sb = await criarClienteServidor();
  const { data, error } = await sb.from("uniformes").update({ ativo: false }).eq("id", id).select("id");
  if (error) return falha(`Não consegui arquivar: ${error.message}`);
  if (!data?.length) return falha("Uniforme não encontrado.");
  revalidatePath("/uniformes");
  revalidatePath("/novo");
  return { ok: true, dados: undefined };
}

/**
 * Salva uma combinacao de escolhas com nome, para ela se repetir.
 *
 * O valor nao esta em digitar menos: esta em a MESMA combinacao voltar. Arranjo
 * novo a cada arte e a maior fonte de variancia do resultado, e a personalizacao
 * sozinha pioraria isso — cada opcao nova multiplica combinacoes que ninguem
 * testou. O padrao salvo desfaz esse custo: na pratica a agencia usa tres ou
 * quatro arranjos, nao todos os possiveis.
 */
export async function salvarPadrao(form: FormData): Promise<Resultado<{ id: string }>> {
  const id = (form.get("id") as string) || null;
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return falha('Dê um nome ao padrão — "Matchday limpo" já serve.');

  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  /* Passa pela mesma fronteira do resto: valor desconhecido vira o default, em
     vez de chegar cru ao banco e so falhar la na frente, na hora de gerar. */
  const opcoes = normalizar({
    escudo: form.get("escudo_modo"),
    zonaTexto: form.get("zona_texto"),
    paleta: form.get("paleta"),
    nomeClube: form.get("nome_clube"),
  });

  /* Tipo vazio = serve para qualquer arte. Guardar "" viraria um tipo chamado
     string vazia, que nunca casa com nada e some da lista sem explicar. */
  const tipo = String(form.get("tipo") ?? "").trim() || null;

  const sb = await criarClienteServidor();

  if (id) {
    const { data, error } = await sb
      .from("padroes")
      .update({ nome, tipo, opcoes })
      .eq("id", id)
      .select("id");
    if (error) return falha(`Não consegui salvar: ${error.message}`);
    if (!data?.length) return falha("Padrão não encontrado.");
    revalidatePath("/novo");
    return { ok: true, dados: { id } };
  }

  const { data, error } = await sb
    .from("padroes")
    .insert({ nome, tipo, opcoes, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data) return falha(`Não consegui cadastrar: ${error?.message ?? "sem retorno"}`);

  revalidatePath("/novo");
  return { ok: true, dados: { id: data.id } };
}

export async function apagarPadrao(id: string): Promise<Resultado> {
  const sb = await criarClienteServidor();
  const { error } = await sb.from("padroes").delete().eq("id", id);
  if (error) return falha(`Não consegui apagar: ${error.message}`);
  revalidatePath("/novo");
  return { ok: true, dados: undefined };
}

/**
 * Grava as escolhas do editor de video.
 *
 * So as OPCOES: `fundo_url` e `atleta_url` sao o que custou geracao e nao mudam
 * nunca — regerar camadas cria um video novo, e nao uma edicao deste. Deixar a
 * acao encostar nelas seria abrir caminho para uma edicao apagar material pago.
 */
export async function salvarVideo(id: string, opcoes: unknown): Promise<Resultado> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre de novo.");

  const sb = await criarClienteServidor();
  const { data, error } = await sb
    .from("videos")
    .update({ opcoes: normalizarOpcoesDeVideo(opcoes), atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) return falha(`Não consegui salvar: ${error.message}`);
  if (!data?.length) return falha("Vídeo não encontrado.");

  revalidatePath(`/video/${id}`);
  return { ok: true, dados: undefined };
}

/**
 * Fronteira do documento do editor.
 *
 * O `EsquemaMatchday` valida o conjunto inteiro — dados, camadas e opcoes —, e
 * aqui so as opcoes atravessam. Valor fora de faixa cai no padrao em vez de ir
 * para o banco: um `duracao: 0` gravado hoje viraria um video de zero quadro
 * meses depois, longe de quem o digitou.
 */
function normalizarOpcoesDeVideo(cru: unknown) {
  const r = EsquemaOpcoes.safeParse(cru);
  return r.success ? r.data : OPCOES_PADRAO;
}
