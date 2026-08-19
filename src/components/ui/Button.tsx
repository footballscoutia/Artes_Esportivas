import Link from "next/link";
import { cn } from "@/lib/utils";

type Variante = "primario" | "sutil" | "contorno" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

const VARIANTE: Record<Variante, string> = {
  primario:
    "accent-grad text-white shadow-[0_10px_30px_-12px_rgba(255,45,111,.8)] hover:brightness-110",
  sutil: "bg-surface-2 text-text hover:bg-surface-3 border border-line",
  contorno: "border border-line-2 text-text hover:bg-surface-2",
  fantasma: "text-muted hover:text-text hover:bg-surface-2",
  perigo: "border border-accent/40 text-accent hover:bg-accent/10",
};

const TAMANHO: Record<Tamanho, string> = {
  sm: "h-9 px-4 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
};

type Base = {
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  children: React.ReactNode;
};

function classes({ variante = "primario", tamanho = "md", className }: Base) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium",
    "transition-all duration-200 active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    VARIANTE[variante],
    TAMANHO[tamanho],
    className,
  );
}

export function Button({
  variante,
  tamanho,
  className,
  children,
  ...props
}: Base & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variante, tamanho, className, children })} {...props}>
      {children}
    </button>
  );
}

export function BotaoLink({
  variante,
  tamanho,
  className,
  children,
  href,
  ...props
}: Base & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={classes({ variante, tamanho, className, children })} {...props}>
      {children}
    </Link>
  );
}

/** Botao circular do rail lateral e das barras de acao, no espirito do Healix. */
export function BotaoIcone({
  className,
  ativo,
  titulo,
  children,
  ...props
}: {
  ativo?: boolean;
  titulo?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      title={titulo}
      aria-label={titulo}
      className={cn(
        "grid size-11 place-items-center rounded-full border transition-all duration-200",
        "active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        ativo
          ? "accent-grad border-transparent text-white shadow-[0_8px_24px_-10px_rgba(255,45,111,.9)]"
          : "border-line bg-surface-2/60 text-muted hover:text-text hover:border-line-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
