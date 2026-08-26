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
import { IDS_DE_TRANSICAO, TRANSICAO_PADRAO } from "./transicoes";

/* O catálogo de transições mora em `transicoes.ts` — ele cresceu o bastante
   para merecer arquivo próprio. Reexportado aqui para os consumidores não
   precisarem saber de duas portas. */
export * from "./transicoes";

/* O tratamento da letra tambem tem arquivo proprio, pela mesma razao: cresceu. */
export * from "./tratamentos";

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
  /* Só a marca, sem o clube. Serve para post que não é de um time só — e para
     quando a agência quer a abertura assinando ela, não o cliente. */
  logo: { rotulo: "Só a sua logo", nota: "A marca da agência sozinha, no preto", dura: 1.4 },
} as const;

export type Intro = keyof typeof INTROS;

/* =========================================================================
   EFEITOS DE INTRO — COMO a abertura entra, separado de O QUE entra.

   As quatro intros animavam identicamente: escala com fade. Trocar o conteudo
   nao mudava o gesto, entao dois videos com intros diferentes ainda abriam
   igual — que e justamente o que se repara em posts seguidos.

   Separar segue a mesma decomposicao das entradas de texto: conteudo e forma
   sao perguntas diferentes, e cruzar as duas listas da mais combinacoes que
   somar itens numa lista so.
   ========================================================================= */

export const INTRO_EFEITOS = {
  cresce: { rotulo: "Cresce", nota: "Surge pequeno e assenta no tamanho" },
  encolhe: { rotulo: "Encolhe", nota: "Entra grande demais e recua" },
  sobe: { rotulo: "Sobe", nota: "Vem de baixo, firme" },
  gira: { rotulo: "Giro", nota: "Roda até parar de frente" },
  impacto: { rotulo: "Impacto", nota: "Chega seco, com um tranco" },
  desfoca: { rotulo: "Desfoque", nota: "Entra fora de foco e resolve" },
  revela: { rotulo: "Revelação", nota: "Descoberto de baixo para cima" },
  pisca: { rotulo: "Pisca", nota: "Aparece piscando, como painel ligando" },
} as const;

export type IntroEfeito = keyof typeof INTRO_EFEITOS;

/**
 * O estado do elemento da intro num progresso `p` de 0 a 1.
 *
 * Como nas transicoes e nas entradas de texto: a conta mora no contrato porque
 * a previa do seletor precisa da MESMA, e copia divergente vira previa que
 * mente.
 */
export function estiloDoIntro(nome: string, p: number): EstiloDeEntrada {
  const resto = 1 - p;
  switch (nome) {
    case "encolhe":
      return { opacity: Math.min(1, p * 1.6), transform: `scale(${1 + resto * 0.9})` };
    case "sobe":
      return { opacity: p, transform: `translateY(${resto * 90}px)` };
    case "gira":
      return {
        opacity: p,
        transform: `rotate(${resto * -35}deg) scale(${0.8 + 0.2 * p})`,
      };
    case "impacto":
      /* Passa do ponto e volta: um objeto que para exatamente onde chega nao
         tem peso. O excesso e curto e so na cauda do movimento. */
      return {
        opacity: Math.min(1, p * 2.4),
        transform: `scale(${p < 0.72 ? 0.55 + 0.63 * (p / 0.72) : 1.18 - 0.18 * ((p - 0.72) / 0.28)})`,
      };
    case "desfoca":
      return { opacity: p, filter: `blur(${(resto * 22).toFixed(1)}px)` };
    case "revela":
      return { opacity: 1, clipPath: `inset(${(resto * 100).toFixed(1)}% 0 0 0)` };
    case "pisca":
      /* Tres piscadas antes de firmar. O `p * 9` e o que produz os pulsos; a
         rampa do final e o que impede a intro de terminar apagada. */
      return { opacity: p > 0.62 ? 1 : Math.abs(Math.sin(p * 9)) * p * 1.4 };
    default:
      return { opacity: p, transform: `scale(${0.78 + 0.22 * p})` };
  }
}

/* =========================================================================
   ENTRADAS DE TEXTO — como cada linha aparece.

   Ate aqui havia uma só, cravada: deslizar da esquerda com fade. Todo vídeo
   gerado tinha exatamente o mesmo gesto de texto, e é a coisa que mais se
   repara quando se vê dois posts seguidos da mesma agência.

   `porLetra` separa as que animam a linha inteira das que animam caractere a
   caractere. A distinção é do componente, não do gesto: as de linha inteira
   são um `transform`, e as por letra precisam quebrar o texto em pedaços.
   ========================================================================= */

export const ENTRADAS = {
  deslize: { rotulo: "Deslize", nota: "Entra da esquerda, com fade", porLetra: false },
  sobe: { rotulo: "Sobe", nota: "Vem de baixo, como legenda de TV", porLetra: false },
  escala: { rotulo: "Escala", nota: "Cresce a partir do centro", porLetra: false },
  desfoca: { rotulo: "Desfoque", nota: "Entra fora de foco e assenta", porLetra: false },
  varre: { rotulo: "Varredura", nota: "Revelado da esquerda, como uma cortina", porLetra: false },
  cai: { rotulo: "Queda", nota: "Despenca de cima e para seco", porLetra: false },
  letra: { rotulo: "Letra a letra", nota: "Cada caractere entra em sequência", porLetra: true },
  onda: { rotulo: "Onda", nota: "As letras sobem em cascata", porLetra: true },
} as const;

export type Entrada = keyof typeof ENTRADAS;

export type EstiloDeEntrada = {
  opacity: number;
  transform?: string;
  filter?: string;
  clipPath?: string;
};

/**
 * O estado de uma entrada num progresso `p` de 0 a 1.
 *
 * Mesma razão de `deformacaoDaTransicao` estar aqui: a prévia do seletor precisa
 * do MESMO cálculo, e duas cópias divergem no dia em que alguém afina uma delas.
 */
export function estiloDaEntrada(nome: string, p: number): EstiloDeEntrada {
  if (p >= 1) return { opacity: 1 };
  const resto = 1 - p;

  switch (nome) {
    case "sobe":
      return { opacity: p, transform: `translateY(${resto * 46}px)` };
    case "escala":
      return { opacity: p, transform: `scale(${0.82 + 0.18 * p})` };
    case "desfoca":
      return { opacity: p, filter: `blur(${(resto * 13).toFixed(1)}px)` };
    case "varre":
      /* Opacidade cheia de propósito: quem revela é o recorte. Somar fade
         faria a cortina parecer uma transparência, que é outro gesto. */
      return { opacity: 1, clipPath: `inset(0 ${(resto * 100).toFixed(1)}% 0 0)` };
    case "cai":
      return { opacity: Math.min(1, p * 2), transform: `translateY(${-resto * 70}px)` };
    case "letra":
    case "onda":
      /* Por letra, o pedaço é desenhado pelo componente; aqui a linha inteira
         só não atrapalha. */
      return { opacity: 1 };
    default:
      return { opacity: p, transform: `translateX(${-resto * 40}px)` };
  }
}

/**
 * O progresso de UMA letra, dentro de uma linha que entra caractere a caractere.
 *
 * O atraso é proporcional à posição, e não fixo por letra: uma linha de trinta
 * caracteres com 60ms cada levaria quase dois segundos, e o bloco inteiro
 * chegaria atrasado. Assim a linha toda cabe sempre no mesmo tempo, seja
 * "VASCO" ou "SÃO JANUÁRIO".
 */
export function progressoDaLetra(p: number, indice: number, total: number, nome: string) {
  const espalhamento = nome === "onda" ? 0.65 : 0.5;
  const atraso = total <= 1 ? 0 : (indice / (total - 1)) * espalhamento;
  const janela = 1 - espalhamento;
  return Math.max(0, Math.min(1, (p - atraso) / Math.max(0.001, janela)));
}



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
  /* Quao RAPIDO o corte acontece. Multiplicador em vez de segundos porque a
     duracao real depende da duracao do video: um whip de 0,32s num video de 6s
     e o mesmo gesto que num de 15s, e cravar segundos quebraria essa relacao. */
  velocidadeTransicao: z.number().min(0.4).max(2.5),
  /* Como cada linha de texto APARECE. Ate aqui havia uma so, cravada. */
  entradaTexto: z.enum(["deslize", "sobe", "escala", "desfoca", "varre", "cai", "letra", "onda"]),
  /**
   * O que NAO aparece. Lista do que sai, e nao do que fica.
   *
   * Assim um campo novo no roteiro nasce VISIVEL: guardando o que fica, todo
   * video antigo passaria a esconder o campo recem-criado, porque ele nao
   * estaria na lista gravada meses atras.
   *
   * Mesma logica da arte parada, onde campo em branco derruba a linha inteira
   * do prompt em vez de virar aspas vazias que o modelo tenta preencher.
   */
  ocultos: z.array(z.string()),
  intro: z.enum(["nenhuma", "escudo", "escudo-logo", "logo"]),
  introEfeito: z.enum(["cresce", "encolhe", "sobe", "gira", "impacto", "desfoca", "revela", "pisca"]),
  /**
   * OS CORTES do vídeo: quantos, quando e com qual transição.
   *
   * Era um só, no meio, fixo pelo template. Um vídeo de 15s com um corte é uma
   * foto com zoom; um de 6s com cinco é epilepsia. Por isso a lista tem TETO —
   * quatro — e o editor guarda espaçamento mínimo entre eles: dois cortes a
   * 0,1s de distância viram um borrão só, não duas transições.
   *
   * Opcional para os vídeos gravados antes disto existir continuarem válidos;
   * quem os lê cai no corte único do template.
   */
  cortes: z
    .array(z.object({ em: z.number().min(0.4), transicao: z.enum(IDS_DE_TRANSICAO as [string, ...string[]]) }))
    .max(4)
    .optional(),
  /** Legado: o corte único das versões anteriores. */
  transicao: z.string().optional(),
  fonte: z.enum(CHAVES_DE_FONTE),
  /**
   * O TRATAMENTO da letra — contorno, metal, recorte, sombra longa.
   *
   * A falta dele era a distancia real entre o texto do video e o das artes.
   * Nao era limite do codigo: era Anton branco chapado, sem nada.
   */
  tratamento: z.enum([
    "limpo",
    "sombra",
    "contorno",
    "vazado",
    "bloco",
    "longa",
    "metal",
    "ouro",
    "recorte",
  ]),
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
/**
 * O que dá para tirar do vídeo, e como se chama na tela.
 *
 * O NOME do atleta e o DESTAQUE de cada roteiro não entram aqui: um vídeo de
 * gol sem o nome de quem fez o gol não é um vídeo mais limpo, é um vídeo sem
 * assunto.
 */
export const OCULTAVEIS: Record<string, string> = {
  campeonato: "Campeonato",
  adversario: "Adversário",
  clube: "Clube",
  data: "Data",
  hora: "Horário",
  estadio: "Estádio",
};

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
  velocidadeTransicao: 1,
  entradaTexto: "deslize",
  ocultos: [],
  intro: "escudo-logo",
  introEfeito: "cresce",
  cortes: [{ em: 4.3, transicao: TRANSICAO_PADRAO }],
  fonte: "cartaz",
  tratamento: "contorno",
  corTexto: "#ffffff",
  /* Branca, e nao quase-preta. A barra do confronto e o gesto que mais marca a
     referencia — na arte do Criciuma ela e laranja viva atravessando a linha —,
     e os fundos que o modelo gera sao escuros. Barra #0b0b0b sobre fundo escuro
     existe no codigo e nao existe na tela. */
  corBarra: "#ffffff",
};
