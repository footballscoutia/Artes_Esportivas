"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Check, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Matchday } from "@/video/Matchday";
import { OPCOES_PADRAO, TEMPLATES, type Camadas, type Dados, type Opcoes } from "@/video/template";
import { salvarVideo } from "@/lib/acoes";
import { cn } from "@/lib/utils";

/**
 * O editor. O <Player> toca a MESMA composicao que o servidor renderiza em mp4.
 *
 * E essa identidade que faz o editor valer: o que a pessoa ve aqui e o arquivo
 * final, e nao uma aproximacao dele. Um preview construido a parte — em CSS, ou
 * com outro desenhista — divergiria do render com o tempo, e um editor que
 * mente sobre o resultado e pior que nao ter editor.
 *
 * Nada aqui gasta credito. As duas camadas ja custaram, estao no balde e nao
 * mudam; tudo o que estes controles mexem e desenhado no navegador, de graca,
 * quantas vezes a pessoa quiser.
 */

const FPS = 30;

type Props = {
  videoId: string;
  dados: Dados;
  camadas: Camadas;
  opcoesIniciais: Opcoes;
};

function Deslizante({
  rotulo,
  ajuda,
  valor,
  min,
  max,
  passo,
  aoMudar,
  formatar,
}: {
  rotulo: string;
  ajuda: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  aoMudar: (v: number) => void;
  formatar?: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-[13px] font-medium">
        <span>
          {rotulo} <span className="text-muted-2 font-normal">{ajuda}</span>
        </span>
        <span className="tabular-nums text-[12px] text-muted">
          {formatar ? formatar(valor) : valor.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="accent-accent"
      />
    </label>
  );
}

export function EditorVideo({ videoId, dados, camadas, opcoesIniciais }: Props) {
  const [opcoes, setOpcoes] = useState<Opcoes>(opcoesIniciais);
  const [salvo, setSalvo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const player = useRef<PlayerRef>(null);

  const mexer = <K extends keyof Opcoes>(chave: K, valor: Opcoes[K]) => {
    setOpcoes((o) => ({ ...o, [chave]: valor }));
    setSalvo(false);
  };

  /**
   * As props do Player sao memoizadas de proposito.
   *
   * O <Player> re-monta a composicao quando `inputProps` muda de identidade, e
   * um objeto novo a cada render faria a preview piscar a cada movimento do
   * controle — justamente o momento em que ela precisa ficar estavel.
   */
  const props = useMemo(() => ({ dados, camadas, opcoes }), [dados, camadas, opcoes]);
  const quadros = Math.round(opcoes.duracao * FPS);

  /* Duracao menor com o cursor la na frente deixaria o Player fora de faixa. */
  useEffect(() => {
    const atual = player.current?.getCurrentFrame?.() ?? 0;
    if (atual >= quadros) player.current?.seekTo(Math.max(0, quadros - 1));
  }, [quadros]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="surface overflow-hidden rounded-card">
        <Player
          ref={player}
          component={Matchday}
          inputProps={props}
          durationInFrames={quadros}
          fps={FPS}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: "100%" }}
          controls
          loop
        />
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-[13px] font-medium">
            Template <span className="text-muted-2 font-normal">a receita da animação</span>
          </p>
          <div className="flex flex-col gap-2">
            {Object.values(TEMPLATES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => mexer("template", t.id as Opcoes["template"])}
                className={cn(
                  "rounded-card border px-3 py-2 text-left transition-colors",
                  opcoes.template === t.id
                    ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                    : "border-line hover:border-line-2",
                )}
              >
                <span className="flex items-center gap-1.5 text-[13px] font-medium">
                  {opcoes.template === t.id && <Check className="size-3.5 shrink-0 text-accent" />}
                  {t.nome}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-2">
                  {t.descricao}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <Deslizante
            rotulo="Duração"
            ajuda="segundos"
            valor={opcoes.duracao}
            min={4}
            max={20}
            passo={0.5}
            aoMudar={(v) => mexer("duracao", v)}
            formatar={(v) => `${v}s`}
          />
          <Deslizante
            rotulo="Texto"
            ajuda="tamanho"
            valor={opcoes.escalaTexto}
            min={0.6}
            max={2}
            passo={0.05}
            aoMudar={(v) => mexer("escalaTexto", v)}
            formatar={(v) => `${v.toFixed(2)}×`}
          />
          <Deslizante
            rotulo="Velocidade"
            ajuda="ritmo das entradas"
            valor={opcoes.velocidade}
            min={0.5}
            max={2}
            passo={0.05}
            aoMudar={(v) => mexer("velocidade", v)}
            formatar={(v) => `${v.toFixed(2)}×`}
          />
          <Deslizante
            rotulo="Intensidade"
            ajuda="câmera e transição"
            valor={opcoes.intensidade}
            min={0}
            max={2}
            passo={0.05}
            aoMudar={(v) => mexer("intensidade", v)}
            formatar={(v) => (v === 0 ? "parada" : `${v.toFixed(2)}×`)}
          />
        </div>

        <div className="flex gap-4 border-t border-line pt-5">
          {(["corTexto", "corBarra"] as const).map((chave) => (
            <label key={chave} className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium">
                {chave === "corTexto" ? "Texto" : "Tarja"}
              </span>
              <input
                type="color"
                value={opcoes[chave]}
                onChange={(e) => mexer(chave, e.target.value)}
                className="h-9 w-full cursor-pointer rounded-card border border-line bg-transparent"
              />
            </label>
          ))}
        </div>

        {erro && <p className="text-[12px] leading-relaxed text-danger">{erro}</p>}

        <div className="flex items-center gap-2 border-t border-line pt-5">
          <Button
            type="button"
            tamanho="sm"
            disabled={salvo || salvando}
            onClick={() =>
              iniciarSalvar(async () => {
                const r = await salvarVideo(videoId, opcoes);
                if (r.ok) {
                  setSalvo(true);
                  setErro(null);
                } else setErro(r.erro);
              })
            }
          >
            <Save className="size-3.5" />
            {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar"}
          </Button>
          <Button
            type="button"
            variante="sutil"
            tamanho="sm"
            onClick={() => {
              setOpcoes(OPCOES_PADRAO);
              setSalvo(false);
            }}
          >
            <RotateCcw className="size-3.5" />
            Voltar ao padrão
          </Button>
        </div>

        <p className="text-[12px] leading-relaxed text-muted-2">
          Mexer aqui não gasta geração. As duas camadas já foram pagas e não mudam — tudo o que
          estes controles fazem é desenhado no seu navegador.
        </p>
      </div>
    </div>
  );
}
