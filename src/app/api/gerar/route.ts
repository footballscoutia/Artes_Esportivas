import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { pegarProvider, providerAtivo, GenError } from "@/lib/ai";
import { compor } from "@/lib/compose";
import { buscarReferencia } from "@/lib/mock";
import { FORMATO_META, TIPO_META, TIPOS, FORMATOS, type Formato, type Tipo } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Corpo = z.object({
  tipo: z.enum(TIPOS),
  formato: z.enum(FORMATOS),
  nome: z.string().min(2).max(60),
  clube: z.string().max(60).optional().nullable(),
  frase: z.string().max(180).optional().nullable(),
});

/** Pede ao modelo uma imagem maior que o formato final — a sobra vira margem do corte. */
const FOLGA = 1.18;

export async function POST(req: Request) {
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
  const alvo = FORMATO_META[formato as Formato];

  const referencia = buscarReferencia(tipo as Tipo, formato as Formato);
  if (!referencia || !referencia.ativa) {
    return NextResponse.json(
      { erro: `Não há referência ativa para ${tipo} em ${formato}. Cadastre em Referências.` },
      { status: 409 },
    );
  }

  const arquivoFoto = form.get("foto");
  const foto =
    arquivoFoto instanceof File && arquivoFoto.size > 0
      ? Buffer.from(await arquivoFoto.arrayBuffer())
      : null;

  const refBuffer = referencia.imagem_url?.startsWith("/")
    ? await readFile(path.join(process.cwd(), "public", referencia.imagem_url)).catch(() => null)
    : null;

  const sufixo = formato === "feed_4x5" ? "feed" : "story";

  try {
    const provider = pegarProvider(`/mock/fundo-${tipo}-${sufixo}.png`);

    const gerado = await provider.gerar({
      referencia: refBuffer,
      foto,
      prompt: referencia.prompt_mae,
      largura: Math.round(alvo.w * FOLGA),
      altura: Math.round(alvo.h * FOLGA),
    });

    // camadas de codigo por cima do que a IA devolveu
    const final = await compor({
      fundo: gerado.imagem,
      nome,
      clube,
      frase,
      rotulo: TIPO_META[tipo as Tipo].rotulo,
      formato: formato as Formato,
    });

    return NextResponse.json({
      // fase 1 devolve a imagem embutida; na fase 2 vira URL do Supabase Storage
      imagem: `data:image/png;base64,${final.toString("base64")}`,
      largura: alvo.w,
      altura: alvo.h,
      modelo: gerado.modelo,
      provider: providerAtivo(),
      custo_usd: gerado.custoUsd,
      duracao_ms: gerado.duracaoMs,
      referencia_id: referencia.id,
      referencia_versao: referencia.versao,
    });
  } catch (e) {
    const msg =
      e instanceof GenError
        ? e.message
        : "Falha ao gerar a arte. Tente de novo — se repetir, confira a chave da API.";
    console.error("[gerar]", e);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
