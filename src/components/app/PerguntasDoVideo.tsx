"use client";

import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EscolhasDeVideo } from "@/components/app/EscolhasDeVideo";
import { OPCOES_PADRAO, type Opcoes } from "@/video/template";

/**
 * As perguntas ANTES de gerar, para um pedido que ja existe.
 *
 * Nenhuma destas escolhas muda o que o modelo desenha — todas continuam
 * editaveis depois, de graca, no editor. Elas existem por outro motivo: um
 * video que nasce com a cara que a pessoa queria e um resultado; um video que
 * nasce no padrao e precisa ser consertado e uma tarefa.
 *
 * O que SAI daqui de proposito: atleta, clube, uniforme e referencia. Eles ja
 * foram escolhidos quando a arte foi gerada, e repetir a pergunta aqui seria
 * pedir duas vezes a mesma coisa. Quem quiser decidir tudo do zero entra por
 * "Novo vídeo".
 */

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  gerando: boolean;
  aoGerar: (opcoes: Opcoes) => void;
  /** A palavra usada na amostra de fonte. O nome do clube diz mais. */
  amostra?: string;
  /**
   * O tipo do pedido. Nao e uma pergunta aqui — a arte ja existe e ja tem um —,
   * mas o painel precisa dele: e o tipo que escolhe o roteiro de linhas, e a
   * forma da linha dos dados so faz sentido onde essa linha existe.
   */
  tipo: string;
};

export function PerguntasDoVideo({ aberto, aoFechar, gerando, aoGerar, amostra, tipo }: Props) {
  const [o, setO] = useState<Opcoes>({ ...OPCOES_PADRAO, tipo });

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
      <EscolhasDeVideo
        opcoes={o}
        aoMudar={(k, v) => setO((a) => ({ ...a, [k]: v }))}
        colunas={2}
        amostraDoTexto={amostra || "GOLAÇO"}
      />
    </Drawer>
  );
}
