import Link from "next/link";
import { cn } from "@/lib/utils";

type Variante = "primario" | "sutil" | "contorno" | "fantasma" | "perigo";
type Tamanho = "sm" | "md" | "lg";

/**
 * O primario era gradiente com halo colorido embaixo. Halo sem deslocamento e
 * decoracao, nao profundidade — e gradiente de marca era metade da "cara de
 * IA". Agora e acento chapado, e a resposta ao toque vem do deslocamento.
 */
const VARIANTE: Record<Variante, string> = {
  primario:
    "varredura corpo-botao bg-accent text-[var(--color-accent-texto)] hover:bg-[var(--color-accent-forte)]",
  sutil:
    "varredura corpo-botao-sutil bg-surface-2 text-text hover:bg-surface-3 border border-line hover:border-line-2",
  contorno: "border border-line-2 text-text hover:bg-surface-2",
  // fantasma e perigo ficam chapados de proposito: sao acoes secundarias, e dar
  // volume a elas competiria com a acao primaria da tela
  fantasma: "text-muted hover:text-text hover:bg-surface-2",
  perigo: "border border-erro/40 text-erro hover:bg-erro/10",
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
    // 180ms: usuario esta em fluxo, nao quer esperar coreografia
    "transition-[background-color,border-color,transform,box-shadow] duration-[180ms]",
    "hover:-translate-y-px active:translate-y-px disabled:opacity-40 disabled:pointer-events-none",
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
        "grid size-10 place-items-center rounded-full border",
        "transition-[background-color,border-color,transform,box-shadow] duration-[180ms]",
        "hover:-translate-y-px active:translate-y-px disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        ativo
          ? "corpo-botao border-transparent bg-accent text-[var(--color-accent-texto)]"
          : "corpo-botao-sutil border-line bg-surface-2 text-muted hover:border-line-2 hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
