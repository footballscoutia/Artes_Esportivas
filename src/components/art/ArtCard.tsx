import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { FORMATO_META, TIPO_META, type Pedido } from "@/lib/types";
import { tempoRelativo } from "@/lib/utils";

export function ArtCard({ pedido, imagem }: { pedido: Pedido; imagem: string | null }) {
  const tipo = TIPO_META[pedido.tipo];
  const formato = FORMATO_META[pedido.formato];

  return (
    <Link
      href={`/pedido/${pedido.id}`}
      className="lift group surface block overflow-hidden rounded-card hover:border-line-2"
    >
      <div
        className="relative w-full overflow-hidden bg-surface-2"
        style={{ aspectRatio: formato.ratio }}
      >
        {imagem ? (
          /*
            Mesmo nome no detalhe: a miniatura vira a arte grande em vez de
            sumir e outra aparecer. O usuario ve um objeto se movendo, e
            entende que clicou no que queria sem precisar conferir.
          */
          <ViewTransition name={`arte-${pedido.id}`} share="morph" default="none">
            <Image
              src={imagem}
              alt={`Arte de ${tipo.titulo.toLowerCase()}, ${pedido.nome_jogador}`}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
            />
          </ViewTransition>
        ) : (
          <div className="grid h-full place-items-center text-muted-2">
            <ImageOff size={22} strokeWidth={1.5} />
          </div>
        )}
        {/* sem selo de status: a biblioteca guarda arte pronta, nao pedido em analise */}
        <span className="absolute right-3 top-3 rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[11px] text-muted backdrop-blur-md">
          {formato.titulo}
        </span>
      </div>

      <div className="p-4">
        {/*
          Sem eyebrow acima do nome: o rotulo de categoria repetia o que a arte
          ja mostra. O que o usuario procura na biblioteca e o jogador, e
          depois o contexto — entao e essa a ordem.
        */}
        <p className="truncate text-[15px] font-medium">{pedido.nome_jogador}</p>
        <p className="mt-1 truncate text-[12px] text-muted">
          {pedido.tipo === "matchday" && pedido.adversario
            ? `${tipo.titulo} contra ${pedido.adversario}`
            : pedido.clube
              ? `${tipo.titulo}, ${pedido.clube}`
              : tipo.titulo}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-2">{tempoRelativo(pedido.criado_em)}</p>
      </div>
    </Link>
  );
}
