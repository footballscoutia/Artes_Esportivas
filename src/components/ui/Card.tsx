import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface rounded-card", className)} {...props}>
      {children}
    </div>
  );
}

export function TituloSecao({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <h2 className="display text-[28px]">{titulo}</h2>
        {descricao && <p className="mt-1.5 text-sm text-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Chip de dado inline — `rotulo: valor`, como as metricas do painel do Healix. */
export function Chip({
  rotulo,
  valor,
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3 py-1.5 text-[12px]",
        className,
      )}
    >
      <span className="text-muted">{rotulo}</span>
      <span className="font-medium text-text">{valor}</span>
    </span>
  );
}
