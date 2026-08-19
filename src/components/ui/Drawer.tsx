"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotaoIcone } from "./Button";

/**
 * Painel-gaveta da direita. No desktop fica encaixado na coluna;
 * abaixo de lg vira sobreposicao deslizante.
 */
export function Drawer({
  aberto,
  aoFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  className,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div
        onClick={aoFechar}
        className={cn(
          "fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm transition-opacity lg:hidden",
          aberto ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "surface fixed inset-y-3 right-3 z-50 flex w-[min(420px,92vw)] flex-col rounded-panel",
          "transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          "lg:sticky lg:top-3 lg:z-auto lg:h-[calc(100dvh-1.5rem)] lg:translate-x-0",
          aberto ? "translate-x-0" : "translate-x-[110%] lg:hidden",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="min-w-0">
            <h3 className="display truncate text-xl">{titulo}</h3>
            {subtitulo && <div className="mt-1 text-[13px] text-muted">{subtitulo}</div>}
          </div>
          <BotaoIcone titulo="Fechar" onClick={aoFechar} className="size-9 shrink-0">
            <X size={16} />
          </BotaoIcone>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {rodape && <footer className="border-t border-line p-5">{rodape}</footer>}
      </aside>
    </>
  );
}
