"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SECOES = [
  { href: "/biblioteca", rotulo: "Biblioteca", icone: LayoutGrid },
  { href: "/novo", rotulo: "Nova arte", icone: Sparkles },
];

/**
 * Navegacao principal, com o indicador deslizando entre as secoes.
 *
 * A primeira tentativa usou `<ViewTransition>` no fundo do item ativo. Ficou
 * ruim, e por um motivo estrutural: a view transition tira o elemento do fluxo
 * e anima so ele, entao no meio do caminho a pilula viaja vazia enquanto o
 * rotulo antigo ja sumiu e o novo ainda nao chegou. Aparecia uma forma escura.
 *
 * Aqui o indicador e UM elemento atras dos itens, e so a posicao e a largura
 * mudam. Os rotulos ficam parados o tempo todo, que e o que o olho espera: o
 * fundo se move, o texto nao.
 *
 * A medida vai direto no style pelo ref, sem estado. Guardar posicao em estado
 * daria um render por navegacao e um descompasso de hidratacao, para nada — o
 * dado nao pertence ao React, pertence ao layout.
 */
export function Secoes() {
  const path = usePathname();
  const caixa = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const nav = caixa.current;
    const barra = indicador.current;
    if (!nav || !barra) return;

    const ativo = nav.querySelector<HTMLAnchorElement>("[data-ativo='true']");
    if (!ativo) {
      barra.style.opacity = "0";
      return;
    }

    barra.style.opacity = "1";
    barra.style.width = `${ativo.offsetWidth}px`;
    barra.style.transform = `translateX(${ativo.offsetLeft}px)`;
  }, [path]);

  return (
    <nav
      ref={caixa}
      className="surface relative mx-auto flex items-center gap-1 rounded-full p-1.5"
    >
      <span
        ref={indicador}
        aria-hidden
        className="absolute left-0 top-1.5 h-[calc(100%-0.75rem)] rounded-full bg-surface-3 opacity-0 transition-[transform,width,opacity] duration-[320ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
      />

      {SECOES.map(({ href, rotulo, icone: Icone }) => {
        const ativo = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            data-ativo={ativo}
            className={cn(
              "relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium",
              "transition-colors duration-[180ms]",
              ativo ? "text-text" : "text-muted hover:text-text",
            )}
          >
            <Icone size={15} strokeWidth={1.75} />
            <span className="hidden md:block">{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
