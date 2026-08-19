export const TIPOS = ["contratacao", "gol", "estreia", "mvp", "aniversario", "frase"] as const;
export type Tipo = (typeof TIPOS)[number];

export const FORMATOS = ["feed_4x5", "story_9x16"] as const;
export type Formato = (typeof FORMATOS)[number];

export const STATUS = ["rascunho", "em_revisao", "aprovado", "publicado"] as const;
export type Status = (typeof STATUS)[number];

export type Papel = "submete" | "aprova";

/** Metadados de apresentacao dos tipos de post — o usuario escolhe por aqui, nunca escreve prompt. */
export const TIPO_META: Record<
  Tipo,
  { numero: string; titulo: string; descricao: string; rotulo: string; exigeFrase: boolean }
> = {
  contratacao: {
    numero: "01",
    titulo: "Contratação",
    descricao: "Anúncio de chegada do atleta ao novo clube",
    rotulo: "BEM-VINDO",
    exigeFrase: false,
  },
  gol: {
    numero: "02",
    titulo: "Gol",
    descricao: "Comemoração de gol marcado na partida",
    rotulo: "GOLAÇO",
    exigeFrase: false,
  },
  estreia: {
    numero: "03",
    titulo: "Estreia",
    descricao: "Primeira partida com a camisa do clube",
    rotulo: "PRIMEIRO JOGO",
    exigeFrase: false,
  },
  mvp: {
    numero: "04",
    titulo: "Craque do jogo",
    descricao: "Destaque da partida, melhor em campo",
    rotulo: "MELHOR EM CAMPO",
    exigeFrase: false,
  },
  aniversario: {
    numero: "05",
    titulo: "Aniversário",
    descricao: "Felicitação de aniversário do atleta",
    rotulo: "PARABÉNS",
    exigeFrase: false,
  },
  frase: {
    numero: "06",
    titulo: "Frase",
    descricao: "Declaração do atleta em destaque na arte",
    rotulo: "EM SUAS PALAVRAS",
    exigeFrase: true,
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
