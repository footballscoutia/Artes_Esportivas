export const TIPOS = [
  "matchday",
  "contratacao",
  "gol",
  "convocado",
  "estreia",
  "mvp",
  "aniversario",
  "frase",
] as const;
export type Tipo = (typeof TIPOS)[number];

export const FORMATOS = ["feed_4x5", "story_9x16"] as const;
export type Formato = (typeof FORMATOS)[number];

export const STATUS = ["rascunho", "em_revisao", "aprovado", "publicado"] as const;
export type Status = (typeof STATUS)[number];

export type Papel = "submete" | "aprova";

/**
 * Metadados de apresentacao — o usuario escolhe por aqui, nunca escreve prompt.
 *
 * Sem `numero`: a ordem das categorias nao carrega informacao nenhuma, e
 * numero de secao decorativo e uma das assinaturas mais reconheciveis de
 * interface gerada por maquina.
 *
 * `exigeJogo` liga os campos de partida no /novo. So matchday precisa deles, e
 * sem eles o modelo inventaria data e adversario — que e pior que nome errado,
 * porque data inventada parece certa e ninguem confere.
 */
export const TIPO_META: Record<
  Tipo,
  {
    titulo: string;
    descricao: string;
    rotulo: string;
    exigeFrase: boolean;
    exigeJogo: boolean;
  }
> = {
  matchday: {
    titulo: "Matchday",
    descricao: "Anúncio do próximo jogo, com adversário e horário",
    rotulo: "MATCHDAY",
    exigeFrase: false,
    exigeJogo: true,
  },
  contratacao: {
    titulo: "Contratação",
    descricao: "Anúncio de chegada do atleta ao novo clube",
    rotulo: "BEM-VINDO",
    exigeFrase: false,
    exigeJogo: false,
  },
  gol: {
    titulo: "Gol",
    descricao: "Comemoração de gol marcado na partida",
    rotulo: "GOLAÇO",
    exigeFrase: false,
    exigeJogo: false,
  },
  convocado: {
    titulo: "Convocado",
    descricao: "Chamado para a seleção nacional",
    rotulo: "CONVOCADO",
    exigeFrase: false,
    exigeJogo: false,
  },
  estreia: {
    titulo: "Estreia",
    descricao: "Primeira partida com a camisa do clube",
    rotulo: "PRIMEIRO JOGO",
    exigeFrase: false,
    exigeJogo: false,
  },
  mvp: {
    titulo: "Craque do jogo",
    descricao: "Destaque da partida, melhor em campo",
    rotulo: "MELHOR EM CAMPO",
    exigeFrase: false,
    exigeJogo: false,
  },
  aniversario: {
    titulo: "Aniversário",
    descricao: "Felicitação de aniversário do atleta",
    rotulo: "PARABÉNS",
    exigeFrase: false,
    exigeJogo: false,
  },
  frase: {
    titulo: "Frase",
    descricao: "Declaração do atleta em destaque na arte",
    rotulo: "EM SUAS PALAVRAS",
    exigeFrase: true,
    exigeJogo: false,
  },
};

export const FORMATO_META: Record<
  Formato,
  { titulo: string; descricao: string; w: number; h: number; ratio: string }
> = {
  feed_4x5: {
    titulo: "Feed",
    descricao: "Publicação no perfil",
    w: 1080,
    h: 1350,
    ratio: "4 / 5",
  },
  story_9x16: {
    titulo: "Story",
    descricao: "Story e Reels capa",
    w: 1080,
    h: 1920,
    ratio: "9 / 16",
  },
};

export const STATUS_META: Record<Status, { titulo: string; cor: string }> = {
  rascunho: { titulo: "Rascunho", cor: "var(--color-muted)" },
  em_revisao: { titulo: "Em revisão", cor: "var(--color-warn)" },
  aprovado: { titulo: "Aprovado", cor: "var(--color-ok)" },
  publicado: { titulo: "Publicado", cor: "var(--color-accent)" },
};

export type Referencia = {
  id: string;
  tipo: Tipo;
  formato: Formato;
  imagem_url: string | null;
  prompt_mae: string;
  versao: number;
  ativa: boolean;
  atualizado_em: string;
};

export type Pedido = {
  id: string;
  tipo: Tipo;
  formato: Formato;
  foto_jogador_url: string | null;
  nome_jogador: string;
  clube?: string | null;
  frase?: string | null;
  /** De qual atleta da carteira este pedido saiu. Nulo nos pedidos antigos. */
  jogador_id?: string | null;
  clube_id?: string | null;
  adversario_id?: string | null;
  /** So preenchidos quando o tipo e matchday. */
  adversario?: string | null;
  data_jogo?: string | null;
  hora_jogo?: string | null;
  campeonato?: string | null;
  estadio?: string | null;
  referencia_id: string | null;
  referencia_versao: number | null;
  status: Status;
  /** uuid de quem criou — no banco e FK para perfis, nao o nome. */
  criado_por: string;
  aprovado_por: string | null;
  /** Nome resolvido pelo join com perfis. E o que a tela mostra. */
  criado_por_nome: string;
  aprovado_por_nome: string | null;
  criado_em: string;
};

export type Geracao = {
  id: string;
  pedido_id: string;
  imagem_url: string | null;
  aprovada: boolean;
  motivo_recusa: string | null;
  custo_usd: number;
  modelo: string;
  /** qual adapter respondeu — "mock", "gemini", "recomposicao". Serve para comparar modelos. */
  provider?: string;
  duracao_ms?: number | null;
  /** Qual marca entrou nesta tentativa. Nulo = sem logo. */
  marca_id?: string | null;
  posicao_logo?: PosicaoLogo | "nenhuma" | null;
  /**
   * Quem posicionou a logo. Nulo nas geracoes anteriores a esta coluna — e por
   * isso a tela testa por igualdade a "ia", nunca por diferenca: nulo e
   * carimbo, que e como tudo funcionava antes.
   */
  logo_modo?: LogoModo | null;
  criado_em: string;
};

export const POSICOES_LOGO = [
  "inferior-direito",
  "inferior-esquerdo",
  "superior-direito",
  "superior-esquerdo",
] as const;
export type PosicaoLogo = (typeof POSICOES_LOGO)[number];

/**
 * Como a logo entra na arte. Os dois modos falham de maneiras opostas, e por
 * isso os dois ficam — nao ha modo certo, ha o que cada arte pede.
 */
export const LOGO_MODOS = ["ia", "carimbo", "nenhuma"] as const;
export type LogoModo = (typeof LOGO_MODOS)[number];

export const LOGO_MODO_META: Record<LogoModo, { titulo: string; dica: string }> = {
  ia: {
    titulo: "A IA posiciona",
    dica: "A logo vai junto no pedido e o modelo a integra onde couber melhor, com a luz da arte. Quem escolhe o lugar viu a imagem.",
  },
  carimbo: {
    titulo: "Canto fixo",
    dica: "O código cola a logo original por cima, num canto que você escolhe. A forma sai exata, mas o lugar é escolhido antes de a arte existir.",
  },
  nenhuma: { titulo: "Sem logo", dica: "A arte sai limpa." },
};

/**
 * Cor pedida para a logo.
 *
 * A forma vem sempre do alfa do arquivo — so o RGB e trocado, entao um PNG com
 * recorte limpo continua com o mesmo recorte. Logo com fundo branco chapado nao
 * ganha nada aqui: o que muda de cor e o desenho, e o retangulo branco e parte
 * do desenho para quem so olha o alfa.
 */
export const LOGO_CORES = ["original", "auto", "branca", "preta"] as const;
export type LogoCorPreset = (typeof LOGO_CORES)[number];

export const LOGO_COR_META: Record<LogoCorPreset, { titulo: string; dica: string }> = {
  original: { titulo: "Original", dica: "As cores do arquivo" },
  auto: { titulo: "Automática", dica: "Clara ou escura, pelo lugar onde ela cai" },
  branca: { titulo: "Branca", dica: "Para artes escuras" },
  preta: { titulo: "Preta", dica: "Para artes claras" },
};

/** O que os presets viram na hora de pintar. `auto` e decidido na composicao. */
export const LOGO_COR_HEX: Record<"branca" | "preta", string> = {
  branca: "#FFFFFF",
  preta: "#0B0D10",
};

export const POSICAO_LOGO_ROTULO: Record<PosicaoLogo, string> = {
  "inferior-direito": "Inferior direito",
  "inferior-esquerdo": "Inferior esquerdo",
  "superior-direito": "Superior direito",
  "superior-esquerdo": "Superior esquerdo",
};

/**
 * Logo que a arte pode levar carimbada. Cada org cadastra a propria — a
 * agencia e cada cliente dela — e escolhe qual entra em cada geracao.
 */
export type Marca = {
  id: string;
  nome: string;
  imagem_url: string | null;
  ativa: boolean;
  criado_em: string;
};

/**
 * Clube cadastrado.
 *
 * O escudo vai para o modelo como imagem de referencia; as cores entram no
 * prompt como texto. Nas artes do acervo a paleta inteira sai do clube.
 */
export type Clube = {
  id: string;
  nome: string;
  nome_curto: string | null;
  escudo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  ativo: boolean;
  criado_em: string;
};

/**
 * Atleta da carteira da agencia.
 *
 * Cadastrado uma vez, escolhido a cada post. `foto_url` guarda o caminho no
 * bucket privado; a tela recebe URL assinada.
 */
export type Jogador = {
  id: string;
  nome: string;
  clube: string | null;
  posicao: string | null;
  foto_url: string | null;
  clube_id: string | null;
  ativo: boolean;
  criado_em: string;
};

/** Quem esta usando o sistema. Sai do join de auth.users com perfis. */
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  /**
   * `papel` e `podeGerar` respondem coisas diferentes e nao se substituem.
   *
   * `papel` e da ORGANIZACAO: quem, dentro da agencia, aprova uma arte. Quem
   * cria a agencia nasce aprovando a propria — e por isso o papel nao serve
   * para segurar gasto: seria a permissao se autoconcedendo no cadastro.
   *
   * `podeGerar` e da PLATAFORMA: se esta conta pode chamar o modelo e gastar
   * saldo. So o dono do saldo (`ehAdmin`) muda esse valor, e ninguem nasce com
   * ele ligado.
   */
  podeGerar: boolean;
  ehAdmin: boolean;
};

/** Uma linha do painel de acessos — so o administrador da plataforma ve. */
export type Acesso = {
  id: string;
  nome: string;
  email: string;
  organizacao: string;
  pode_gerar: boolean;
  admin_plataforma: boolean;
  criado_em: string;
  geracoes_da_org: number;
  gasto_da_org_usd: number;
};
