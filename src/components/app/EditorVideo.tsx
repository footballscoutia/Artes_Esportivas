"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Check, Download, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Matchday } from "@/video/Matchday";
import {
  FONTES,
  INTROS,
  OPCOES_PADRAO,
  TEMPLATES,
  TRANSICOES,
  type Camadas,
  type Dados,
  type Opcoes,
} from "@/video/template";
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
  /** Vira o nome do arquivo baixado. */
  nomeArquivo: string;
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

/**
 * Um grupo de escolhas com rotulo e explicacao.
 *
 * A NOTA de cada opcao nao e enfeite: "Whip" e "Punch" nao querem dizer nada
 * para quem monta post, e um seletor com cinco nomes tecnicos vira tentativa e
 * erro. A frase curta transforma a lista em decisao.
 */
function Escolha<T extends string>({
  titulo,
  ajuda,
  itens,
  atual,
  aoEscolher,
}: {
  titulo: string;
  ajuda: string;
  itens: Record<string, { rotulo: string; nota?: string }>;
  atual: T;
  aoEscolher: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">
        {titulo} <span className="text-muted-2 font-normal">{ajuda}</span>
      </p>
      <div className="flex flex-col gap-1.5">
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

export function EditorVideo({ videoId, dados, camadas, opcoesIniciais, nomeArquivo }: Props) {
  const [opcoes, setOpcoes] = useState<Opcoes>(opcoesIniciais);
  const [salvo, setSalvo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const player = useRef<PlayerRef>(null);

  /**
   * O RENDER ACONTECE NO NAVEGADOR DA PESSOA.
   *
   * Esta era a peca que faltava, e a resposta acabou sendo a mais barata das
   * possiveis. O caminho classico — `@remotion/renderer` no servidor — precisa
   * de Chromium, que nao roda em funcao serverless comum: exigiria Lambda na
   * AWS, um conteiner proprio ou uma maquina ligada, com custo mensal e uma
   * conta a mais para administrar.
   *
   * O `renderMediaOnWeb` usa WebCodecs, que ja existe no Chrome. O video e
   * codificado na maquina de quem edita, com aceleracao de hardware, e sai um
   * mp4 do mesmo componente que o Player esta tocando. Custo de servidor: zero.
   * Infraestrutura nova: nenhuma.
   *
   * O preco e honesto e vale dizer: quem renderiza e a maquina da pessoa, entao
   * um computador fraco demora mais, e navegador sem WebCodecs nao renderiza. Por
   * isso a checagem de suporte vem ANTES do botao, e nao depois do clique.
   */
  const [renderizando, setRenderizando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [semSuporte, setSemSuporte] = useState<string | null>(null);

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

  /* A checagem roda uma vez, na montagem: descobrir que o navegador nao serve
     DEPOIS de esperar o render seria a pior hora possivel. */
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const { canRenderMediaOnWeb } = await import("@remotion/web-renderer");
        const r = await canRenderMediaOnWeb({
          container: "mp4",
          videoCodec: "h264",
          width: 1080,
          height: 1920,
        });
        if (vivo && !r.canRender) {
          setSemSuporte(
            "Este navegador não consegue renderizar vídeo. O Chrome no computador consegue.",
          );
        }
      } catch {
        /* Sem a checagem, o botao continua: melhor tentar e falhar com mensagem
           do que esconder a funcao por causa de uma deteccao que nao rodou. */
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function renderizar() {
    setRenderizando(true);
    setProgresso(0);
    setErro(null);
    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");
      const r = await renderMediaOnWeb({
        composition: {
          id: "matchday",
          component: Matchday,
          width: 1080,
          height: 1920,
          fps: FPS,
          durationInFrames: quadros,
          /* O tipo exige defaultProps; quem manda de verdade e o inputProps
             logo abaixo, com o estado atual dos controles. */
          defaultProps: props,
        },
        inputProps: props,
        container: "mp4",
        videoCodec: "h264",
        onProgress: (p) => setProgresso(p.progress),
      });

      const blob = await r.getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nomeArquivo}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui renderizar o vídeo.");
    } finally {
      setRenderizando(false);
    }
  }

  /* Duracao menor com o cursor la na frente deixaria o Player fora de faixa. */
  useEffect(() => {
    const atual = player.current?.getCurrentFrame?.() ?? 0;
    if (atual >= quadros) player.current?.seekTo(Math.max(0, quadros - 1));
  }, [quadros]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/**
       * O preview e limitado pela ALTURA, e nao pela largura.
       *
       * Uma composicao 9:16 a `width: 100%` numa coluna larga vira um monstro
       * vertical: o video some para fora da tela e a pessoa edita rolando a
       * pagina, sem nunca ver o quadro inteiro. Em video vertical quem manda e
       * a altura disponivel — a largura sai dela.
       */}
      <div className="flex items-start justify-center">
        <div
          className="surface overflow-hidden rounded-card"
          style={{ height: "min(74vh, 720px)", aspectRatio: "9 / 16" }}
        >
          <Player
            ref={player}
            component={Matchday}
            inputProps={props}
            durationInFrames={quadros}
            fps={FPS}
            compositionWidth={1080}
            compositionHeight={1920}
            style={{ width: "100%", height: "100%" }}
            controls
            loop
          />
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:max-h-[74vh] lg:overflow-y-auto lg:pr-1">
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

        <div className="border-t border-line pt-5">
          <Escolha
            titulo="Intro"
            ajuda="a abertura"
            itens={INTROS}
            atual={opcoes.intro}
            aoEscolher={(v) => mexer("intro", v)}
          />
        </div>

        <div className="border-t border-line pt-5">
          <Escolha
            titulo="Transição"
            ajuda="o corte do meio"
            itens={TRANSICOES}
            atual={opcoes.transicao}
            aoEscolher={(v) => mexer("transicao", v)}
          />
        </div>

        <div className="border-t border-line pt-5">
          <Escolha
            titulo="Fonte"
            ajuda="a tipografia"
            itens={FONTES}
            atual={opcoes.fonte}
            aoEscolher={(v) => mexer("fonte", v)}
          />
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

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <Button className="w-full" disabled={renderizando || Boolean(semSuporte)} onClick={renderizar}>
            <Download className="size-3.5" />
            {renderizando
              ? `Renderizando… ${Math.round(progresso * 100)}%`
              : "Renderizar e baixar"}
          </Button>
          {renderizando && (
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{ width: `${Math.round(progresso * 100)}%` }}
              />
            </div>
          )}
          {semSuporte && (
            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {semSuporte}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-muted-2">
            O vídeo é montado no seu computador, não num servidor. Não custa nada, e enquanto
            renderiza é melhor deixar esta aba aberta.
          </p>
        </div>

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
