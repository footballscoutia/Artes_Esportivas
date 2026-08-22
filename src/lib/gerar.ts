import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pegarProvider, providerAtivo } from "./ai";
import { compor } from "./compose";
import { pintarLogo } from "./logo-cor";
import { sortearReferencia } from "./dados";
import { BALDE, subir } from "./storage";
import {
  FORMATO_META,
  LOGO_COR_HEX,
  POSICAO_LOGO_ROTULO,
  TIPO_META,
  type Formato,
  type LogoModo,
  type PosicaoLogo,
  type Tipo,
} from "./types";

/**
 * O caminho unico de "pedir uma arte ao modelo e guardar o resultado".
 *
 * Vive fora da rota porque dois lugares precisam dele: `/api/gerar`, que serve
 * a previa antes de o pedido existir, e a acao "gerar outra", que roda com o
 * pedido ja gravado. Duplicar isso significaria consertar bug de composicao
 * duas vezes e esquecer uma.
 */

/** Pede ao modelo uma imagem maior que o formato final — a sobra vira margem do corte. */
const FOLGA = 1.18;

export type ArteProduzida = {
  arte_path: string;
  fundo_path: string;
  modelo: string;
  provider: string;
  custo_usd: number;
  duracao_ms: number;
  referencia_id: string;
  referencia_versao: number;
};

export class SemReferencia extends Error {}

/** Escudo e cores de um clube, prontos para ir ao modelo. */
export type ClubeNaArte = {
  rotulo: string;
  escudo: Buffer | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
};

/**
 * Instrucao de identidade visual do clube.
 *
 * O escudo vai como imagem; as cores vao aqui, em texto, porque o modelo
 * precisa saber que elas mandam na paleta e nao sao so um detalhe do brasao.
 * Nas 78 referencias do acervo a arte inteira sai da cor do clube.
 */
function blocoDeClubes(clubes: ClubeNaArte[]) {
  if (clubes.length === 0) return "";

  const linhas: string[] = ["", "IDENTIDADE DOS CLUBES:"];
  let algumaCor = false;

  for (const c of clubes) {
    linhas.push(
      c.escudo
        ? `- ${c.rotulo}: usar o escudo enviado como imagem, reproduzido fielmente, sem redesenhar nem estilizar.`
        : `- ${c.rotulo}: não desenhar escudo algum.`,
    );
    const cores = [c.cor_primaria, c.cor_secundaria].filter(Boolean).join(" e ");
    if (cores) {
      linhas.push(`  Cores do ${c.rotulo}: ${cores}.`);
      algumaCor = true;
    }
  }

  if (algumaCor) {
    linhas.push(
      "A paleta da arte sai dessas cores. Elas dominam fundo, faixas e destaques,",
      "não aparecem apenas dentro do escudo.",
    );
  }
  return linhas.join("\n");
}

export type DadosDoJogo = {
  adversario?: string | null;
  data_jogo?: string | null;
  hora_jogo?: string | null;
  campeonato?: string | null;
  estadio?: string | null;
};

type Textos = {
  nome: string;
  clube?: string | null;
  frase?: string | null;
  rotulo: string;
  /** Muda a ultima instrucao do bloco: so o carimbo precisa de canto reservado. */
  logoModo?: LogoModo;
  posicaoLogo?: PosicaoLogo;
} & DadosDoJogo;

const DIAS = ["DOMINGO","SEGUNDA-FEIRA","TERÇA-FEIRA","QUARTA-FEIRA","QUINTA-FEIRA","SEXTA-FEIRA","SÁBADO"];

/**
 * "2026-08-22" -> "SÁBADO 22/08".
 *
 * O dia da semana entra porque quase toda arte do acervo mostra ele — quem ve o
 * story quer saber se o jogo e hoje, nao a data por extenso. Monta com UTC de
 * proposito: a data vem do banco como dia puro, e converter para fuso local
 * viraria o dia para quem estiver a oeste de Greenwich.
 */
function formatarData(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${DIAS[d.getUTCDay()]} ${dd}/${mm}`;
}

/**
 * Injeta os textos no prompt-mae.
 *
 * O curador escreve `{{nome}}`, `{{clube}}`, `{{frase}}` e `{{rotulo}}` onde
 * quiser dentro do prompt — assim ele controla como o nome entra na cena, que e
 * metade do resultado. Se o prompt nao tiver marcador nenhum, os textos vao num
 * bloco no fim, para uma referencia antiga nao sair sem nome.
 *
 * O nome vai entre aspas e soletrado. Modelo de imagem erra letra de nome
 * proprio, e "Famalicao" no lugar de "Famalicão" e o tipo de erro que so aparece
 * depois de publicado.
 */
export function montarPrompt(promptMae: string, t: Textos): string {
  const valores: Record<string, string> = {
    nome: t.nome.trim(),
    clube: t.clube?.trim() ?? "",
    frase: t.frase?.trim() ?? "",
    rotulo: t.rotulo,
    adversario: t.adversario?.trim() ?? "",
    data: formatarData(t.data_jogo),
    hora: t.hora_jogo?.trim() ?? "",
    campeonato: t.campeonato?.trim() ?? "",
    estadio: t.estadio?.trim() ?? "",
  };

  const CHAVES = "nome|clube|frase|rotulo|adversario|data|hora|campeonato|estadio";
  const marcador = new RegExp(`\\{\\{\\s*(${CHAVES})\\s*\\}\\}`, "g");

  const temMarcador = marcador.test(promptMae);
  marcador.lastIndex = 0; // regex global guarda posicao entre chamadas

  const comValores = promptMae.replace(
    marcador,
    (_, chave: string) => valores[chave] ?? "",
  );

  if (temMarcador) return comValores;

  const linhas = [
    `Escreva na arte, exatamente como está entre aspas, sem alterar acentuação:`,
    `- Nome do atleta: "${valores.nome}" — em destaque, tipografia pesada.`,
    `- Etiqueta: "${valores.rotulo}" — menor, acima do nome.`,
  ];
  if (valores.clube) linhas.push(`- Clube: "${valores.clube}" — discreto.`);
  if (valores.adversario) linhas.push(`- Adversário: "${valores.adversario}".`);
  if (valores.campeonato) linhas.push(`- Campeonato: "${valores.campeonato}".`);
  if (valores.data) linhas.push(`- Data: "${valores.data}".`);
  if (valores.hora) linhas.push(`- Horário: "${valores.hora}".`);
  if (valores.estadio) linhas.push(`- Estádio: "${valores.estadio}".`);
  if (valores.frase) linhas.push(`- Frase do atleta: "${valores.frase}" — em itálico.`);
  linhas.push(
    `Nenhum outro texto na imagem. Não inventar palavras, números nem escudos de clube.`,
  );

  /**
   * O canto reservado so faz sentido no carimbo.
   *
   * Esta linha era fixa em "canto inferior direito", de quando havia um jeito
   * so de por logo. Ficou mentindo duas vezes: pedia canto livre mesmo quando a
   * geracao nao ia levar logo nenhuma, e apontava o canto errado quando a
   * pessoa escolhia outro. No modo `ia` nao ha canto a reservar — a instrucao
   * de integrar a logo vai junto da propria imagem dela, no provider.
   */
  if (t.logoModo === "carimbo") {
    const canto = POSICAO_LOGO_ROTULO[t.posicaoLogo ?? "inferior-direito"].toLowerCase();
    linhas.push(`Deixar o canto ${canto} limpo: a logo da agência entra ali por cima.`);
  }

  return `${comValores}\n\n${linhas.join("\n")}`;
}

export async function produzirArte({
  tipo,
  formato,
  nome,
  clube,
  frase,
  foto,
  clubes = [],
  marcaLogo = null,
  posicaoLogo = "inferior-direito",
  logoModo = "ia",
  logoCor = null,
  ...jogo
}: {
  tipo: Tipo;
  formato: Formato;
  nome: string;
  clube?: string | null;
  frase?: string | null;
  foto?: Buffer | null;
  /** Clube do atleta e, em matchday, o adversario. Nesta ordem. */
  clubes?: ClubeNaArte[];
  /** Bytes da marca escolhida. Nulo = a org ainda nao cadastrou nenhuma. */
  marcaLogo?: Buffer | null;
  posicaoLogo?: PosicaoLogo;
  /** Quem posiciona a logo: o modelo ('ia'), o codigo ('carimbo'), ou ninguem. */
  logoModo?: LogoModo;
  /** Cor pedida: "auto", um hex, ou nulo para as cores do arquivo. */
  logoCor?: string | null;
} & DadosDoJogo): Promise<ArteProduzida> {
  const alvo = FORMATO_META[formato];

  const referencia = await sortearReferencia(tipo, formato);
  if (!referencia || !referencia.ativa) {
    throw new SemReferencia(
      `Não há referência ativa para ${tipo} em ${formato}. Cadastre em Referências.`,
    );
  }

  // referencia curada: caminho em public/ na fase de andaime, URL assinada depois
  const refBuffer = referencia.imagem_url?.startsWith("/")
    ? await readFile(path.join(process.cwd(), "public", referencia.imagem_url)).catch(() => null)
    : referencia.imagem_url
      ? await fetch(referencia.imagem_url)
          .then((r) => r.arrayBuffer())
          .then((b) => Buffer.from(b))
          .catch(() => null)
      : null;

  const sufixo = formato === "feed_4x5" ? "feed" : "story";
  const provider = pegarProvider(`/mock/fundo-${tipo}-${sufixo}.png`);

  /* A logo segue por UM dos dois caminhos, nunca pelos dois: ou ela vai no
     pedido para o modelo integrar, ou fica para o `compor` colar depois. Ir
     pelos dois imprimiria a marca duas vezes na mesma arte. */
  const usaLogo = marcaLogo && logoModo !== "nenhuma";
  const logoParaOModelo = usaLogo && logoModo === "ia" ? marcaLogo : null;
  const logoParaCarimbar = usaLogo && logoModo === "carimbo" ? marcaLogo : null;

  /**
   * No modo IA a logo e repintada ANTES de ir ao modelo.
   *
   * Repintar depois seria impossivel: a logo estaria dentro dos pixels da arte,
   * misturada com o resto. Entao a cor entra na referencia — o modelo recebe a
   * logo ja na cor pedida e a instrucao de reproduzi-la como esta.
   *
   * O "auto" nao existe aqui, e nao por esquecimento: ele mede a luminancia do
   * lugar onde a logo cai, e nesse modo o lugar so se conhece depois de a arte
   * existir. Quem pedir "auto" com a IA posicionando recebe branco, que e o que
   * acerta mais sobre arte de estadio.
   */
  const logoPintada =
    logoParaOModelo && logoCor && logoCor !== "original"
      ? await pintarLogo(logoParaOModelo, logoCor === "auto" ? LOGO_COR_HEX.branca : logoCor)
      : logoParaOModelo;

  const gerado = await provider.gerar({
    referencia: refBuffer,
    logo: logoPintada,
    foto: foto ?? null,
    prompt: montarPrompt(referencia.prompt_mae, {
      nome,
      clube,
      frase,
      rotulo: TIPO_META[tipo].rotulo,
      logoModo,
      posicaoLogo,
      ...jogo,
    }) + blocoDeClubes(clubes),
    escudos: clubes
      .filter((c): c is ClubeNaArte & { escudo: Buffer } => Boolean(c.escudo))
      .map((c) => ({ rotulo: c.rotulo, imagem: c.escudo })),
    largura: Math.round(alvo.w * FOLGA),
    altura: Math.round(alvo.h * FOLGA),
  });

  // corte para o formato final; a logo so entra aqui no modo carimbo
  const final = await compor({
    fundo: gerado.imagem,
    formato,
    logo: logoParaCarimbar,
    posicaoLogo,
    logoCor,
  });

  /**
   * Guarda tambem o que o modelo devolveu sem corte e sem logo. Serve para
   * conferir depois se um problema veio do modelo ou do acabamento — e e o
   * unico jeito de reaproveitar a arte se a logo mudar de lugar.
   */
  /**
   * A arte final e sempre PNG — quem a produz e o `compor`, com sharp. Ja o
   * FUNDO e o que o modelo devolveu, e o Nano Banana 2 devolve JPEG. Guardar
   * esses bytes com o padrao `image/png` e extensao `.png` gravava um arquivo
   * mentindo sobre o proprio formato: o navegador ate adivinha pelo conteudo e
   * mostra, mas quem baixasse levava um `.png` que e JPEG por dentro.
   */
  const [arte_path, fundo_path] = await Promise.all([
    subir(BALDE.geracoes, final),
    subir(BALDE.geracoes, gerado.imagem, gerado.mime, extensaoDe(gerado.mime)),
  ]);

  return {
    arte_path,
    fundo_path,
    modelo: gerado.modelo,
    provider: providerAtivo(),
    custo_usd: gerado.custoUsd,
    duracao_ms: gerado.duracaoMs,
    referencia_id: referencia.id,
    referencia_versao: referencia.versao,
  };
}

/** Extensao coerente com o que o modelo devolveu, para o arquivo nao mentir. */
function extensaoDe(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}
