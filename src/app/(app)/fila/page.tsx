import Link from "next/link";
import { Inbox } from "lucide-react";
import { listarPedidos, geracoesDoPedido } from "@/lib/mock";
import { STATUS, STATUS_META, type Status } from "@/lib/types";
import { ArtCard } from "@/components/art/ArtCard";
import { TituloSecao } from "@/components/ui/Card";
import { BotaoLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default async function FilaPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const filtro = STATUS.includes(f as Status) ? (f as Status) : null;

  const pedidos = listarPedidos();
  const visiveis = filtro ? pedidos.filter((p) => p.status === filtro) : pedidos;
  const emRevisao = pedidos.filter((p) => p.status === "em_revisao").length;

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      <TituloSecao
        titulo="Fila de aprovação"
        descricao={
          emRevisao > 0
            ? `${emRevisao} arte${emRevisao > 1 ? "s" : ""} esperando decisão`
            : "Nada esperando decisão"
        }
        acao={<BotaoLink href="/novo">Gerar arte</BotaoLink>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <FiltroChip href="/fila" ativo={!filtro} rotulo="Todas" contagem={pedidos.length} />
        {STATUS.map((s) => (
          <FiltroChip
            key={s}
            href={`/fila?f=${s}`}
            ativo={filtro === s}
            rotulo={STATUS_META[s].titulo}
            contagem={pedidos.filter((p) => p.status === s).length}
            cor={STATUS_META[s].cor}
          />
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="surface grid place-items-center gap-4 rounded-card py-24 text-center">
          <Inbox size={26} className="text-muted-2" strokeWidth={1.5} />
          <div>
            <p className="font-medium">Nada aqui</p>
            <p className="mt-1 text-sm text-muted">Nenhuma arte com esse status.</p>
          </div>
          <BotaoLink href="/novo" variante="sutil" tamanho="sm">
            Gerar a primeira
          </BotaoLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visiveis.map((p) => (
            <ArtCard key={p.id} pedido={p} imagem={geracoesDoPedido(p.id)[0]?.imagem_url ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

function FiltroChip({
  href,
  rotulo,
  contagem,
  ativo,
  cor,
}: {
  href: string;
  rotulo: string;
  contagem: number;
  ativo: boolean;
  cor?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors",
        ativo
          ? "border-line-2 bg-surface-3 text-text"
          : "border-line bg-surface-2/40 text-muted hover:text-text",
      )}
    >
      {cor && <span className="size-1.5 rounded-full" style={{ background: cor }} />}
      {rotulo}
      <span className="text-[11px] text-muted-2">{contagem}</span>
    </Link>
  );
}
