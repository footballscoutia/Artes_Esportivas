import { NextResponse } from "next/server";
import { z } from "zod";
import { GenError } from "@/lib/ai";
import { usuarioAtual } from "@/lib/dados";
import { produzirArte, SemReferencia } from "@/lib/gerar";
import { BALDE, assinar, subir } from "@/lib/storage";
import { TIPOS, FORMATOS, type Formato, type Tipo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Corpo = z.object({
  tipo: z.enum(TIPOS),
  formato: z.enum(FORMATOS),
  nome: z.string().min(2).max(60),
  clube: z.string().max(60).optional().nullable(),
  frase: z.string().max(180).optional().nullable(),
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

  const form = await req.formData();

  const parsed = Corpo.safeParse({
    tipo: form.get("tipo"),
    formato: form.get("formato"),
    nome: form.get("nome"),
    clube: form.get("clube") || null,
    frase: form.get("frase") || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "Dados do pedido inválidos", detalhe: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { tipo, formato, nome, clube, frase } = parsed.data;

  const arquivoFoto = form.get("foto");
  const foto =
    arquivoFoto instanceof File && arquivoFoto.size > 0
      ? Buffer.from(await arquivoFoto.arrayBuffer())
      : null;

  try {
    /**
     * A foto sobe mesmo que o usuario desista de enviar para aprovacao. O custo
     * e arquivo orfao; a alternativa seria carregar o binario de volta pelo
     * navegador na hora de salvar, o que e bem pior.
     */
    const [arte, foto_path] = await Promise.all([
      produzirArte({ tipo: tipo as Tipo, formato: formato as Formato, nome, clube, frase, foto }),
      foto
        ? subir(BALDE.fotos, foto, arquivoFoto instanceof File ? arquivoFoto.type : "image/jpeg")
        : null,
    ]);

    return NextResponse.json({
      // URL assinada, com validade curta — os buckets sao privados
      imagem: await assinar(BALDE.geracoes, arte.arte_path),
      foto_path,
      ...arte,
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
