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
 * `exigeJogo` liga os campos de partida no /novo. So matchday precisa deles, e
 * sem eles o modelo inventaria data e adversario — que e pior que nome errado,
 * porque data inventada parece certa e ninguem confere.
 */
export const TIPO_META: Record<
  Tipo,
  {
    numero: string;
    titulo: string;
    descricao: string;
    rotulo: string;
    exigeFrase: boolean;
    exigeJogo: boolean;
  }
> = {
  matchday: {
    numero: "01",
    titulo: "Matchday",
    descricao: "Anúncio do próximo jogo, com adversário e horário",
    rotulo: "MATCHDAY",
    exigeFrase: false,
    exigeJogo: true,
  },
  contratacao: {
    numero: "02",
    titulo: "Contratação",
    descricao: "Anúncio de chegada do atleta ao novo clube",
    rotulo: "BEM-VINDO",
    exigeFrase: false,
    exigeJogo: false,
  },
  gol: {
    numero: "03",
    titulo: "Gol",
    descricao: "Comemoração de gol marcado na partida",
    rotulo: "GOLAÇO",
    exigeFrase: false,
    exigeJogo: false,
  },
  convocado: {
    numero: "04",
    titulo: "Convocado",
    descricao: "Chamado para a seleção nacional",
    rotulo: "CONVOCADO",
    exigeFrase: false,
    exigeJogo: false,
  },
  estreia: {
    numero: "05",
    titulo: "Estreia",
    descricao: "Primeira partida com a camisa do clube",
    rotulo: "PRIMEIRO JOGO",
    exigeFrase: false,
    exigeJogo: false,
  },
  mvp: {
    numero: "06",
    titulo: "Craque do jogo",
    descricao: "Destaque da partida, melhor em campo",
    rotulo: "MELHOR EM CAMPO",
    exigeFrase: false,
    exigeJogo: false,
  },
  aniversario: {
    numero: "07",
    titulo: "Aniversário",
    descricao: "Felicitação de aniversário do atleta",
    rotulo: "PARABÉNS",
    exigeFrase: false,
    exigeJogo: false,
  },
  frase: {
    numero: "08",
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
  publicado: { titulo: "Publicado", cor: "var(--color-accent-2)" },
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
  /** qual adapter respondeu — "mock", "gemini". Serve para comparar modelos. */
  provider?: string;
  duracao_ms?: number | null;
  criado_em: string;
};

/** Quem esta usando o sistema. Sai do join de auth.users com perfis. */
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
};
