"use client";

import { useState } from "react";
import { Check, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import {
  FONTES,
  INTROS,
  OPCOES_PADRAO,
  TEMPLATES,
  TRANSICOES,
  type Opcoes,
} from "@/video/template";
import { cn } from "@/lib/utils";

/**
 * As perguntas ANTES de gerar.
 *
 * Nenhuma destas escolhas muda o que o modelo desenha — todas continuam
 * editaveis depois, de graca, no editor. Elas existem por outro motivo: um
 * video que nasce com a cara que a pessoa queria e um resultado; um video que
 * nasce no padrao e precisa ser consertado e uma tarefa.
 *
 * O que SAI daqui de proposito: as duas camadas. Elas custam dinheiro e sao
 * decididas pelo pedido — atleta, clube, uniforme e referencia ja foram
 * escolhidos quando a arte foi gerada, e repetir a pergunta aqui seria pedir
 * duas vezes a mesma coisa.
 */

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  gerando: boolean;
  aoGerar: (opcoes: Opcoes) => void;
};

function Grupo<T extends string>({
  titulo,
  itens,
  atual,
  aoEscolher,
}: {
  titulo: string;
  itens: Record<string, { rotulo: string; nota?: string; descricao?: string }>;
  atual: T;
  aoEscolher: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">{titulo}</p>
      <div className="grid gap-1.5 min-[520px]:grid-cols-2">
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
            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-2">
              {item.nota ?? item.descricao}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PerguntasDoVideo({ aberto, aoFechar, gerando, aoGerar }: Props) {
  const [o, setO] = useState<Opcoes>(OPCOES_PADRAO);
  const mexer = <K extends keyof Opcoes>(k: K, v: Opcoes[K]) => setO((a) => ({ ...a, [k]: v }));

  /* A intro soma tempo ao video, e por isso o total aparece aqui: escolher
     "escudo + logo" e 8 segundos produz 9,7s de video, e ninguem deveria
     descobrir isso depois de gerar. */
  const totalComIntro = o.duracao + INTROS[o.intro].dura;

  return (
    <Drawer
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Como vai ser o vídeo"
      subtitulo="Tudo aqui continua editável depois, sem gastar nada."
      rodape={
        <div className="flex flex-col gap-2">
          <Button className="w-full" disabled={gerando} onClick={() => aoGerar(o)}>
            <Clapperboard size={15} />
            {gerando ? "Gerando camadas…" : "Gerar vídeo"}
          </Button>
          <p className="text-[11px] leading-relaxed text-muted-2">
            Gerar cria duas camadas novas — o cenário e o atleta recortado — e custa duas
            gerações. É a única parte que custa: a intro, as transições e a tipografia são
            desenhadas pelo MatchPost.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Os templates trazem `nome`/`descricao` em vez de `rotulo`/`nota`,
            porque são a descrição de um arranjo e não um item de menu. A
            adaptação mora aqui, no consumidor, e não no catálogo. */}
        <Grupo
          titulo="Arranjo"
          itens={Object.fromEntries(
            Object.entries(TEMPLATES).map(([k, t]) => [k, { rotulo: t.nome, nota: t.descricao }]),
          )}
          atual={o.template}
          aoEscolher={(v) => mexer("template", v)}
        />

        <Grupo titulo="Intro" itens={INTROS} atual={o.intro} aoEscolher={(v) => mexer("intro", v)} />

        <Grupo
          titulo="Transição do meio"
          itens={TRANSICOES}
          atual={o.transicao}
          aoEscolher={(v) => mexer("transicao", v)}
        />

        <Grupo titulo="Fonte" itens={FONTES} atual={o.fonte} aoEscolher={(v) => mexer("fonte", v)} />

        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-[13px] font-medium">
            <span>
              Duração <span className="text-muted-2 font-normal">da arte</span>
            </span>
            <span className="tabular-nums text-[12px] text-muted">{o.duracao}s</span>
          </span>
          <input
            type="range"
            min={4}
            max={20}
            step={0.5}
            value={o.duracao}
            onChange={(ev) => mexer("duracao", Number(ev.target.value))}
            className="accent-accent"
          />
          {INTROS[o.intro].dura > 0 && (
            <span className="text-[12px] text-muted-2">
              Com a intro, o vídeo fica com {totalComIntro.toFixed(1).replace(".", ",")}s.
            </span>
          )}
        </label>
      </div>
    </Drawer>
  );
}
