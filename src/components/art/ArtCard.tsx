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
          <Image
            src={imagem}
            alt={`Arte de ${tipo.titulo.toLowerCase()} — ${pedido.nome_jogador}`}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
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
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-accent">{tipo.numero}</span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{tipo.titulo}</span>
        </div>
        <p className="mt-1.5 truncate text-[15px] font-medium">{pedido.nome_jogador}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted">
          {pedido.tipo === "matchday" && pedido.adversario
            ? `vs ${pedido.adversario}`
            : (pedido.clube ?? "—")}{" "}
          · {tempoRelativo(pedido.criado_em)}
        </p>
      </div>
    </Link>
  );
}
