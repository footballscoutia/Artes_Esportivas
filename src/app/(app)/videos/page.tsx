import Image from "next/image";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { BotaoLink } from "@/components/ui/Button";

import { listarVideos } from "@/lib/dados";

function quando(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export default async function VideosPage() {
  const videos = await listarVideos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[26px] leading-tight">Vídeos</h1>
          <p className="text-[13px] text-muted">
            {videos.length === 0
              ? "Nenhum vídeo ainda"
              : `${videos.length} ${videos.length === 1 ? "vídeo" : "vídeos"}`}
          </p>
        </div>
        <BotaoLink href="/biblioteca" variante="sutil" tamanho="sm">
          Ir para a biblioteca
        </BotaoLink>
      </div>

      {videos.length === 0 ? (
        /**
         * O estado vazio EXPLICA a origem, em vez de só dizer que está vazio.
         *
         * Vídeo não nasce sozinho: ele parte de uma arte já gerada, porque
         * reaproveita os dados do pedido e porque a pessoa precisa ter gostado
         * da arte antes de pagar duas gerações por causa dela. Sem esta frase
         * aqui, a tela é uma porta fechada — e foi exatamente assim que ela
         * apareceu na primeira vez, com alguém procurando o botão e não achando.
         */
        <div className="surface flex flex-col items-center gap-3 rounded-card px-6 py-16 text-center">
          <Clapperboard className="size-6 text-muted-2" />
          <p className="text-[14px] font-medium">Vídeos nascem de uma arte</p>
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted">
            Abra uma arte na biblioteca e clique em <strong>Fazer vídeo</strong>. O MatchPost gera
            duas camadas novas — o cenário e o atleta recortado — e leva você ao editor, onde
            mexer em animação, ritmo e cores não custa nada.
          </p>
          <BotaoLink href="/biblioteca" tamanho="sm">
            Escolher uma arte
          </BotaoLink>
        </div>
      ) : (
        <div className="grid gap-4 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <Link
              key={v.id}
              href={`/video/${v.id}`}
              className="surface group flex flex-col overflow-hidden rounded-card transition-colors hover:border-line-2"
            >
              <span className="relative block aspect-[9/16] bg-surface-2">
                {v.capa && (
                  <Image
                    src={v.capa}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <span className="absolute right-2 top-2 rounded-field bg-surface/85 px-2 py-1 text-[11px] font-medium backdrop-blur">
                  {v.renderizado ? "Renderizado" : "Rascunho"}
                </span>
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <span className="truncate text-[13px] font-medium">{v.nome}</span>
                <span className="truncate text-[12px] text-muted">{v.contexto}</span>
                <span className="text-[12px] text-muted-2">{quando(v.criado_em)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
