"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Sparkles, Images, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotaoLink } from "@/components/ui/Button";
import type { Usuario } from "@/lib/types";

const SECOES = [
  { href: "/biblioteca", rotulo: "Biblioteca", icone: LayoutGrid },
  { href: "/novo", rotulo: "Nova arte", icone: Sparkles },
  { href: "/admin/referencias", rotulo: "Referências", icone: Images },
];

export function TopNav({ usuario }: { usuario: Usuario | null }) {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 backdrop-blur-xl lg:px-6">
      <Link href="/biblioteca" className="flex shrink-0 items-center gap-2.5">
        <span className="accent-grad grid size-9 place-items-center rounded-[12px] text-[13px] font-bold text-white">
          MB
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-[13px] font-semibold tracking-tight">Estúdio de Artes</span>
          <span className="block text-[11px] text-muted">Marcio Bittencourt Sports</span>
        </span>
      </Link>

      <nav className="surface mx-auto flex items-center gap-1 rounded-full p-1.5">
        {SECOES.map(({ href, rotulo, icone: Icone }) => {
          const ativo = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                ativo
                  ? "bg-surface-3 text-text shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
                  : "text-muted hover:text-text",
              )}
            >
              <Icone size={15} strokeWidth={1.75} />
              <span className="hidden md:block">{rotulo}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <BotaoLink href="/novo" tamanho="sm" className="hidden sm:inline-flex">
          <Plus size={15} strokeWidth={2.2} />
          Gerar arte
        </BotaoLink>
        <div
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[12px] font-semibold"
          title={
            usuario
              ? `${usuario.email} · ${usuario.papel === "aprova" ? "pode aprovar" : "envia para aprovação"}`
              : "Sem sessão"
          }
        >
          {iniciais(usuario?.nome)}
        </div>
      </div>
    </header>
  );
}

/** Duas letras para o avatar. Sem nome, cai num tracinho em vez de string vazia. */
function iniciais(nome?: string) {
  const partes = (nome ?? "").trim().split(/s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0];
  return letras.toUpperCase();
}
