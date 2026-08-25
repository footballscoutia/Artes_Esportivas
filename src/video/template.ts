/**
 * O TEMPLATE, portado do `scripts/video.mjs` para o motor novo.
 *
 * O ponto desta migracao e que este arquivo quase nao mudou. A coreografia
 * virou dado antes de o motor ser escolhido, de proposito: o que se joga fora
 * ao trocar de motor e o codigo de DESENHO, nunca a descricao. Quem fez a
 * etapa 1 primeiro paga a migracao uma vez; quem tivesse deixado os tempos
 * cravados dentro do desenho pagaria duas.
 *
 * Aqui isto tambem passa a ser o formato do DOCUMENTO que o editor manipula: as
 * mesmas propriedades que o Remotion Player le ao vivo no navegador sao as que
 * o servidor le para renderizar o mp4. Uma descricao, dois consumidores.
 */

import { z } from "zod";
import { zColor } from "@remotion/zod-types";

/**
 * O template descreve UM ARRANJO, e nao mais uma lista de elementos soltos.
 *
 * A versao anterior posicionava cada linha por coordenada. Isso quebrava assim
 * que o texto mudava de tamanho — "SAO JANUARIO" e "ARENA DA BAIXADA" tem
 * larguras diferentes, e uma das duas sairia torta. Agora o bloco e empilhado
 * pelo layout, e o template so diz ONDE ele comeca e QUANDO cada linha entra.
 */
export type Template = {
  id: string;
  nome: string;
  descricao: string;
  /** Fracao da altura onde o bloco de texto comeca. */
  blocoTopo: number;
  /** Segundo do corte do meio, na linha do tempo de referencia de 8s. */
  corte: number;
  tempos: { campeonato: number; clube: number; confronto: number; dados: number };
};

export const TEMPLATES: Record<string, Template> = {
  /**
   * Modelado na arte de Criciuma x Fortaleza que a agencia mandou: bloco
   * compacto em cima, atleta inteiro e quieto embaixo, camera quase parada.
   */
  confronto: {
    id: "confronto",
    nome: "Confronto",
    descricao: "Bloco compacto no alto, atleta inteiro embaixo. A receita das artes do Márcio.",
    blocoTopo: 0.07,
    corte: 4.3,
    tempos: { campeonato: 2.4, clube: 0.9, confronto: 1.5, dados: 2.1 },
  },

  /**
   * O mesmo arranjo jogado para o pe do quadro. Serve para placa cujo interesse
   * esta em cima — ceu, arquibancada, fumaca — e que a tipografia cobriria.
   */
  rodape: {
    id: "rodape",
    nome: "Rodapé",
    descricao: "O mesmo bloco, ancorado embaixo. Para arte cujo interesse está no alto.",
    blocoTopo: 0.6,
    corte: 3.6,
    tempos: { campeonato: 0.5, clube: 0.9, confronto: 1.5, dados: 2.1 },
  },
};

/* =========================================================================
   O ESQUEMA — e daqui que sai o formulario do editor.

   Nao e so validacao. O Remotion le este esquema e MONTA a interface de
   controle sozinho: enum vira seletor, numero com min/max vira campo com
   limite, cor vira seletor de cor. E o editor que voce pediu, na sua forma
   mais crua, sem uma linha de tela escrita.

   Por isso os tipos sao INFERIDOS do esquema em vez de declarados ao lado
   dele: um tipo e um formulario que podem discordar viram, mais cedo ou mais
   tarde, um controle que grava um valor que o codigo nao aceita.
   ========================================================================= */

export const EsquemaDados = z.object({
  clube: z.string(),
  adversario: z.string(),
  data: z.string(),
  hora: z.string(),
  estadio: z.string(),
  campeonato: z.string(),
});

export const EsquemaCamadas = z.object({
  fundo: z.string(),
  atleta: z.string(),
  logo: z.string().optional(),
});

export const EsquemaOpcoes = z.object({
  template: z.enum(["confronto", "rodape"]),
  /* Os limites nao sao enfeite: sao o que impede o editor de produzir um video
     de 0,2s ou um texto de 40x que estoura o quadro. */
  duracao: z.number().min(4).max(20),
  escalaTexto: z.number().min(0.6).max(2),
  velocidade: z.number().min(0.5).max(2),
  intensidade: z.number().min(0).max(2),
  corTexto: zColor(),
  corBarra: zColor(),
});

export const EsquemaMatchday = z.object({
  dados: EsquemaDados,
  camadas: EsquemaCamadas,
  opcoes: EsquemaOpcoes,
});

export type Dados = z.infer<typeof EsquemaDados>;
export type Camadas = z.infer<typeof EsquemaCamadas>;
export type Opcoes = z.infer<typeof EsquemaOpcoes>;

export const OPCOES_PADRAO: Opcoes = {
  template: "confronto",
  duracao: 8,
  escalaTexto: 1,
  velocidade: 1,
  intensidade: 1,
  corTexto: "#ffffff",
  /* Branca, e nao quase-preta. A barra do confronto e o gesto que mais marca a
     referencia — na arte do Criciuma ela e laranja viva atravessando a linha —,
     e os fundos que o modelo gera sao escuros. Barra #0b0b0b sobre fundo escuro
     existe no codigo e nao existe na tela. */
  corBarra: "#ffffff",
};
