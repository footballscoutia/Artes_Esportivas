"use client";

import { Plus, Trash2 } from "lucide-react";
import { PreviaDaTransicao } from "@/components/app/PreviaDaTransicao";
import {
  FAMILIAS,
  TRANSICAO_PADRAO,
  duracaoDaTransicao,
  rotuloDaTransicao,
  type Opcoes,
} from "@/video/template";
import { cn } from "@/lib/utils";

/**
 * Os cortes do vídeo: quantos, em que segundo, e com qual transição.
 *
 * O que muda de verdade aqui não é a quantidade — é a natureza da pergunta.
 * Antes o corte era um fato do template e a pessoa só escolhia o efeito; agora
 * ela desenha o ritmo do vídeo. Um corte aos 4s num vídeo de 8s é uma pausa no
 * meio; três cortes num de 15s é um clipe.
 *
 * DUAS TRAVAS, e as duas por experiência de como isso quebra:
 *
 * O TETO de quatro, porque cada corte tira o texto de cena e o traz de volta —
 * cinco cortes num vídeo de 6s deixariam o texto piscando sem nunca assentar.
 *
 * O ESPAÇAMENTO mínimo, porque dois cortes a 0,2s de distância não são duas
 * transições: são um borrão só, e a pessoa que os posicionou assim não vai
 * entender por que o segundo sumiu.
 */

const MAXIMO = 4;
/** Distância mínima entre cortes, em segundos da linha do tempo. */
const ESPACO = 1.2;

type Corte = { em: number; transicao: string };

export function CortesDoVideo({
  opcoes,
  aoMudar,
  amostraDoTexto,
  t,
}: {
  opcoes: Opcoes;
  aoMudar: <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => void;
  amostraDoTexto: string;
  t: number;
}) {
  const cortes: Corte[] = opcoes.cortes?.length
    ? opcoes.cortes
    : [{ em: Math.round(opcoes.duracao / 2), transicao: opcoes.transicao ?? TRANSICAO_PADRAO }];

  const trocar = (i: number, mudanca: Partial<Corte>) =>
    aoMudar(
      "cortes",
      cortes.map((c, j) => (j === i ? { ...c, ...mudanca } : c)),
    );

  /* Um corte novo cai no maior buraco livre, e não no fim: acrescentar sempre
     no fim empilharia todos no último segundo, onde não cabem. */
  function acrescentar() {
    const ordenados = [...cortes].sort((a, b) => a.em - b.em);
    const limites = [0.6, ...ordenados.map((c) => c.em), opcoes.duracao - 0.6];
    let melhor = { meio: opcoes.duracao / 2, vao: 0 };
    for (let i = 0; i < limites.length - 1; i++) {
      const vao = limites[i + 1] - limites[i];
      if (vao > melhor.vao) melhor = { vao, meio: (limites[i] + limites[i + 1]) / 2 };
    }
    if (melhor.vao < ESPACO) return;
    aoMudar("cortes", [...cortes, { em: Number(melhor.meio.toFixed(1)), transicao: TRANSICAO_PADRAO }]);
  }

  const cabeMais =
    cortes.length < MAXIMO && opcoes.duracao - 1.2 > cortes.length * ESPACO;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium">
          Cortes <span className="text-muted-2 font-normal">quantos e quando</span>
        </p>
        <span className="text-[12px] text-muted-2">
          {cortes.length} de {MAXIMO}
        </span>
      </div>

      {cortes.map((corte, i) => (
        <div key={i} className="surface flex flex-col gap-2.5 rounded-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium tabular-nums">
              Corte {i + 1} · aos {corte.em.toFixed(1).replace(".", ",")}s
            </span>
            {cortes.length > 1 && (
              <button
                type="button"
                aria-label={`Remover corte ${i + 1}`}
                onClick={() =>
                  aoMudar(
                    "cortes",
                    cortes.filter((_, j) => j !== i),
                  )
                }
                className="text-muted-2 transition-colors hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          <input
            type="range"
            min={0.6}
            max={Math.max(1, opcoes.duracao - 0.6)}
            step={0.1}
            value={corte.em}
            onChange={(e) => {
              const alvo = Number(e.target.value);
              /* Não deixa colar no vizinho: a trava mora aqui, na entrada, e não
                 numa validação depois — assim o controle simplesmente não vai
                 para onde não pode, em vez de aceitar e corrigir escondido. */
              const perto = cortes.some((c, j) => j !== i && Math.abs(c.em - alvo) < ESPACO);
              if (!perto) trocar(i, { em: alvo });
            }}
            className="accent-accent"
          />

          <PreviaDaTransicao
            transicao={corte.transicao}
            fonte={opcoes.fonte}
            intensidade={opcoes.intensidade}
            velocidade={opcoes.velocidadeTransicao}
            texto={amostraDoTexto}
            t={t}
          />

          <p className="text-[12px] text-muted">{rotuloDaTransicao(corte.transicao)}</p>

          {/* Família primeiro, variação depois. Trinta transições numa grade só
              recriariam a página de três telas — e "Estouro branco" e "Estouro
              duplo" não são escolhas independentes, são o mesmo gesto em doses
              diferentes. */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(FAMILIAS).map(([id, familia]) => {
              const ativa = corte.transicao.split(":")[0] === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={familia.nota}
                  onClick={() => trocar(i, { transicao: `${id}:${familia.variantes[0].id}` })}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    ativa ? "border-accent bg-accent/10 font-medium" : "border-line text-muted",
                  )}
                >
                  {familia.rotulo}
                </button>
              );
            })}
          </div>

          {(() => {
            const [fam, variante] = corte.transicao.split(":");
            const variantes = FAMILIAS[fam]?.variantes ?? [];
            if (variantes.length < 2) return null;
            return (
              <div className="flex flex-wrap gap-1 border-t border-line pt-2">
                {variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => trocar(i, { transicao: `${fam}:${v.id}` })}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      variante === v.id
                        ? "border-accent bg-accent/10 font-medium"
                        : "border-line text-muted-2",
                    )}
                  >
                    {v.rotulo}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!cabeMais}
          onClick={acrescentar}
          className={cn(
            "flex items-center gap-1.5 rounded-card border px-3 py-1.5 text-[12px] transition-colors",
            cabeMais
              ? "border-line hover:border-line-2"
              : "cursor-not-allowed border-line opacity-40",
          )}
        >
          <Plus className="size-3.5" />
          Mais um corte
        </button>
        {!cabeMais && (
          <span className="text-[11px] text-muted-2">
            {cortes.length >= MAXIMO
              ? "Quatro é o limite — mais que isso o texto não assenta."
              : "Aumente a duração para caber outro corte."}
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1.5 border-t border-line pt-3">
        <span className="flex items-baseline justify-between text-[13px] font-medium">
          <span>
            Velocidade <span className="text-muted-2 font-normal">de todos os cortes</span>
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
          onChange={(e) => aoMudar("velocidadeTransicao", Number(e.target.value))}
          className="accent-accent"
        />
      </label>
    </div>
  );
}
