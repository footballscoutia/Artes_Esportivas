"use client";

import { Check } from "lucide-react";
import {
  FONTES,
  INTROS,
  TEMPLATES,
  TRANSICOES,
  type Opcoes,
} from "@/video/template";
import { cn } from "@/lib/utils";

/**
 * As escolhas de montagem, num lugar so.
 *
 * Elas aparecem em dois momentos — no painel de perguntas antes de gerar, e no
 * editor depois — e sao as MESMAS. Duplicar os dois conjuntos garantiria que um
 * dia eles divergem: alguem acrescenta uma transicao nova e ela so existe num
 * dos dois lados, sem ninguem perceber ate um usuario reclamar.
 */

export function Grupo<T extends string>({
  titulo,
  ajuda,
  itens,
  atual,
  aoEscolher,
  colunas = 1,
}: {
  titulo: string;
  ajuda?: string;
  itens: Record<string, { rotulo: string; nota?: string }>;
  atual: T;
  aoEscolher: (v: T) => void;
  colunas?: 1 | 2;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">
        {titulo} {ajuda && <span className="text-muted-2 font-normal">{ajuda}</span>}
      </p>
      <div className={cn("grid gap-1.5", colunas === 2 && "min-[520px]:grid-cols-2")}>
        {Object.entries(itens).map(([chave, item]) => (
          <button
            key={chave}
            type="button"
            onClick={() => aoEscolher(chave as T)}
            className={cn(
              "rounded-card border px-3 py-2 text-left transition-colors",
              atual === chave
                ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                : "border-line hover:border-line-2",
            )}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
              {atual === chave && <Check className="size-3.5 shrink-0 text-accent" />}
              {item.rotulo}
            </span>
            {item.nota && (
              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-2">
                {item.nota}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Os templates trazem `nome`/`descricao`; o `Grupo` fala `rotulo`/`nota`. */
const ARRANJOS = Object.fromEntries(
  Object.entries(TEMPLATES).map(([k, t]) => [k, { rotulo: t.nome, nota: t.descricao }]),
);

export function EscolhasDeVideo({
  opcoes,
  aoMudar,
  colunas = 1,
}: {
  opcoes: Opcoes;
  aoMudar: <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => void;
  colunas?: 1 | 2;
}) {
  const totalComIntro = opcoes.duracao + INTROS[opcoes.intro].dura;

  return (
    <div className="flex flex-col gap-5">
      <Grupo
        titulo="Arranjo"
        itens={ARRANJOS}
        atual={opcoes.template}
        aoEscolher={(v) => aoMudar("template", v)}
        colunas={colunas}
      />
      <Grupo
        titulo="Intro"
        itens={INTROS}
        atual={opcoes.intro}
        aoEscolher={(v) => aoMudar("intro", v)}
        colunas={colunas}
      />
      <Grupo
        titulo="Transição do meio"
        itens={TRANSICOES}
        atual={opcoes.transicao}
        aoEscolher={(v) => aoMudar("transicao", v)}
        colunas={colunas}
      />
      <Grupo
        titulo="Fonte"
        itens={FONTES}
        atual={opcoes.fonte}
        aoEscolher={(v) => aoMudar("fonte", v)}
        colunas={colunas}
      />

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-[13px] font-medium">
          <span>
            Duração <span className="text-muted-2 font-normal">da arte</span>
          </span>
          <span className="tabular-nums text-[12px] text-muted">{opcoes.duracao}s</span>
        </span>
        <input
          type="range"
          min={4}
          max={20}
          step={0.5}
          value={opcoes.duracao}
          onChange={(e) => aoMudar("duracao", Number(e.target.value))}
          className="accent-accent"
        />
        {INTROS[opcoes.intro].dura > 0 && (
          <span className="text-[12px] text-muted-2">
            Com a intro, o vídeo fica com {totalComIntro.toFixed(1).replace(".", ",")}s.
          </span>
        )}
      </label>
    </div>
  );
}
