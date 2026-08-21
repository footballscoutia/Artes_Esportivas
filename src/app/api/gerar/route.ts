import { NextResponse } from "next/server";
import { z } from "zod";
import { GenError } from "@/lib/ai";
import { usuarioAtual } from "@/lib/dados";
import { produzirArte, SemReferencia } from "@/lib/gerar";
import { materiaisDaArte, marcaPadraoDaOrg } from "@/lib/materiais";
import { BALDE, assinar } from "@/lib/storage";
import { TIPOS, FORMATOS, type Formato, type Tipo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Corpo = z.object({
  tipo: z.enum(TIPOS),
  formato: z.enum(FORMATOS),
  nome: z.string().min(2).max(60),
  clube: z.string().max(60).optional().nullable(),
  frase: z.string().max(180).optional().nullable(),
  adversario: z.string().max(60).optional().nullable(),
  data_jogo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  hora_jogo: z.string().max(20).optional().nullable(),
  campeonato: z.string().max(80).optional().nullable(),
  estadio: z.string().max(80).optional().nullable(),
  /* o atleta e os clubes vem do cadastro: o modelo recebe foto e escudos */
  jogador_id: z.string().uuid().optional().nullable(),
  clube_id: z.string().uuid().optional().nullable(),
  adversario_id: z.string().uuid().optional().nullable(),
});

/**
 * Previa: gera a arte e devolve para o /novo mostrar, ANTES de o pedido existir.
 * Quem grava no banco e a acao `criarPedido`, no "Enviar para aprovacao".
 */
export async function POST(req: Request) {
  /**
   * Esta rota fica FORA do matcher do proxy — ela responde a fetch, e um 307
   * para /login viraria HTML no lugar do JSON que a tela espera. O preco disso
   * e que a checagem de sessao tem que morar aqui dentro.
   *
   * Sem ela, a rota so nao gerava arte para estranho por efeito colateral: a
   * RLS escondia as referencias e a busca voltava nula, produzindo um 409 que
   * dizia "cadastre em Referencias" para quem, na verdade, nem estava logado.
   * Protecao por acidente, e mentirosa. Afrouxar a policy de `referencias` um
   * dia abriria um endpoint de geracao de imagem para a internet inteira —
   * com IMAGE_PROVIDER=gemini, isso e a fatura da agencia.
   */
  const usuario = await usuarioAtual();
  if (!usuario) {
    return NextResponse.json(
      { erro: "Sessão expirada. Entre de novo para gerar arte." },
      { status: 401 },
    );
  }

  /**
   * A trava do saldo, no ponto onde o dinheiro sai.
   *
   * Cadastro e aberto: qualquer pessoa cria conta em segundos. Sem esta linha,
   * criar conta e chamar o modelo sao a mesma coisa, e a fatura e de quem
   * mantem a chave. Esconder o botao na tela nao resolveria nada — quem chama
   * esta rota por fetch nunca ve tela.
   *
   * 403 e nao 401 de proposito: a sessao esta boa, a conta e que nao tem
   * liberacao. Mandar para o login faria a pessoa tentar de novo achando que
   * era senha.
   */
  if (!usuario.podeGerar) {
    return NextResponse.json(
      {
        erro: "Esta conta ainda não está liberada para gerar arte. Fale com quem administra o MatchPost.",
      },
      { status: 403 },
    );
  }

  const form = await req.formData();

  const parsed = Corpo.safeParse({
    tipo: form.get("tipo"),
    formato: form.get("formato"),
    nome: form.get("nome"),
    clube: form.get("clube") || null,
    frase: form.get("frase") || null,
    adversario: form.get("adversario") || null,
    data_jogo: form.get("data_jogo") || null,
    hora_jogo: form.get("hora_jogo") || null,
    campeonato: form.get("campeonato") || null,
    estadio: form.get("estadio") || null,
    jogador_id: form.get("jogador_id") || null,
    clube_id: form.get("clube_id") || null,
    adversario_id: form.get("adversario_id") || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados do pedido inválidos", detalhe: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { tipo, formato, nome, clube, frase, jogador_id, clube_id, adversario_id, ...jogo } =
    parsed.data;

  /**
   * A foto e os escudos vem do cadastro, nao do formulario. Foi a mudanca que
   * tirou o upload de toda geracao: o atleta ja esta no elenco com a foto boa,
   * e repetir o upload semanal era a chance de subir a foto ruim.
   */
  const [{ foto, clubes }, marca] = await Promise.all([
    materiaisDaArte({ jogador_id, clube_id, adversario_id }),
    marcaPadraoDaOrg(),
  ]);

  try {
    /**
     * A foto sobe mesmo que o usuario desista de enviar para aprovacao. O custo
     * e arquivo orfao; a alternativa seria carregar o binario de volta pelo
     * navegador na hora de salvar, o que e bem pior.
     */
    const arte = await produzirArte({
      tipo: tipo as Tipo,
      formato: formato as Formato,
      nome,
      clube,
      frase,
      foto,
      clubes,
      marcaLogo: marca?.bytes ?? null,
      ...jogo,
    });

    return NextResponse.json({
      // URL assinada, com validade curta — os buckets sao privados
      imagem: await assinar(BALDE.geracoes, arte.arte_path),
      ...arte,
      // a org ainda pode nao ter cadastrado marca nenhuma: nulo e valido
      marca_id: marca?.id ?? null,
      posicao_logo: marca ? "inferior-direito" : "nenhuma",
    });
  } catch (e) {
    if (e instanceof SemReferencia) {
      return NextResponse.json({ erro: e.message }, { status: 409 });
    }
    const msg =
      e instanceof GenError
        ? e.message
        : "Falha ao gerar a arte. Tente de novo — se repetir, confira a chave da API.";
    console.error("[gerar]", e);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
