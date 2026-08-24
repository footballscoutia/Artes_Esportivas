/**
 * Escolhas de composicao de uma geracao, e o padrao que as guarda.
 *
 * O contrato do `opcoes` jsonb da tabela `padroes` mora aqui. O banco guarda
 * jsonb solto de proposito — o conjunto vai crescer, e cada opcao nova como
 * coluna custaria migracao e deploy. Em troca, este arquivo e o unico lugar que
 * le e escreve o formato, e `normalizar()` e a fronteira: nada entra no resto
 * do sistema sem passar por ela.
 *
 * REGRA QUE GOVERNA ESTE ARQUIVO: cada controle e uma ZONA, uma FONTE ou um
 * TETO — nunca um desenho.
 *
 * Ela vem de tres tipos de instrucao observados nas correcoes de prompt deste
 * projeto. Adjetivo vago ("textos discretos e legiveis") vira legenda. Forma
 * prescrita ("nome numa barra diagonal") vira clone da referencia. Alavanca
 * nomeada, com a forma decidida pela referencia, funciona — foi assim que a
 * regra da faixa do confronto acertou de primeira.
 *
 * Entao "texto na faixa de cima" pode virar opcao; "texto numa barra diagonal"
 * nao. "Paleta sai do escudo" pode; "fundo azul com degrade" nao. Toda opcao
 * nova aqui precisa passar nesse teste antes de existir.
 */

export const ESCUDO_MODOS = ["ambos", "clube", "adversario", "nenhum"] as const;
export const ZONAS_TEXTO = ["auto", "topo", "base", "lateral"] as const;
export const PALETAS = ["referencia", "clube"] as const;

export type EscudoModo = (typeof ESCUDO_MODOS)[number];
export type ZonaTexto = (typeof ZONAS_TEXTO)[number];
export type Paleta = (typeof PALETAS)[number];

export type Opcoes = {
  escudo: EscudoModo;
  zonaTexto: ZonaTexto;
  paleta: Paleta;
};

/**
 * O default e o comportamento que existia antes de haver opcao.
 *
 * Importa que seja exatamente isso: geracao antiga e geracao de quem nao mexeu
 * em nada precisam sair iguais, senao a personalizacao vira uma mudanca de
 * resultado que ninguem pediu.
 */
export const OPCOES_PADRAO: Opcoes = {
  escudo: "ambos",
  zonaTexto: "auto",
  /**
   * "clube" e o default porque e o que ja acontecia antes de haver opcao: o
   * `blocoDeClubes` emite "A paleta da arte sai dessas cores" sempre que o
   * clube tem cor cadastrada. Comecar em "referencia" mudaria em silencio o
   * resultado de quem nunca abriu a personalizacao.
   */
  paleta: "clube",
};

/** Fronteira: jsonb do banco ou FormData da tela viram `Opcoes` validas. */
export function normalizar(cru: unknown): Opcoes {
  const o = (cru ?? {}) as Record<string, unknown>;
  const escolher = <T extends string>(v: unknown, lista: readonly T[], queda: T): T =>
    lista.includes(v as T) ? (v as T) : queda;

  return {
    escudo: escolher(o.escudo, ESCUDO_MODOS, OPCOES_PADRAO.escudo),
    zonaTexto: escolher(o.zonaTexto, ZONAS_TEXTO, OPCOES_PADRAO.zonaTexto),
    paleta: escolher(o.paleta, PALETAS, OPCOES_PADRAO.paleta),
  };
}

export const ESCUDO_ROTULO: Record<EscudoModo, string> = {
  ambos: "Os dois escudos",
  clube: "Só o do clube",
  adversario: "Só o do adversário",
  nenhum: "Sem escudo",
};

export const ZONA_ROTULO: Record<ZonaTexto, string> = {
  auto: "A referência decide",
  topo: "Faixa de cima",
  base: "Faixa de baixo",
  lateral: "Lateral, ao lado do atleta",
};

export const PALETA_ROTULO: Record<Paleta, string> = {
  referencia: "Da referência de estilo",
  clube: "Das cores do escudo do clube",
};

/**
 * As escolhas viram instrucao para o modelo.
 *
 * Cada bloco abaixo nomeia uma alavanca e para de falar. O que NAO esta aqui e
 * tao importante quanto o que esta: nenhum bloco descreve forma, cor exata,
 * fonte ou arranjo — isso continua saindo da referencia.
 */
export function blocoDeOpcoes(o: Opcoes): string {
  const partes: string[] = [];

  /**
   * O "nenhum" precisa dizer o que ocupa o lugar vazio.
   *
   * Tirar um elemento sem dizer isso troca um defeito por outro: area livre sem
   * instrucao e onde o modelo inventa. Numa arte Vasco x Cabofriense ele encheu
   * fundo sobrando com bandeira do Uruguai e mapas; noutra, com estatua, arco e
   * uma cuia de chimarrao. E quando o escudo era obrigatorio num quadro com
   * espaco de sobra, ele saiu tres vezes em tres tamanhos.
   *
   * Os casos "clube" e "adversario" nao repetem a proibicao: quem apaga o
   * escudo e o proprio `ClubeNaArte.escudo`, e o `blocoDeClubes` ja escreve
   * "nao desenhar escudo algum" para o clube que ficou sem. Aqui entra so o que
   * ele nao diz — que a area liberada continua vazia.
   */
  if (o.escudo === "nenhum") {
    partes.push(
      "NAO HA ESCUDO nesta arte. Nenhum escudo de clube aparece, em lugar nenhum — " +
        "nem pequeno, nem como marca dagua, nem dentro de outro elemento. O espaco " +
        "que ele ocuparia fica VAZIO: nao substituir por simbolo, marca, emblema, " +
        "forma nem objeto. Area limpa aqui e o resultado pedido, nao uma falta.",
    );
  } else if (o.escudo !== "ambos") {
    partes.push(
      "So um dos clubes leva escudo nesta arte. O lugar onde entraria o segundo " +
        "fica VAZIO — nao inventar escudo para ocupa-lo, nem repetir o que entrou " +
        "para equilibrar a composicao.",
    );
  }

  /**
   * Zona, nao desenho. A faixa e escolhida; a forma dentro dela continua saindo
   * da referencia. Foi assim que a regra da faixa do confronto acertou.
   */
  const zona: Record<Exclude<ZonaTexto, "auto">, string> = {
    topo: "na FAIXA DE CIMA do quadro, acima da cabeca do atleta",
    base: "na FAIXA DE BAIXO do quadro, da cintura do atleta para o pe",
    lateral: "na LATERAL do quadro, na coluna ao lado do corpo do atleta",
  };
  if (o.zonaTexto !== "auto") {
    partes.push(
      `O bloco principal de texto fica ${zona[o.zonaTexto]}. Essa e a faixa, nao o ` +
        "desenho: o tratamento das linhas — peso, caixa, entreletra, recipiente — " +
        "continua saindo da referencia de estilo. Se o texto nao couber inteiro " +
        "nessa faixa, o bloco diminui junto; o que nao pode e uma parte migrar para " +
        "outra faixa e o conjunto ficar repartido pelo quadro.",
    );
  }

  /**
   * Fonte da paleta, nao a paleta. Dizer as cores produziria clone.
   *
   * So "referencia" fala aqui. "clube" e exatamente o que o `blocoDeClubes` ja
   * produz a partir das cores cadastradas, e repetir a mesma instrucao em dois
   * lugares e como manter duas regras do nome do atleta se contradizendo.
   */
  if (o.paleta === "referencia") {
    partes.push(
      "A paleta desta arte sai da REFERENCIA DE ESTILO, e nao das cores do clube. " +
        "As cores do clube continuam valendo dentro do escudo e do uniforme, que " +
        "sao reproduzidos fielmente, mas nao mandam no fundo nem nos elementos " +
        "grandes da composicao.",
    );
  }

  /* Linha em branco antes e entre os blocos: eles chegam depois do prompt-mae
     e precisam ler como secao propria, nao como continuacao da ultima frase. */
  const SEPARADOR = "\n\n";
  return partes.length ? SEPARADOR + partes.join(SEPARADOR) : "";
}
