import Link from "next/link";
import { TIPOS, TIPO_META, type Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Filtro por categoria da biblioteca.
 *
 * So aparecem categorias que a conta ja usou: uma linha com as oito, sendo seis
 * zeradas, e ruido — quem procura arte procura entre as que existem.
 */
export function FiltroTipo({
  total,
  porTipo,
  atual,
}: {
  total: number;
  porTipo: Record<Tipo, number>;
  atual: Tipo | null;
}) {
  const usados = TIPOS.filter((t) => porTipo[t] > 0);
  if (usados.length < 2) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Chip href="/biblioteca" ativo={!atual} rotulo="Todas" contagem={total} />
      {usados.map((t) => (
        <Chip
          key={t}
          href={`/biblioteca?t=${t}`}
          ativo={atual === t}
          rotulo={TIPO_META[t].titulo}
          contagem={porTipo[t]}
        />
      ))}
    </div>
  );
}

function Chip({
  href,
  rotulo,
  contagem,
  ativo,
}: {
  href: string;
  rotulo: string;
  contagem: number;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors",
        ativo
          ? "border-line-2 bg-surface-3 text-text"
          : "border-line bg-surface-2/40 text-muted hover:text-text",
      )}
    >
      {rotulo}
      <span className="text-[11px] text-muted-2">{contagem}</span>
    </Link>
  );
}
