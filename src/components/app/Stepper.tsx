import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Passos do assistente.
 *
 * O movimento aqui carrega informacao, nao enfeite: o conector entre os passos
 * PREENCHE conforme voce avanca, e o passo atual ganha um anel do acento. Quem
 * olha de relance sabe onde esta e quanto falta sem ler nada.
 *
 * A ideia do anel pulsante veio do catalogo do React Bits. O laco infinito
 * ficou de fora: numa tela de formulario, algo piscando o tempo todo na
 * periferia atrapalha quem esta digitando.
 */
export function Stepper({
  passos,
  atual,
  aoIr,
}: {
  passos: string[];
  atual: number;
  aoIr: (i: number) => void;
}) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2">
      {passos.map((p, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        return (
          <li key={p} className="flex items-center gap-3">
            <button
              type="button"
              disabled={i > atual}
              onClick={() => aoIr(i)}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-full border pl-1.5 pr-4 text-[13px] md:h-9",
                "transition-[background-color,border-color,color,transform] duration-[220ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                ativo && "border-accent/40 bg-surface-3 text-text",
                feito && "border-line bg-surface-2 text-muted hover:-translate-y-px hover:text-text",
                !ativo && !feito && "border-line/60 text-muted-2",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px] tabular-nums",
                  "transition-[background-color,color,box-shadow] duration-[220ms]",
                  ativo &&
                    "bg-accent text-[var(--color-accent-texto)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]",
                  feito && "bg-surface-3 text-muted",
                  !ativo && !feito && "bg-surface-2 text-muted-2",
                )}
              >
                {feito ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </span>
              {p}
            </button>

            {i < passos.length - 1 && (
              /* trilho que preenche: o quanto do caminho ja foi andado */
              <span className="relative h-px w-4 overflow-hidden bg-line sm:w-8">
                <span
                  className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{ width: feito ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
