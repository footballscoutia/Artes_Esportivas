import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
                "flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-[13px] transition-all",
                ativo && "border-line-2 bg-surface-3 text-text",
                feito && "border-line bg-surface-2/50 text-muted hover:text-text",
                !ativo && !feito && "border-line/60 text-muted-2",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full font-mono text-[11px]",
                  ativo && "accent-grad text-white",
                  feito && "bg-surface-3 text-muted",
                  !ativo && !feito && "bg-surface-2 text-muted-2",
                )}
              >
                {feito ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </span>
              {p}
            </button>
            {i < passos.length - 1 && <span className="h-px w-4 bg-line sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
