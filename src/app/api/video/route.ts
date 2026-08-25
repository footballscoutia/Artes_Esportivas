import { NextResponse } from "next/server";
import { z } from "zod";
import { GenError } from "@/lib/ai";
import { produzirCamadas } from "@/lib/camadas";
import { usuarioAtual } from "@/lib/dados";
import { materiaisDaArte, uniformeDaArte } from "@/lib/materiais";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { OPCOES_PADRAO } from "@/video/template";

export const runtime = "nodejs";
export const maxDuration = 180;

const Corpo = z.object({ pedido_id: z.string().uuid() });

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
    return NextResponse.json({ erro: "Informe o pedido." }, { status: 400 });
  }

  const sb = await criarClienteServidor();
  const { data: pedido } = await sb
    .from("pedidos")
    .select("id, org_id, clube, jogador_id, clube_id, adversario_id, tipo, formato")
    .eq("id", corpo.data.pedido_id)
    .maybeSingle();

  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const [{ data: clube }, { data: uniforme }] = await Promise.all([
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

  try {
    const { foto, referencia } = await materiaisDoVideo(pedido);

    const camadas = await produzirCamadas({
      referencia,
      foto,
      uniforme: await uniformeDaArte(uniforme?.id ?? null),
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
        opcoes: OPCOES_PADRAO,
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
