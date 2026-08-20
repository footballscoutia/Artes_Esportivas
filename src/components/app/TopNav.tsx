"use client";

import Link from "next/link";
import type { Usuario } from "@/lib/types";
import { Marca } from "@/components/app/Marca";
import { Secoes } from "@/components/app/Secoes";
import { Tema } from "@/components/app/Tema";

export function TopNav({ usuario }: { usuario: Usuario | null }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl md:gap-4 lg:px-6">
      <Link
        href="/biblioteca"
        className="mr-auto flex h-11 shrink-0 items-center gap-3 md:mr-0 md:h-auto"
        title="MatchPost"
      >
        <Marca className="text-[19px]" />
        <span className="sr-only">MatchPost</span>
      </Link>

      <Secoes />

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Tema />
        {/*
          O avatar era um <div> com title e mais nada. Agora leva à Equipe, que
          é onde se libera acesso — a tela existe e não tinha porta de entrada,
          e um item a mais na navegação seria peso permanente por uma tarefa
          que acontece de mês em mês.
        */}
        <Link
          href="/equipe"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[12px] font-semibold transition-colors hover:border-line-2 hover:bg-surface-3 md:size-9"
          title={
            usuario
              ? `${usuario.email} — sua conta, a equipe e a saída`
              : "Sem sessão"
          }
        >
          {iniciais(usuario?.nome)}
        </Link>
      </div>
    </header>
  );
}

/**
 * Duas letras para o avatar. Sem nome, cai num tracinho em vez de string vazia.
 *
 * O separador era `/s+/`, sem a barra: partia a letra "s" em vez de espaco.
 * "Lucas Ferreira" virava ["Luca", " Ferreira"] e o avatar saia "L ". So nao
 * aparecia porque a unica conta tinha nome de uma palavra e sem "s".
 */
function iniciais(nome?: string) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0];
  return letras.toUpperCase();
}
