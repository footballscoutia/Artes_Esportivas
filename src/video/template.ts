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

/**
 * As CHAVES de fonte vivem aqui, e os desenhos vivem em fontes.ts.
 *
 * O esquema precisa da lista para validar, e o servidor precisa do esquema — mas
 * o servidor nao pode carregar o Remotion. Duplicar so os nomes e o preco de
 * manter este arquivo livre de motor de video.
 */
export const CHAVES_DE_FONTE = ["cartaz", "estadio", "bloco", "jornal", "veloz"] as const;
export type Fonte = (typeof CHAVES_DE_FONTE)[number];


/* =========================================================================
   INTRO — a abertura, copiada da referencia do Criciuma.

   Nao custa geracao: o escudo e a logo ja estao cadastrados, e a abertura e
   desenhada em codigo. Por isso ela e uma escolha barata de oferecer.
   ========================================================================= */

export const INTROS = {
  nenhuma: { rotulo: "Sem intro", nota: "Começa direto na arte", dura: 0 },
  escudo: { rotulo: "Escudo do clube", nota: "O escudo surge no preto e o nome embaixo", dura: 1.3 },
  "escudo-logo": {
    rotulo: "Escudo + sua logo",
    nota: "O escudo surge, e a sua marca assina embaixo dele",
    dura: 1.7,
  },
} as const;

export type Intro = keyof typeof INTROS;

/* =========================================================================
   TRANSICOES — o que acontece nos poucos quadros em volta do corte do meio.
   ========================================================================= */

export const TRANSICOES = {
  corte: { rotulo: "Corte seco", nota: "Sem efeito nenhum" },
  flash: { rotulo: "Estouro", nota: "Um clarão branco curto" },
  whip: { rotulo: "Whip", nota: "Arrasto lateral borrado, como virar a câmera" },
  punch: { rotulo: "Punch", nota: "Avanço rápido com desfoque" },
  fecha: { rotulo: "Fecha e abre", nota: "O quadro escurece e volta" },
  desliza: { rotulo: "Deslize", nota: "O quadro escorrega para o lado e volta" },
  sobe: { rotulo: "Sobe", nota: "Empurra de baixo para cima" },
  tremor: { rotulo: "Tremor", nota: "Sacode curto, de impacto" },
  gira: { rotulo: "Giro", nota: "Inclina e desinclina, com um leve avanço" },
  estica: { rotulo: "Estica", nota: "Alonga na horizontal, como fita passando" },
} as const;

export type Transicao = keyof typeof TRANSICOES;

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
  /* O rotulo do tipo — "GOLACO", "BEM-VINDO", "MATCHDAY". Ele e o assunto do
     video, e sua ausencia era o defeito: um video de gol que so falava do
     confronto e um matchday com o nome errado. */
  rotulo: z.string(),
  nome: z.string(),
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
  /* O escudo nao e camada gerada: vem do cadastro do clube, e so a intro o usa. */
  escudo: z.string().optional(),
});

export const EsquemaOpcoes = z.object({
  template: z.enum(["confronto", "rodape"]),
  /* Guardado nas opcoes e nao so no pedido: o roteiro depende dele, e o
     componente recebe opcoes, nao o pedido. */
  tipo: z.string(),
  /* Os limites nao sao enfeite: sao o que impede o editor de produzir um video
     de 0,2s ou um texto de 40x que estoura o quadro. */
  duracao: z.number().min(4).max(20),
  escalaTexto: z.number().min(0.6).max(2),
  velocidade: z.number().min(0.5).max(2),
  intensidade: z.number().min(0).max(2),
  intro: z.enum(["nenhuma", "escudo", "escudo-logo"]),
  transicao: z.enum(["corte", "flash", "whip", "punch", "fecha"]),
  fonte: z.enum(CHAVES_DE_FONTE),
  /* Hex simples em vez de zColor(): aquele vem do @remotion/zod-types e
     arrastaria o Remotion para dentro deste arquivo de novo. O preco e o
     Studio mostrar um campo de texto em vez de um seletor — na tela do produto
     o seletor de cor e nativo e continua igual. */
  corTexto: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    corBarra: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const EsquemaMatchday = z.object({
  dados: EsquemaDados,
  camadas: EsquemaCamadas,
  opcoes: EsquemaOpcoes,
});

export type Dados = z.infer<typeof EsquemaDados>;
export type Camadas = z.infer<typeof EsquemaCamadas>;
export type Opcoes = z.infer<typeof EsquemaOpcoes>;

/**
 * QUAIS LINHAS o vídeo escreve, e em que ordem — por tipo de arte.
 *
 * Isto faltava, e o defeito era visível: um vídeo de GOL saía falando de
 * confronto, data e estádio, porque a composição tinha o conteúdo do matchday
 * cravado e ignorava o tipo. Um gol não tem adversário nem estádio para
 * anunciar; ele tem o ATLETA e o feito.
 *
 * Cada linha nomeia um PAPEL, e não um campo: "destaque" é o que aparece
 * grande, e no matchday isso é o clube enquanto num gol é o nome do atleta. O
 * desenho não precisa saber de tipo nenhum — só de papéis.
 */
export type Papel = "etiqueta" | "destaque" | "confronto" | "tarja";

export type Roteiro = { papel: Papel; campo: keyof Dados; prefixo?: string }[];

const ROTEIRO_DE_JOGO: Roteiro = [
  { papel: "etiqueta", campo: "campeonato" },
  { papel: "destaque", campo: "clube" },
  { papel: "confronto", campo: "adversario", prefixo: "X " },
  { papel: "tarja", campo: "data" },
];

/** Tudo que não é confronto anuncia uma PESSOA, e o roteiro é o mesmo. */
const ROTEIRO_DE_ATLETA: Roteiro = [
  { papel: "etiqueta", campo: "rotulo" },
  { papel: "destaque", campo: "nome" },
  { papel: "confronto", campo: "clube" },
];

export const ROTEIROS: Record<string, Roteiro> = {
  matchday: ROTEIRO_DE_JOGO,
  gol: ROTEIRO_DE_ATLETA,
  contratacao: ROTEIRO_DE_ATLETA,
  estreia: ROTEIRO_DE_ATLETA,
  mvp: ROTEIRO_DE_ATLETA,
  aniversario: ROTEIRO_DE_ATLETA,
  convocado: ROTEIRO_DE_ATLETA,
  frase: ROTEIRO_DE_ATLETA,
};

export const OPCOES_PADRAO: Opcoes = {
  template: "confronto",
  tipo: "matchday",
  duracao: 8,
  escalaTexto: 1,
  velocidade: 1,
  intensidade: 1,
  intro: "escudo-logo",
  transicao: "whip",
  fonte: "cartaz",
  corTexto: "#ffffff",
  /* Branca, e nao quase-preta. A barra do confronto e o gesto que mais marca a
     referencia — na arte do Criciuma ela e laranja viva atravessando a linha —,
     e os fundos que o modelo gera sao escuros. Barra #0b0b0b sobre fundo escuro
     existe no codigo e nao existe na tela. */
  corBarra: "#ffffff",
};
