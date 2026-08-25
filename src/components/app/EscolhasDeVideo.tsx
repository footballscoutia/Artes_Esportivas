"use client";

import { Check } from "lucide-react";
import { FONTES } from "@/video/fontes";
import {
  PreviaDaEntrada,
  PreviaDaTransicao,
  useRelogioDaPrevia,
} from "@/components/app/PreviaDaTransicao";
import {
  ENTRADAS,
  INTROS,
  duracaoDaTransicao,
  TEMPLATES,
  TRANSICOES,
  type Opcoes,
} from "@/video/template";
import type { ReactNode } from "react";
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
  amostra,
}: {
  titulo: string;
  ajuda?: string;
  itens: Record<string, { rotulo: string; nota?: string }>;
  atual: T;
  aoEscolher: (v: T) => void;
  colunas?: 1 | 2;
  /** Amostra visual da opção, desenhada dentro do próprio botão. */
  amostra?: (chave: string) => ReactNode;
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
            {amostra?.(chave)}
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
  amostraDoTexto = "GOLAÇO",
  aoVerTransicao,
}: {
  opcoes: Opcoes;
  aoMudar: <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => void;
  colunas?: 1 | 2;
  /** A palavra desenhada na amostra de fonte. O nome do clube diz mais. */
  amostraDoTexto?: string;
  /** No editor, escolher uma transição leva o preview até o corte. */
  aoVerTransicao?: () => void;
}) {
  const totalComIntro = opcoes.duracao + INTROS[opcoes.intro].dura;
  /* Um relogio so, no pai, para as dez previas andarem em fase. Dez timers
     independentes produziriam dez animacoes desencontradas, e comparar coisas
     que nao acontecem ao mesmo tempo e justamente o que nao da para fazer. */
  const t = useRelogioDaPrevia(true);

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
      {/**
        * A fonte se mostra NA propria opcao.
        *
        * "Anton", "Bebas Neue" e "Teko" nao dizem nada para quem monta post, e
        * uma lista de cinco nomes vira tentativa e erro: escolhe, olha o video,
        * volta, escolhe outra. Desenhar a palavra na fonte transforma a lista
        * numa decisao de um olhar — e funciona antes de o video existir, que e
        * onde um preview de verdade seria impossivel.
        */}
      <Grupo
        titulo="Fonte"
        itens={FONTES}
        atual={opcoes.fonte}
        aoEscolher={(v) => aoMudar("fonte", v)}
        colunas={colunas}
        amostra={(chave) => {
          const f = FONTES[chave as keyof typeof FONTES];
          return (
            <span
              className="mt-1.5 block truncate"
              style={{
                fontFamily: f.familia,
                fontWeight: f.peso,
                fontSize: 30,
                letterSpacing: 30 * f.aperto,
                transform: f.inclinacao ? `skewX(${f.inclinacao}deg)` : undefined,
                transformOrigin: "left center",
                lineHeight: 1.1,
              }}
            >
              {amostraDoTexto}
            </span>
          );
        }}
      />

      {/* Entra entre a fonte e a transicao: e efeito de TEXTO, desenhado na
          fonte que acabou de ser escolhida, e nao no quadro inteiro. */}
      <Grupo
        titulo="Como o texto aparece"
        ajuda="a entrada de cada linha"
        itens={ENTRADAS}
        atual={opcoes.entradaTexto}
        aoEscolher={(v) => aoMudar("entradaTexto", v)}
        colunas={colunas}
        amostra={(chave) => (
          <PreviaDaEntrada
            entrada={chave}
            fonte={opcoes.fonte}
            texto={amostraDoTexto}
            t={t}
          />
        )}
      />

      {/**
        * A transicao vem DEPOIS da fonte de proposito.
        *
        * A previa de cada transicao e desenhada com a fonte ja escolhida, entao
        * perguntar na ordem inversa mostraria dez animacoes numa tipografia que
        * a pessoa ainda vai trocar.
        */}
      <Grupo
        titulo="Transição do meio"
        itens={TRANSICOES}
        atual={opcoes.transicao}
        aoEscolher={(v) => {
          aoMudar("transicao", v);
          aoVerTransicao?.();
        }}
        colunas={colunas}
        amostra={(chave) => (
          <PreviaDaTransicao
            transicao={chave}
            fonte={opcoes.fonte}
            intensidade={opcoes.intensidade}
            velocidade={opcoes.velocidadeTransicao}
            texto={amostraDoTexto}
            t={t}
          />
        )}
      />

      {/* Fica junto das transicoes, e nao com os outros controles: e a
          velocidade DELAS, e as previas logo acima reagem na hora. */}
      <label className="-mt-2 flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-[13px] font-medium">
          <span className="flex items-baseline gap-1">
            Velocidade da transição
            <span className="text-muted-2 font-normal">quão rápido é o corte</span>
          </span>
          <span className="tabular-nums text-[12px] text-muted">
            {duracaoDaTransicao(opcoes.velocidadeTransicao).toFixed(2).replace(".", ",")}s
          </span>
        </span>
        <input
          type="range"
          min={0.4}
          max={2.5}
          step={0.1}
          value={opcoes.velocidadeTransicao}
          onChange={(ev) => aoMudar("velocidadeTransicao", Number(ev.target.value))}
          className="accent-accent"
        />
        <span className="flex justify-between text-[11px] text-muted-2">
          <span>lenta</span>
          <span>rápida</span>
        </span>
      </label>

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
