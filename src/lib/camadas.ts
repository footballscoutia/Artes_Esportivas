import "server-only";
import sharp from "sharp";
import { pegarProvider } from "./ai";
import { BALDE, subir } from "./storage";

/**
 * As duas camadas de um video: o cenario e o atleta recortado.
 *
 * POR QUE DUAS CHAMADAS, E NAO UMA
 *
 * A arte parada e uma imagem chapada: fundo, atleta e clima num arquivo so.
 * Serve para post, mas em video ela permite pouco — tudo se move junto e o
 * texto so pode ficar NA FRENTE de tudo.
 *
 * Com o atleta em camada propria abrem-se tres coisas:
 *   1. paralaxe, que e o que separa "imagem com zoom" de video;
 *   2. o atleta entrando com tempo proprio;
 *   3. TEXTO ATRAS DELE — a assinatura do genero, e a coisa que mais custou
 *      correcao de prompt neste projeto. Em camadas a oclusao deixa de ser um
 *      pedido ao modelo e vira ordem de composicao.
 *
 * O preco e uma geracao a mais por video. Nao ha atalho: as fotos do elenco sao
 * pequenas, em formatos misturados, quase nenhuma com alpha, e com o manto de
 * outro clube — nao servem como camada.
 *
 * O CHAVEAMENTO
 *
 * O modelo devolve JPEG, que nao tem canal alpha, entao nao adianta pedir fundo
 * transparente. Ele desenha o atleta sobre magenta chapado e o codigo tira a
 * cor, como fundo infinito de estudio. Magenta porque nao existe uniforme de
 * futebol magenta: verde brigaria com gramado e Palmeiras, azul com metade da
 * serie A, e qualquer cor perto de pele ou de manto abriria buraco no atleta.
 */

const L = 1080;
const A = 1920;
const CHAVE = { r: 255, g: 0, b: 255 };

const SEM_TEXTO = [
  "ESTA IMAGEM NÃO TEM TEXTO NENHUM.",
  "Nenhuma palavra, letra, número, sigla, escudo, logo ou marca d'água — em lugar nenhum.",
  "A imagem de referência TEM texto: ignore o texto dela e reproduza apenas o resto.",
].join("\n");

/**
 * As regras que a arte parada aprendeu, repetidas aqui.
 *
 * Este caminho nao passa pelos prompts do banco, e por isso comecaria sem a
 * memoria toda. Foi o que aconteceu na prova: um fundo vermelho-escuro numa
 * arte do Vasco — cor de rival, o pior defeito do produto. Nao foi o modelo
 * desobedecendo; nao havia o que obedecer.
 */
const REGRAS = [
  "NADA de cor de outro clube. Par de cores reconhecível lê como identidade de time",
  "seja qual for a forma que o carregue. Num post de clube, vestir a arte com a cor",
  "do rival é o erro mais grave que existe. As cores saem do clube desta arte e da",
  "referência, e de mais lugar nenhum.",
  "",
  "NADA de objeto reconhecível: monumento, estátua, arco, ponte, silhueta de cidade,",
  "bandeira de qualquer espécie, taça, medalha, mapa. O que o fundo PODE ter é curto",
  "e fechado: faixa, filete, trama de linhas, textura, granulado, ruído, recorte de",
  "papel rasgado, bloco de cor e degradê. Essa lista é um TETO e não um cardápio —",
  "usar UM ou DOIS, nunca a coleção. Se sobrar área, ela fica limpa.",
].join("\n");

function promptFundo(clube: string, cores: string) {
  return [
    "CENÁRIO PARA UMA ARTE ESPORTIVA — o fundo, sozinho.",
    "",
    "Reproduza o ESTILO da imagem de referência: paleta, tratamento, textura, iluminação,",
    "grão e clima. É o estilo DELA que manda, não uma foto de estádio genérica.",
    "",
    "NÃO DESENHE NENHUMA PESSOA. Nenhum atleta, silhueta humana, rosto ou multidão.",
    "A figura entra depois, por cima, e o espaço dela precisa estar vazio.",
    "",
    "A COMPOSIÇÃO É ESCURA no terço superior e no centro, onde a tipografia e o atleta",
    "vão entrar. Luz e contraste ficam nas bordas e no fundo do quadro.",
    "",
    SEM_TEXTO,
    "",
    REGRAS,
    "",
    "A imagem sangra até a borda, sem moldura nem margem branca.",
    `Ambiente do ${clube}.`,
    cores ? `A paleta sai das cores do clube: ${cores}. Elas dominam o fundo inteiro.` : "",
    "Formato vertical 9:16, alta resolução.",
  ]
    .filter(Boolean)
    .join("\n");
}

function promptAtleta(clube: string) {
  return [
    "O ATLETA DA FOTO, DE CORPO INTEIRO, SOBRE FUNDO MAGENTA CHAPADO.",
    "",
    "O fundo é MAGENTA PURO (#FF00FF), liso, uniforme, sem textura, sem sombra projetada,",
    "sem degradê e sem reflexo — fundo infinito de estúdio. Nada de magenta no atleta:",
    "nem na pele, nem no uniforme, nem no cabelo.",
    "",
    "O rosto é o da foto enviada, preservado.",
    "",
    "POSTURA: momento de jogo, não pose de catálogo. Ele está em ação — comemorando,",
    "conduzindo a bola, ou de braços abertos — com o peso em uma perna só e o corpo em",
    "diagonal. Atleta parado de frente, braços ao lado do corpo, é foto de crachá.",
    "",
    "LUZ: contraluz forte definindo a borda do corpo, e sombra fechada no lado oposto.",
    "Contraste alto, com a mesma qualidade de luz da imagem de referência de estilo.",
    "",
    "O UNIFORME é o da imagem de referência do manto, com o ESCUDO do clube no peito e",
    "os patrocínios nas mesmas posições, copiados como estão. Camisa lisa, sem escudo e",
    "sem patrocínio, não é o uniforme do clube.",
    "",
    SEM_TEXTO,
    "",
    `O atleta é do ${clube}.`,
    "Corpo inteiro dentro do quadro, com folga em volta. Formato vertical 9:16.",
  ].join("\n");
}

/**
 * Tira o magenta e devolve o atleta com alpha.
 *
 * O sharp nao faz conta por pixel, entao os pixels saem crus, a conta acontece
 * em JS e o resultado volta. Dois megapixels uma vez so — irrelevante perto de
 * uma chamada ao modelo.
 *
 * A borda e uma RAMPA e nao um corte: limiar seco deixa serrilha no cabelo, que
 * e onde chave de cor sempre se denuncia. E o `derrame` tira o excesso de
 * vermelho e azul que o fundo reflete no contorno — sem ele o atleta fica com
 * auréola rosa sobre fundo escuro.
 */
export async function chavearMagenta(
  jpeg: Buffer,
  { perto = 90, longe = 190 } = {},
): Promise<Buffer> {
  const { data, info } = await sharp(jpeg)
    .resize(L, A, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];

    /* O que define magenta e a AUSENCIA de verde entre vermelho e azul altos,
       por isso o verde pesa mais na distancia. */
    const dist = Math.sqrt(
      (r - CHAVE.r) ** 2 + ((g - CHAVE.g) * 1.6) ** 2 + (b - CHAVE.b) ** 2,
    );

    let a = 255;
    if (dist <= perto) a = 0;
    else if (dist < longe) a = Math.round(((dist - perto) / (longe - perto)) * 255);
    data[o + 3] = a;

    if (a > 0) {
      const excesso = Math.min(r, b) - g;
      if (excesso > 12) {
        data[o] = Math.max(g, r - excesso * 0.8);
        data[o + 2] = Math.max(g, b - excesso * 0.8);
      }
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

export type MateriaisDoVideo = {
  referencia: Buffer | null;
  foto: Buffer | null;
  uniforme: Buffer | null;
  clube: string;
  cores: string;
};

export type CamadasProduzidas = {
  fundo_path: string;
  atleta_path: string;
  custo_usd: number;
};

/** Gera as duas camadas e sobe as duas. Custa DUAS geracoes. */
export async function produzirCamadas(m: MateriaisDoVideo): Promise<CamadasProduzidas> {
  const provider = pegarProvider();

  const [cenario, figura] = await Promise.all([
    provider.gerar({
      referencia: m.referencia,
      foto: null,
      prompt: promptFundo(m.clube, m.cores),
      largura: L,
      altura: A,
    }),
    provider.gerar({
      referencia: m.referencia,
      foto: m.foto,
      uniforme: m.uniforme,
      prompt: promptAtleta(m.clube),
      largura: L,
      altura: A,
    }),
  ]);

  const atletaComAlpha = await chavearMagenta(figura.imagem);

  const [fundo_path, atleta_path] = await Promise.all([
    subir(BALDE.videos, await sharp(cenario.imagem).png().toBuffer(), "image/png", "png"),
    subir(BALDE.videos, atletaComAlpha, "image/png", "png"),
  ]);

  return {
    fundo_path,
    atleta_path,
    custo_usd: cenario.custoUsd + figura.custoUsd,
  };
}
