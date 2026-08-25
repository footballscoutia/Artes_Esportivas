import { notFound } from "next/navigation";
import { BotaoLink } from "@/components/ui/Button";
import { EditorVideo } from "@/components/app/EditorVideo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BALDE, assinar } from "@/lib/storage";
import { EsquemaOpcoes, OPCOES_PADRAO } from "@/video/template";

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function formatarData(iso: string | null) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return `${DIAS[d.getUTCDay()]} ${String(dia).padStart(2, "0")}.${String(mes).padStart(2, "0")}`;
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await criarClienteServidor();

  const { data: video } = await sb
    .from("videos")
    .select("id, fundo_url, atleta_url, opcoes, pedido_id")
    .eq("id", id)
    .maybeSingle();

  if (!video) notFound();

  const { data: pedido } = await sb
    .from("pedidos")
    .select("nome_jogador, clube, adversario, data_jogo, hora_jogo, estadio, campeonato")
    .eq("id", video.pedido_id)
    .maybeSingle();

  /**
   * URLs ASSINADAS, e nao caminhos.
   *
   * Os baldes sao privados e o <Player> roda no navegador da pessoa: ele precisa
   * de um endereco que o browser consiga buscar. A assinatura tem validade
   * curta, que e o preco de nao deixar as camadas publicas — quem recarregar
   * depois do prazo recebe links novos, porque esta pagina e servidor.
   */
  const [fundo, atleta] = await Promise.all([
    assinar(BALDE.videos, video.fundo_url),
    assinar(BALDE.videos, video.atleta_url),
  ]);

  if (!fundo || !atleta) notFound();

  /* Opcoes gravadas por uma versao anterior do contrato caem no padrao em vez
     de quebrar a tela — a validacao mora na fronteira, nao no componente. */
  const validadas = EsquemaOpcoes.safeParse(video.opcoes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[22px] leading-tight">
            {pedido?.nome_jogador ?? "Vídeo"}
          </h1>
          <p className="text-[13px] text-muted">
            {[pedido?.clube, pedido?.adversario].filter(Boolean).join(" × ")}
          </p>
        </div>
        <BotaoLink href={`/pedido/${video.pedido_id}`} variante="sutil" tamanho="sm">
          Voltar ao pedido
        </BotaoLink>
      </div>

      <EditorVideo
        videoId={video.id}
        camadas={{ fundo, atleta }}
        dados={{
          clube: pedido?.clube ?? "",
          adversario: pedido?.adversario ?? "",
          data: formatarData(pedido?.data_jogo ?? null),
          hora: pedido?.hora_jogo ?? "",
          estadio: pedido?.estadio ?? "",
          campeonato: pedido?.campeonato ?? "",
        }}
        opcoesIniciais={validadas.success ? validadas.data : OPCOES_PADRAO}
      />
    </div>
  );
}
