"use client";

import { Check } from "lucide-react";
import { FONTES } from "@/video/fontes";
import {
  PreviaDaEntrada,
  PreviaDoIntro,
  PreviaDoTratamento,
  useRelogioDaPrevia,
} from "@/components/app/PreviaDaTransicao";
import {
  ENTRADAS,
  INTROS,
  TRATAMENTOS,
  TARJAS,
  INTRO_EFEITOS,
  TEMPLATES,
  ocultaveisDoTipo,
  temLinhaDeDados,
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
      <div
        className={cn(
          "grid gap-1.5",
          colunas === 2
            ? "grid-cols-2 min-[760px]:grid-cols-3 min-[1100px]:grid-cols-4"
            : "grid-cols-2 min-[900px]:grid-cols-3 min-[1200px]:grid-cols-4",
        )}
      >
        {Object.entries(itens).map(([chave, item]) => (
          <button
            key={chave}
            type="button"
            onClick={() => aoEscolher(chave as T)}
            className={cn(
              "rounded-card border px-2.5 py-1.5 text-left transition-colors",
              atual === chave
                ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                : "border-line hover:border-line-2",
            )}
          >
            <span className="flex items-center gap-1 text-[12px] font-medium leading-tight">
              {atual === chave && <Check className="size-3 shrink-0 text-accent" />}
              {item.rotulo}
            </span>
            {amostra?.(chave)}
            {/* A descricao escrita so aparece onde NAO ha previa. Onde ha, ela
                e redundante — a animacao diz melhor o que "arrasto lateral
                borrado" tenta descrever — e custa uma linha em cada cartao,
                que numa grade de dez vira tres fileiras mais altas. */}
            {item.nota && !amostra && (
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-2">
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
  escudoUrl,
  imagemDeFundo,
  mostrarOcultaveis = true,
  aoRenderRelogio,
}: {
  opcoes: Opcoes;
  aoMudar: <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => void;
  colunas?: 1 | 2;
  /** A palavra desenhada na amostra de fonte. O nome do clube diz mais. */
  amostraDoTexto?: string;
  /** No editor, escolher uma transição leva o preview até o corte. */
  aoVerTransicao?: () => void;
  /** O escudo real, para a prévia da intro não usar um genérico. */
  escudoUrl?: string;
  /** A placa, para o tratamento "recorte" mostrar a arte por dentro da letra. */
  imagemDeFundo?: string;
  /**
   * Falso quando a tela já perguntou isso antes — é o caso do vídeo do zero,
   * onde os interruptores vêm ANTES dos campos de texto para a pessoa não
   * escrever um estádio que decidiu não mostrar.
   */
  mostrarOcultaveis?: boolean;
  /**
   * O relógio das prévias, emprestado a quem desenha os cortes ao lado.
   *
   * Um relógio só para a tela inteira: dois `requestAnimationFrame` fariam a
   * prévia de uma coluna animar fora de fase com a da outra, e comparar duas
   * coisas que não acontecem ao mesmo tempo é o que a pessoa não consegue.
   */
  aoRenderRelogio?: (t: number) => void;
}) {
  const totalComIntro = opcoes.duracao + INTROS[opcoes.intro].dura;
  /* Um relogio so, no pai, para as dez previas andarem em fase. Dez timers
     independentes produziriam dez animacoes desencontradas, e comparar coisas
     que nao acontecem ao mesmo tempo e justamente o que nao da para fazer. */
  const t = useRelogioDaPrevia(true);
  aoRenderRelogio?.(t);

  return (
    /**
     * Os GRUPOS empilham na largura toda; as OPÇÕES é que vão em grade.
     *
     * A tentativa anterior fez o contrário — dois grupos lado a lado — e não
     * resolveu: medindo a página, o efeito de intro gastava 979px para oito
     * opções e a transição 1119px para dez, porque cada grupo continuava sendo
     * uma lista de uma coluna dentro de meia largura. Cartão de 112px de altura
     * ocupando 666px de largura é desperdício dos dois lados.
     *
     * Com as opções em quatro colunas, dez viram três fileiras em vez de dez.
     */
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
        ajuda="o que aparece na abertura"
        itens={INTROS}
        atual={opcoes.intro}
        aoEscolher={(v) => aoMudar("intro", v)}
        colunas={colunas}
      />

      {/* So faz sentido perguntar COMO se existe algo entrando. Sem intro, um
          seletor de efeito seria um controle que nao controla nada. */}
      {opcoes.intro !== "nenhuma" && (
        <Grupo
          titulo="Efeito da intro"
          ajuda="como ela entra"
          itens={INTRO_EFEITOS}
          atual={opcoes.introEfeito}
          aoEscolher={(v) => aoMudar("introEfeito", v)}
          colunas={colunas}
          amostra={(chave) => (
            <PreviaDoIntro efeito={chave} escudoUrl={escudoUrl} t={t} />
          )}
        />
      )}
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

      {/* Depois da fonte, antes da entrada: o tratamento e acabamento DA letra,
          entao so faz sentido depois de a letra estar escolhida. */}
      <Grupo
        titulo="Tratamento da letra"
        ajuda="contorno, metal, recorte"
        itens={TRATAMENTOS}
        atual={opcoes.tratamento}
        aoEscolher={(v) => aoMudar("tratamento", v)}
        colunas={colunas}
        amostra={(chave) => (
          <PreviaDoTratamento
            tratamento={chave}
            fonte={opcoes.fonte}
            cor={opcoes.corTexto}
            texto={amostraDoTexto}
            imagem={imagemDeFundo}
            destaque={opcoes.corBarra}
          />
        )}
      />

      {/**
        * A forma da linha dos dados — e a pergunta so aparece quando ela existe.
        *
        * Data, hora e estadio so entram no matchday; num video de gol nao ha
        * linha nenhuma para ter forma, e o controle seria um controle que nao
        * controla nada, como o efeito de intro sem intro.
        */}
      {temLinhaDeDados(opcoes.tipo) && (
        <Grupo
          titulo="Linha dos dados"
          ajuda="data, hora e estádio"
          itens={TARJAS}
          atual={opcoes.tarja}
          aoEscolher={(v) => aoMudar("tarja", v)}
          colunas={colunas}
          amostra={(chave) => (
            <span className="mt-1.5 flex h-[46px] items-center rounded-field bg-black/60 px-2">
              {chave === "nenhuma" ? (
                <span className="text-[11px] text-white/35">— sem esta linha —</span>
              ) : (
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-[0.14em] text-white",
                    chave === "placa" && "rounded-sm bg-black/85 px-1.5 py-1",
                  )}
                  style={
                    chave === "placa"
                      ? undefined
                      : { WebkitTextStroke: "0.6px rgba(0,0,0,.85)", paintOrder: "stroke fill" }
                  }
                >
                  QUI 30.07 · 20H30
                </span>
              )}
            </span>
          )}
        />
      )}

      {/* Entra entre a fonte e a transicao: e efeito de TEXTO, desenhado na
          fonte que acabou de ser escolhida, e nao no quadro inteiro. */}
      <Grupo
        titulo="Transição no texto"
        ajuda="como cada linha entra"
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

      {mostrarOcultaveis && <OQueAparece opcoes={opcoes} aoMudar={aoMudar} />}

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

/**
 * O que aparece no vídeo — os interruptores, isolados.
 *
 * Isolado porque aparece em dois momentos diferentes: no vídeo do zero ele vem
 * ANTES dos campos de texto, senão a pessoa escreve um estádio que já decidiu
 * não mostrar; no editor ele fica com o resto, porque ali os textos já existem
 * e a decisão é de arrumação e não de digitação.
 */
export function OQueAparece({
  opcoes,
  aoMudar,
}: {
  opcoes: Opcoes;
  aoMudar: <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => void;
}) {
  /* So os campos que este tipo desenha — ver `ocultaveisDoTipo`. Sem isto, um
     video de gol oferecia desligar campeonato, adversario e estadio, que o
     roteiro dele nem chega a escrever. */
  const itens = ocultaveisDoTipo(opcoes.tipo, opcoes.tarja);
  if (Object.keys(itens).length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">
        O que aparece <span className="text-muted-2 font-normal">desligue o que não vai ao vídeo</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(itens).map(([chave, rotulo]) => {
          const visivel = !opcoes.ocultos.includes(chave);
          return (
            <button
              key={chave}
              type="button"
              onClick={() =>
                aoMudar(
                  "ocultos",
                  visivel
                    ? [...opcoes.ocultos, chave]
                    : opcoes.ocultos.filter((c) => c !== chave),
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                visivel
                  ? "border-accent bg-accent/10 font-medium"
                  : "border-line text-muted-2 line-through",
              )}
            >
              {rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}