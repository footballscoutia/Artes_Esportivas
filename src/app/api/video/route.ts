import { NextResponse } from "next/server";
import { z } from "zod";
import { GenError } from "@/lib/ai";
import { produzirCamadas } from "@/lib/camadas";
import { usuarioAtual } from "@/lib/dados";
import { materiaisDaArte, uniformeDaArte } from "@/lib/materiais";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TIPOS } from "@/lib/types";
import { EsquemaOpcoes, OPCOES_PADRAO } from "@/video/template";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Dois caminhos de entrada, um destino.
 *
 * `pedido_id` = video a partir de uma arte que ja existe, herdando atleta,
 * confronto e datas dela. `dados` = video do zero, e ai o pedido nasce AQUI.
 *
 * O pedido nasce nos dois casos porque e ele que guarda o texto — nome,
 * confronto, data, estadio. O video so aponta para ele. Guardar esses campos
 * tambem em `videos` criaria duas verdades sobre o mesmo jogo, e um dia elas
 * discordariam.
 */
const Dados = z.object({
  tipo: z.enum(TIPOS),
  nome: z.string().min(2).max(60),
  clube: z.string().max(60).optional().nullable(),
  adversario: z.string().max(60).optional().nullable(),
  data_jogo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  hora_jogo: z.string().max(20).optional().nullable(),
  campeonato: z.string().max(80).optional().nullable(),
  estadio: z.string().max(80).optional().nullable(),
  jogador_id: z.string().uuid().optional().nullable(),
  clube_id: z.string().uuid().optional().nullable(),
  adversario_id: z.string().uuid().optional().nullable(),
  /* Insumo da camada do atleta: precisa ser decidido ANTES de gerar, porque
     depois o atleta ja esta desenhado vestindo o que vestiu. */
  uniforme_id: z.string().uuid().optional().nullable(),
  /* Nao entra na geracao: so assina o video, no canto e na intro. */
  marca_id: z.string().uuid().optional().nullable(),
});

const Corpo = z
  .object({
    pedido_id: z.string().uuid().optional(),
    dados: Dados.optional(),
    /* As escolhas feitas ANTES de gerar. Ausentes = padrao, para quem chamar a
       rota sem passar pela tela continuar funcionando. */
    opcoes: EsquemaOpcoes.optional(),
  })
  .refine((c) => Boolean(c.pedido_id) !== Boolean(c.dados), {
    message: "Informe um pedido existente OU os dados de um novo — nunca os dois.",
  });

/**
 * Produz as CAMADAS de um video a partir de um pedido, e registra o video.
 *
 * Nao renderiza nada. Aqui sai o dinheiro — duas geracoes —, e o que se guarda
 * e o material caro; a montagem em si acontece no navegador, no editor, e nao
 * custa nada por iteracao. Separar os dois passos e o que torna "nao gostei,
 * deixa eu ajustar" gratuito.
 *
 * Fica FORA do matcher do proxy, como a /api/gerar: ela responde a fetch, e um
 * 307 para /login viraria HTML no lugar do JSON que a tela espera. O preco e
 * que a checagem de sessao mora aqui dentro.
 */
export async function POST(req: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  /* A mesma trava da /api/gerar, pelo mesmo motivo: cadastro e aberto, e este
     endpoint gasta DOIS creditos por chamada em vez de um. Esconder o botao na
     tela nao protegeria nada — quem chama por fetch nunca ve tela. */
  if (!usuario.podeGerar) {
    return NextResponse.json(
      { erro: "Esta conta ainda não está liberada para gerar. Fale com quem administra o MatchPost." },
      { status: 403 },
    );
  }

  const corpo = Corpo.safeParse(await req.json().catch(() => ({})));
  if (!corpo.success) {
    return NextResponse.json(
      { erro: corpo.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const sb = await criarClienteServidor();
  const COLUNAS = "id, org_id, clube, jogador_id, clube_id, adversario_id, tipo, formato";

  /**
   * Do zero, o pedido nasce aqui — e nasce `rascunho`, exatamente como o da
   * arte parada. Cliente de SESSAO, para o `org_id` se preencher sozinho pelo
   * default `minha_org()`: o cliente admin nao tem sessao e deixaria a coluna
   * nula, jogando o pedido para fora da RLS de quem o criou.
   *
   * O formato e sempre `story_9x16`. Video de rede social nao existe em 4:5, e
   * oferecer a escolha seria oferecer um caminho que so leva a erro.
   */
  const { data: pedido } = corpo.data.pedido_id
    ? await sb.from("pedidos").select(COLUNAS).eq("id", corpo.data.pedido_id).maybeSingle()
    : await sb
        .from("pedidos")
        .insert({
          tipo: corpo.data.dados!.tipo,
          formato: "story_9x16",
          nome_jogador: corpo.data.dados!.nome,
          clube: corpo.data.dados!.clube || null,
          adversario: corpo.data.dados!.adversario || null,
          data_jogo: corpo.data.dados!.data_jogo || null,
          hora_jogo: corpo.data.dados!.hora_jogo || null,
          campeonato: corpo.data.dados!.campeonato || null,
          estadio: corpo.data.dados!.estadio || null,
          jogador_id: corpo.data.dados!.jogador_id || null,
          clube_id: corpo.data.dados!.clube_id || null,
          adversario_id: corpo.data.dados!.adversario_id || null,
          status: "rascunho",
          criado_por: usuario.id,
        })
        .select(COLUNAS)
        .single();

  if (!pedido) return NextResponse.json({ erro: "Não consegui preparar o pedido." }, { status: 404 });

  /**
   * O uniforme escolhido vence o "primeiro ativo do clube".
   *
   * A queda para o primeiro ativo continua existindo para o atalho a partir de
   * uma arte, onde ninguem escolheu nada — mas ela e queda, e nao regra: com
   * dois uniformes cadastrados, escolher o errado veste o atleta de outra
   * temporada e ninguem confere.
   */
  const [{ data: clube }, { data: uniformePadrao }] = await Promise.all([
    sb
      .from("clubes")
      .select("nome, nome_curto, cor_primaria, cor_secundaria")
      .eq("id", pedido.clube_id)
      .maybeSingle(),
    sb
      .from("uniformes")
      .select("id")
      .eq("clube_id", pedido.clube_id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
  ]);
  const uniformeId = corpo.data.dados?.uniforme_id ?? uniformePadrao?.id ?? null;

  try {
    const { foto, referencia } = await materiaisDoVideo(pedido);

    const camadas = await produzirCamadas({
      referencia,
      foto,
      uniforme: await uniformeDaArte(uniformeId),
      clube: clube?.nome ?? pedido.clube ?? "clube",
      cores: [clube?.cor_primaria, clube?.cor_secundaria].filter(Boolean).join(" e "),
    });

    /* Cliente ADMIN porque `videos` nao da insert para `authenticated`: quem
       cria video e o servidor, depois que o modelo respondeu. */
    const { data: video, error } = await criarClienteAdmin()
      .from("videos")
      .insert({
        pedido_id: pedido.id,
        org_id: pedido.org_id,
        fundo_url: camadas.fundo_path,
        atleta_url: camadas.atleta_path,
        /**
         * O TIPO vem do PEDIDO, e vence o que veio nas opcoes.
         *
         * E ele que escolhe o roteiro de linhas da composicao. Pelo atalho da
         * biblioteca, o painel de perguntas nao pergunta o tipo — a arte ja
         * existe e ja tem um —, entao as opcoes chegavam com o "matchday" do
         * padrao. Um pedido de gol virava video com campeonato, adversario e
         * data: o roteiro errado, montado sem erro nenhum.
         *
         * Pelo caminho do zero as duas fontes concordam, e sobrescrever com a
         * mesma coisa nao muda nada.
         */
        opcoes: { ...(corpo.data.opcoes ?? OPCOES_PADRAO), tipo: pedido.tipo },
        marca_id: corpo.data.dados?.marca_id ?? null,
        custo_usd: camadas.custo_usd,
        criado_por: usuario.id,
      })
      .select("id")
      .single();

    if (error || !video) {
      return NextResponse.json(
        { erro: `Gerei as camadas mas não consegui gravar: ${error?.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ video_id: video.id, custo_usd: camadas.custo_usd });
  } catch (e) {
    const msg =
      e instanceof GenError
        ? e.message
        : "Falha ao gerar as camadas. Tente de novo — se repetir, confira a chave da API.";
    console.error("[video]", e);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}

/**
 * A foto do atleta e a referencia de estilo, que e a unica coisa que este
 * caminho pede diferente da arte parada: sempre em `story_9x16`, porque video
 * de rede social nao existe em 4:5.
 */
async function materiaisDoVideo(pedido: {
  tipo: string;
  jogador_id: string | null;
  clube_id: string | null;
  adversario_id: string | null;
}) {
  const sb = await criarClienteServidor();
  const [{ foto }, { data: ref }] = await Promise.all([
    materiaisDaArte({
      jogador_id: pedido.jogador_id,
      clube_id: pedido.clube_id,
      adversario_id: pedido.adversario_id,
    }),
    sb
      .from("referencias")
      .select("imagem_url")
      .eq("tipo", pedido.tipo)
      .eq("formato", "story_9x16")
      .eq("ativa", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const { baixar } = await import("@/lib/storage");
  const { BALDE } = await import("@/lib/storage");
  const referencia = ref?.imagem_url ? await baixar(BALDE.referencias, ref.imagem_url) : null;

  return { foto, referencia };
}
