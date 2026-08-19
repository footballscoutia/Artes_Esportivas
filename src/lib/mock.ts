/**
 * Dados de mentira da fase 1. Toda tela le daqui pelas funcoes abaixo;
 * na fase 2 o corpo delas passa a consultar o Supabase e as telas nao mudam.
 */
import type { Geracao, Pedido, Referencia, Tipo, Formato } from "./types";
import { TIPOS, FORMATOS, TIPO_META } from "./types";

const agora = Date.now();
const min = (m: number) => new Date(agora - m * 60000).toISOString();

export const USUARIO_ATUAL = {
  id: "u1",
  nome: "Você",
  email: "marketing@mbsports.com.br",
  papel: "aprova" as const,
};

const PROMPT_BASE = `Arte promocional esportiva vertical, o atleta da foto de referencia em destaque
recortado sobre fundo com a identidade da agencia. Iluminacao dramatica de estadio,
particulas de luz, profundidade de campo. Preservar fielmente rosto, tom de pele e
biotipo do atleta da foto. Nao gerar texto, nao gerar logotipos, nao gerar escudos
de clube. Deixar a faixa inferior limpa para a camada de texto.`;

export const REFERENCIAS: Referencia[] = TIPOS.flatMap((tipo) =>
  FORMATOS.map((formato) => ({
    id: `ref-${tipo}-${formato}`,
    tipo,
    formato,
    imagem_url: `/mock/ref-${tipo}-${formato === "feed_4x5" ? "feed" : "story"}.png`,
    prompt_mae: `${PROMPT_BASE}\n\nContexto: ${TIPO_META[tipo].descricao}.`,
    versao: tipo === "gol" ? 3 : 1,
    ativa: !(tipo === "aniversario" && formato === "story_9x16"),
    atualizado_em: min(60 * 24 * (formato === "feed_4x5" ? 2 : 5)),
  })),
);

export const PEDIDOS: Pedido[] = [
  {
    id: "p1",
    tipo: "contratacao",
    formato: "feed_4x5",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Lucas Ferreira",
    clube: "Vitória Guimarães",
    frase: null,
    referencia_id: "ref-contratacao-feed_4x5",
    referencia_versao: 1,
    status: "em_revisao",
    criado_por: "Ana",
    aprovado_por: null,
    criado_em: min(18),
  },
  {
    id: "p2",
    tipo: "gol",
    formato: "story_9x16",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Rafael Nunes",
    clube: "Estoril",
    frase: null,
    referencia_id: "ref-gol-story_9x16",
    referencia_versao: 3,
    status: "em_revisao",
    criado_por: "Ana",
    aprovado_por: null,
    criado_em: min(52),
  },
  {
    id: "p3",
    tipo: "estreia",
    formato: "feed_4x5",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Diego Matos",
    clube: "Rio Ave",
    frase: null,
    referencia_id: "ref-estreia-feed_4x5",
    referencia_versao: 1,
    status: "aprovado",
    criado_por: "Pedro",
    aprovado_por: "Você",
    criado_em: min(60 * 5),
  },
  {
    id: "p4",
    tipo: "frase",
    formato: "story_9x16",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Bruno Alves",
    clube: "Famalicão",
    frase: "Vim aqui para escrever a minha história.",
    referencia_id: "ref-frase-story_9x16",
    referencia_versao: 1,
    status: "em_revisao",
    criado_por: "Pedro",
    aprovado_por: null,
    criado_em: min(60 * 7),
  },
  {
    id: "p5",
    tipo: "mvp",
    formato: "feed_4x5",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Caio Ribeiro",
    clube: "Boavista",
    frase: null,
    referencia_id: "ref-mvp-feed_4x5",
    referencia_versao: 1,
    status: "publicado",
    criado_por: "Ana",
    aprovado_por: "Você",
    criado_em: min(60 * 26),
  },
  {
    id: "p6",
    tipo: "aniversario",
    formato: "feed_4x5",
    foto_jogador_url: "/mock/foto-jogador.png",
    nome_jogador: "Thiago Souza",
    clube: "Paços de Ferreira",
    frase: null,
    referencia_id: "ref-aniversario-feed_4x5",
    referencia_versao: 1,
    status: "rascunho",
    criado_por: "Você",
    aprovado_por: null,
    criado_em: min(60 * 30),
  },
];

export const GERACOES: Geracao[] = [
  {
    id: "g1",
    pedido_id: "p1",
    imagem_url: "/mock/arte-contratacao-feed.png",
    aprovada: false,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(17),
  },
  {
    id: "g0",
    pedido_id: "p1",
    imagem_url: "/mock/arte-contratacao-feed.png",
    aprovada: false,
    motivo_recusa: "Mão direita com seis dedos",
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(21),
  },
  {
    id: "g2",
    pedido_id: "p2",
    imagem_url: "/mock/arte-gol-story.png",
    aprovada: false,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(51),
  },
  {
    id: "g3",
    pedido_id: "p3",
    imagem_url: "/mock/arte-estreia-feed.png",
    aprovada: true,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(60 * 5),
  },
  {
    id: "g4",
    pedido_id: "p4",
    imagem_url: "/mock/arte-frase-story.png",
    aprovada: false,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(60 * 7),
  },
  {
    id: "g5",
    pedido_id: "p5",
    imagem_url: "/mock/arte-mvp-feed.png",
    aprovada: true,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(60 * 26),
  },
  {
    id: "g6",
    pedido_id: "p6",
    imagem_url: "/mock/arte-aniversario-feed.png",
    aprovada: false,
    motivo_recusa: null,
    custo_usd: 0.1,
    modelo: "gemini-3.1-flash-image",
    criado_em: min(60 * 30),
  },
];

export function listarPedidos() {
  return [...PEDIDOS].sort((a, b) => +new Date(b.criado_em) - +new Date(a.criado_em));
}

export function buscarPedido(id: string) {
  return PEDIDOS.find((p) => p.id === id) ?? null;
}

export function geracoesDoPedido(id: string) {
  return GERACOES.filter((g) => g.pedido_id === id).sort(
    (a, b) => +new Date(b.criado_em) - +new Date(a.criado_em),
  );
}

export function buscarReferencia(tipo: Tipo, formato: Formato) {
  return REFERENCIAS.find((r) => r.tipo === tipo && r.formato === formato) ?? null;
}

/** Arte de exemplo devolvida pela geracao falsa da fase 1. */
export function arteDeExemplo(tipo: Tipo, formato: Formato) {
  const sufixo = formato === "feed_4x5" ? "feed" : "story";
  return `/mock/arte-${tipo}-${sufixo}.png`;
}
