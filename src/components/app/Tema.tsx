"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Alternador de tema. Escuro e o padrao; claro grava em localStorage.
 *
 * Sem estado no React de proposito. A raiz ja carrega `data-tema`, aplicado
 * antes da primeira pintura pelo script em `layout.tsx`. Espelhar isso em
 * `useState` criaria duas fontes de verdade e um descompasso de hidratacao —
 * o servidor nao tem como saber a preferencia gravada.
 *
 * Entao os dois icones sao renderizados e o CSS mostra o certo. O que o CSS ja
 * sabe nao precisa virar estado.
 */
export function Tema() {
  function alternar() {
    const raiz = document.documentElement;
    const claro = raiz.dataset.tema === "claro";
    if (claro) delete raiz.dataset.tema;
    else raiz.dataset.tema = "claro";
    try {
      localStorage.setItem("estudio:tema", claro ? "escuro" : "claro");
    } catch {
      // storage bloqueado: a escolha vale so nesta aba
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      title="Alternar tema"
      className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:border-line-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:size-9"
    >
      <Sun size={16} strokeWidth={1.75} className="so-escuro" />
      <Moon size={16} strokeWidth={1.75} className="so-claro" />
      <span className="sr-only">Alternar entre tema claro e escuro</span>
    </button>
  );
}
