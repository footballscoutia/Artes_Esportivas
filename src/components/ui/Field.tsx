"use client";

import { useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Campo({
  rotulo,
  dica,
  children,
  className,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-text">{rotulo}</span>
        {dica && <span className="text-[12px] text-muted-2">{dica}</span>}
      </span>
      {children}
    </label>
  );
}

const base =
  "w-full rounded-field border border-line bg-surface-2/60 px-4 text-sm text-text placeholder:text-muted-2 " +
  "transition-colors focus:border-accent/50 focus:bg-surface-2 focus:outline-none";

/* ComponentPropsWithRef e nao InputHTMLAttributes: no React 19 o ref e um prop
   comum, mas o tipo de atributos nao o inclui, e sem isso o ref nao compila. */
export function Input({ className, ...props }: React.ComponentPropsWithRef<"input">) {
  return <input className={cn(base, "h-12", className)} {...props} />;
}

/**
 * Select nativo com a mesma casca do Input.
 *
 * Nativo de proposito: a lista suspensa do sistema ja e acessivel, ja abre no
 * teclado e, no celular, vira a roda nativa — coisas que um menu escrito a mao
 * so alcanca depois de muito codigo. O que se ganha reescrevendo e a seta
 * combinando, e essa da para trocar sozinha: `appearance-none` tira a do
 * sistema e a nossa entra por cima, sem interceptar o clique.
 */
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn(base, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-2"
      />
    </span>
  );
}

/**
 * Senha com o olho para revelar.
 *
 * Nao e conveniencia: e o que derruba erro de digitacao em campo que nao
 * mostra o que foi digitado. Quem erra a senha tres vezes seguidas costuma ter
 * errado uma letra, e o mascaramento e que escondeu isso.
 *
 * O botao fica fora da aba de tabulacao. Quem navega por teclado esta indo do
 * campo para o proximo campo, e um "mostrar senha" no meio do caminho e um
 * degrau a mais em toda entrada, para uma acao que quase ninguem usa assim.
 */
export function Senha({ className, ...props }: React.ComponentPropsWithRef<"input">) {
  const [aberta, setAberta] = useState(false);

  return (
    <span className="relative block">
      <input
        type={aberta ? "text" : "password"}
        className={cn(base, "h-12 pr-12", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setAberta((v) => !v)}
        aria-label={aberta ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[8px] text-muted-2 transition-colors hover:bg-surface-3 hover:text-text"
      >
        {aberta ? <EyeOff size={16} strokeWidth={1.7} /> : <Eye size={16} strokeWidth={1.7} />}
      </button>
    </span>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-28 py-3.5 leading-relaxed", className)} {...props} />;
}
