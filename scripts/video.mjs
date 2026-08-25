/**
 * Vídeo de arte esportiva 9:16, montado a partir de um TEMPLATE descrito em dado.
 *
 *   node scripts/video.mjs                                  reusa a placa, template padrao
 *   node scripts/video.mjs --template direto
 *   node scripts/video.mjs --escala 1.6 --duracao 12 --zona base
 *   node scripts/video.mjs --nova-placa                     gera placa nova (custa)
 *   node scripts/video.mjs --lista                          o que da para mexer
 *
 * NAO toca no produto: nao cria tabela, nao muda tela, nao grava no banco.
 *
 * ---------------------------------------------------------------------------
 * A COREOGRAFIA E DADO, NAO CODIGO
 *
 * A primeira versao deste arquivo tinha os tempos cravados dentro de uma funcao
 * `camadaDeTexto()`: "o clube entra em 1.25s, a barra varre em 1.95s". Aquilo
 * funcionava para UMA receita e nao sobrevivia a nenhuma opcao de
 * personalizacao — cada escolha nova viraria um `if` no meio do desenho.
 *
 * Agora um template DESCREVE: quais elementos existem, qual campo do pedido
 * alimenta cada um, em que instante entram, com que animacao. O motor le a
 * descricao e desenha. Trocar um parametro nao encosta em codigo de desenho.
 *
 * E a mesma licao que as correcoes de prompt ensinaram — nomear a alavanca em
 * vez de prescrever a forma —, aplicada a movimento.
 *
 * ---------------------------------------------------------------------------
 * O QUE CUSTA E O QUE NAO CUSTA
 *
 * A PLACA (o fundo gerado pelo modelo) custa ~US$ 0,10 e e a unica coisa aqui
 * que passa por IA. Todo o resto — tipografia, ritmo, camera, transicoes — e
 * desenhado por codigo e sai igual toda vez.
 *
 * Por isso o padrao e REUSAR a placa de out/video/placa.png. Iterar em
 * coreografia custa zero; so `--nova-placa` gasta.
 *
 * ---------------------------------------------------------------------------
 * A FONTE
 *
 * Impact, e nao a Chakra Petch do produto: o librsvg do sharp so enxerga fontes
 * instaladas no sistema, e um teste nesta maquina mostrou Chakra Petch e
 * Bahnschrift caindo em serifa. Impact tambem e a face certa para isto —
 * condensada e pesada. Em producao a fonte da marca entra como arquivo.
 */
import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const execFileP = promisify(execFile);

const L = 1080;
const A = 1920;
const FPS = 30;

const PEDIDO_PADRAO = "1f40e559-6c6b-4760-87f3-20100d8f66f1";
const SAIDA = "out/video";

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

/* =========================================================================
   ESTILOS — como cada papel tipografico se parece.
   O `corpo` e o tamanho BASE; o parametro `escala` multiplica todos de uma vez,
   o que mantem a hierarquia entre eles enquanto o conjunto cresce.
   ========================================================================= */

const ESTILOS = {
  etiqueta: { fonte: "Arial Black, Arial", corpo: 26, tracking: 10, peso: 400 },
  titulo: { fonte: "Impact, Arial Black", corpo: 150, tracking: 2, peso: 400 },
  subtitulo: { fonte: "Impact, Arial Black", corpo: 66, tracking: 1, peso: 400 },
  dados: { fonte: "Arial Black, Arial", corpo: 27, tracking: 3, peso: 400 },
  legenda: { fonte: "Arial Black, Arial", corpo: 34, tracking: 14, peso: 400 },
};

/* =========================================================================
   ANIMACOES — cada uma converte um progresso 0..1 no estado daquele instante.

   Nenhuma guarda estado entre quadros: qualquer quadro pode ser desenhado
   sozinho. E o que torna o render paralelizavel e a depuracao possivel — da
   para renderizar so o quadro 97 e olhar.
   ========================================================================= */

const ANIMACOES = {
  surge: (p) => ({ opacidade: p }),
  "desliza-esquerda": (p) => ({ opacidade: p, dx: -70 * (1 - p) }),
  "desliza-direita": (p) => ({ opacidade: p, dx: 70 * (1 - p) }),
  sobe: (p) => ({ opacidade: p, dy: 45 * (1 - p) }),
  /* `revelar` corta o elemento pela largura: a letra nasce de dentro da barra
     em vez de aparecer do lado dela. */
  varre: (p) => ({ opacidade: 1, revelar: p }),
  cresce: (p) => ({ opacidade: p, escala: 0.72 + 0.28 * p }),
};

/* =========================================================================
   ENQUADRAMENTOS — recortes nomeados da mesma placa.

   E o que torna a transicao possivel sem gerar imagem nova: uma segunda cena
   nao precisa de outra placa, precisa de outro RECORTE. Cortar de um plano
   aberto para um fechado no rosto e edicao de verdade, e custa zero.

   Valores em fracao do quadro: {escala, cx, cy}, com cx/cy em 0..1 marcando o
   centro do recorte.
   ========================================================================= */

const ENQUADRAMENTOS = {
  cheio: { escala: 1.02, cx: 0.5, cy: 0.5 },
  detalhe: { escala: 1.34, cx: 0.5, cy: 0.3 },
  baixo: { escala: 1.22, cx: 0.5, cy: 0.72 },
  lateral: { escala: 1.18, cx: 0.32, cy: 0.45 },
};

/* =========================================================================
   TRANSICOES — o que acontece nos poucos quadros em volta de um corte.

   Cada uma recebe `u` de 0 a 1 atravessando o corte (0.5 e o corte em si) e
   devolve como o fundo deve ser deformado naquele quadro. O corte de verdade —
   a troca de cena — quem faz e o motor; a transicao so disfarça a emenda.

   O borrao direcional sai de um truque de resize: espremer a largura e devolver
   ao tamanho borra SO na horizontal. O `blur` do sharp e isotropico e nao
   serviria — e num whip de cinco quadros ninguem percebe a diferenca entre um
   borrao direcional exato e este.
   ========================================================================= */

const TRANSICOES = {
  corte: () => ({}),

  flash: (u) => ({ veu: { cor: "#ffffff", opacidade: (1 - Math.abs(u - 0.5) * 2) * 0.5 } }),

  whip: (u) => {
    const pico = 1 - Math.abs(u - 0.5) * 2;
    return {
      /* Sai para a esquerda, entra pela direita: a direcao inverte no corte. */
      deslocX: (u < 0.5 ? -1 : 1) * pico * L * 0.42,
      borraoX: 1 + pico * 22,
    };
  },

  punch: (u) => {
    const pico = 1 - Math.abs(u - 0.5) * 2;
    return { escalaExtra: pico * 0.3, desfoque: pico * 14 };
  },

  faixa: (u) => ({ faixa: u, veu: { cor: "#000000", opacidade: (1 - Math.abs(u - 0.5) * 2) * 0.25 } }),
};

/* =========================================================================
   TEMPLATES — a descricao de uma receita inteira.

   `em` e `dura` estao em SEGUNDOS de uma linha do tempo de referencia de 8s. O
   parametro `duracao` estica ou encolhe tudo proporcionalmente, e `velocidade`
   mexe so nas duracoes de entrada, sem mudar a ordem.
   ========================================================================= */

const TEMPLATES = {
  "escudo-abre": {
    nome: "Abertura com escudo",
    descricao: "Escudo se montando, corte com flash, whip no meio e volta em close.",
    abertura: { tipo: "escudo", ate: 1.0 },
    entrada: "flash",
    /* Duas cenas da MESMA placa, em enquadramentos diferentes. E o que da a
       transicao do meio algo para ligar — sem a segunda cena, um whip seria
       um borrao no meio de um plano so, que le como defeito e nao como corte. */
    cenas: [
      { ate: 4.4, enquadramento: "cheio", camera: "push-in" },
      { ate: 8.0, enquadramento: "detalhe", camera: "push-in" },
    ],
    transicoes: ["whip"],
    /* O bloco sai antes do corte e volta depois: e o que as referencias fazem,
       e o que faz a segunda cena parecer um segundo tempo em vez de repeticao. */
    reentrada: { saiEm: 4.05, voltaEm: 4.6, dura: 0.45 },
    fecho: { tipo: "fade", ultimos: 0.75 },
    elementos: [
      { id: "campeonato", campo: "campeonato", estilo: "etiqueta", em: 3.0, dura: 0.5, como: "surge" },
      { id: "clube", campo: "clube", estilo: "titulo", em: 1.25, dura: 0.7, como: "desliza-esquerda" },
      { id: "confronto", campo: "adversario", prefixo: "X ", estilo: "subtitulo", fundo: "clube", em: 1.95, dura: 0.55, como: "varre" },
      { id: "dados", campos: ["data", "hora", "estadio"], juntar: "   ·   ", estilo: "dados", fundo: "escuro", em: 2.6, dura: 0.55, como: "varre" },
      { id: "logo", imagem: "logoAgencia", canto: "inferior-direito", em: 1.4, dura: 0.6, como: "surge" },
    ],
  },

  direto: {
    nome: "Direto na arte",
    descricao: "Sem abertura. Punch no meio, texto sobe de baixo, camera afasta.",
    abertura: null,
    entrada: null,
    cenas: [
      { ate: 3.2, enquadramento: "cheio", camera: "push-out" },
      { ate: 8.0, enquadramento: "baixo", camera: "push-in" },
    ],
    transicoes: ["punch"],
    reentrada: { saiEm: 2.9, voltaEm: 3.4, dura: 0.4 },
    fecho: { tipo: "fade", ultimos: 0.6 },
    camera: "push-out",
    elementos: [
      { id: "clube", campo: "clube", estilo: "titulo", em: 0.4, dura: 0.9, como: "sobe" },
      { id: "confronto", campo: "adversario", prefixo: "X ", estilo: "subtitulo", fundo: "clube", em: 0.95, dura: 0.7, como: "varre" },
      { id: "dados", campos: ["data", "hora", "estadio"], juntar: "   ·   ", estilo: "dados", fundo: "escuro", em: 1.5, dura: 0.7, como: "varre" },
      { id: "campeonato", campo: "campeonato", estilo: "etiqueta", em: 2.2, dura: 0.6, como: "surge" },
      { id: "logo", imagem: "logoAgencia", canto: "inferior-direito", em: 0.8, dura: 0.6, como: "surge" },
    ],
  },

  cartaz: {
    nome: "Cartaz",
    descricao: "Centralizado e quieto, com uma faixa varrendo entre os dois tempos.",
    abertura: { tipo: "logo", ate: 0.8 },
    entrada: "corte",
    cenas: [
      { ate: 4.6, enquadramento: "cheio", camera: "estatico" },
      { ate: 8.0, enquadramento: "lateral", camera: "estatico" },
    ],
    transicoes: ["faixa"],
    reentrada: { saiEm: 4.3, voltaEm: 4.8, dura: 0.5 },
    fecho: { tipo: "fade", ultimos: 0.5 },
    camera: "estatico",
    alinhamento: "centro",
    elementos: [
      { id: "campeonato", campo: "campeonato", estilo: "etiqueta", em: 1.1, dura: 0.8, como: "surge" },
      { id: "clube", campo: "clube", estilo: "titulo", em: 1.0, dura: 0.9, como: "cresce" },
      { id: "confronto", campo: "adversario", prefixo: "X ", estilo: "subtitulo", em: 1.3, dura: 0.9, como: "surge" },
      { id: "dados", campos: ["data", "hora", "estadio"], juntar: "   ·   ", estilo: "dados", fundo: "escuro", em: 1.6, dura: 0.9, como: "surge" },
      { id: "logo", imagem: "logoAgencia", canto: "inferior-centro", em: 1.2, dura: 0.8, como: "surge" },
    ],
  },
};

/** Quanto dura uma transicao, em segundos da linha do tempo de referencia. */
const DURACAO_TRANSICAO = 0.34;

/* =========================================================================
   PARAMETROS — o que o usuario mexeria na tela. Nenhum deles passa pelo modelo.
   ========================================================================= */

const PARAMETROS = {
  duracao: { padrao: 8, ajuda: "segundos totais (6, 8, 12, 15)" },
  escala: { padrao: 1.0, ajuda: "tamanho do texto (0.8 discreto … 1.8 gigante)" },
  velocidade: { padrao: 1.0, ajuda: "ritmo das entradas (0.6 lenta … 1.6 rapida)" },
  zona: { padrao: "topo", ajuda: "faixa do bloco de texto (topo, meio, base)" },
  alinhamento: { padrao: "esquerda", ajuda: "esquerda ou centro" },
  camera: { padrao: "push-in", ajuda: "push-in, push-out, pan, estatico" },
  intensidade: { padrao: 1.0, ajuda: "quanto a camera anda (0 parada … 2 forte)" },
  template: { padrao: "escudo-abre", ajuda: Object.keys(TEMPLATES).join(", ") },
};

/* ------------------------------------------------------------------ tempo */

const saidaCubica = (t) => 1 - Math.pow(1 - t, 3);
const suave = (t) => t * t * (3 - 2 * t);
const linear = (t) => t;

/**
 * Progresso 0..1 de uma entrada, no quadro `k`.
 *
 * `em` e `dura` vem do template numa linha do tempo de 8s; `fator` estica para
 * a duracao pedida, e `velocidade` encolhe so a duracao da entrada. Separar as
 * duas coisas e o que permite um video de 15s com entradas rapidas.
 */
function progresso(k, { em, dura }, { fator, velocidade, fps }, easing = saidaCubica) {
  const a = (em * fator) * fps;
  const b = a + (dura / velocidade) * fps;
  if (k <= a) return 0;
  if (k >= b) return 1;
  return easing((k - a) / (b - a));
}

/* ------------------------------------------------------------- ambiente */

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() =>
    sair("Não achei o .env.local."),
  );
  return Object.fromEntries(
    bruto
      .split(/\r?\n/)
      .filter((l) => /^[A-Z]/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

/** O ffmpeg do winget nao entra no PATH desta sessao; acha o binario real. */
function acharFfmpeg() {
  const raiz = path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
  );
  for (const v of ["ffmpeg-9.0-full_build", "ffmpeg-7.1-full_build"]) {
    const p = path.join(raiz, v, "bin", "ffmpeg.exe");
    if (existsSync(p)) return p;
  }
  return "ffmpeg";
}

/* --------------------------------------------------------------- textos */

const escapar = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

/** "2026-07-30" -> "QUINTA 30.07". */
function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return `${DIAS[d.getUTCDay()]} ${String(dia).padStart(2, "0")}.${String(mes).padStart(2, "0")}`;
}

/** O texto de um elemento, vindo de um campo ou de varios juntos. */
function textoDo(el, dados) {
  if (el.campos) {
    const partes = el.campos.map((c) => dados[c]).filter(Boolean);
    return partes.length ? partes.join(el.juntar ?? " ").toUpperCase() : "";
  }
  const bruto = dados[el.campo];
  if (!bruto) return "";
  return `${el.prefixo ?? ""}${bruto}`.toUpperCase();
}

/* ------------------------------------------------------------ contraste */

/**
 * A cor do texto sai de uma MEDICAO da placa, nao de um palpite.
 *
 * Esta e a diferenca de fundo entre a arte parada e o video. Na arte parada a
 * tipografia e desenhada pelo modelo, num lugar que so ele conhece, e a unica
 * ferramenta e pedir legibilidade no prompt. No video a gente SABE em que
 * retangulo cada linha cai, entao da para medir o que esta atras e escolher.
 *
 * A primeira placa saiu com o terco superior branco e o texto branco sumiu.
 * Nao era erro de prompt a corrigir: era uma medicao que faltava.
 */
async function luminanciaDaRegiao(imagem, caixa) {
  /**
   * O recorte precisa ser MATERIALIZADO antes de medir.
   *
   * `sharp(x).extract(caixa).stats()` nao mede o recorte: o `stats()` e uma
   * leitura da imagem de ORIGEM e ignora o que veio antes no pipeline. Escrito
   * assim, o codigo parecia medir a faixa do texto e media a placa inteira —
   * tres regioes bem diferentes devolviam media 0.193 e desvio 0.242,
   * identicos ate a terceira casa, que foi como o defeito apareceu.
   *
   * Dava o resultado certo por acidente enquanto a placa era escura de ponta a
   * ponta, e teria errado feio na primeira placa clara em cima e escura embaixo.
   */
  const recorte = await sharp(imagem).extract(caixa).toBuffer();
  const s = await sharp(recorte).stats();
  const [r, g, b] = s.channels.map((c) => c.mean);
  const [dr, dg, db] = s.channels.map((c) => c.stdev);
  return {
    media: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    /**
     * O DESVIO e o que a media esconde.
     *
     * Uma faixa quase toda preta com a camisa branca do atleta no meio tem
     * media 0.19 — "escuro" — e engole texto branco em cima da camisa. Foi
     * exatamente o que aconteceu no template centralizado. Media alta ou baixa
     * escolhe a COR; desvio alto diz que cor nenhuma resolve sozinha, e a
     * resposta passa a ser um veu atras do bloco.
     */
    desvio: (0.2126 * dr + 0.7152 * dg + 0.0722 * db) / 255,
  };
}

/**
 * Largura aproximada de uma linha, para ela caber na caixa.
 *
 * Nao ha metrica de fonte de verdade aqui — o sharp renderiza SVG mas nao mede
 * texto. A aproximacao por avanco medio de caixa alta erra alguns por cento, e
 * alguns por cento e o suficiente: o defeito que ela evita e "SAO JANUAR",
 * texto vazando a barra e sendo cortado pelo recorte.
 *
 * Vale reparar que este e o MESMO defeito que consumiu a sessao de correcoes de
 * prompt na arte parada. A diferenca e que aqui ele se resolve com uma conta,
 * uma vez, e nunca mais volta.
 */
const AVANCO = { "Impact, Arial Black": 0.46, "Arial Black, Arial": 0.72 };

function larguraEstimada(texto, estilo, corpo) {
  const avanco = AVANCO[estilo.fonte] ?? 0.6;
  return texto.length * corpo * avanco + Math.max(0, texto.length - 1) * estilo.tracking;
}

/** Encolhe o corpo ate a linha caber, com piso para nao virar rodape ilegivel. */
function corpoQueCabe(texto, estilo, corpo, disponivel) {
  const largura = larguraEstimada(texto, estilo, corpo);
  if (largura <= disponivel) return corpo;
  return Math.max(corpo * 0.55, corpo * (disponivel / largura));
}

/** Preto sobre claro, branco sobre escuro. O corte em 0.55 e o do olho. */
const contrasteDe = (lum) => (lum > 0.55 ? "#0b0b0b" : "#ffffff");

function luminanciaDoHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/* =========================================================================
   LAYOUT — onde cada elemento do bloco cai.

   Calculado UMA vez, antes do primeiro quadro, e nao a cada quadro: a posicao
   nao depende do tempo, so a entrada depende. Misturar as duas coisas foi o que
   deixou a versao anterior impossivel de parametrizar.
   ========================================================================= */

const MARGEM = 72;

function medirBloco(elementos, dados, p) {
  const linhas = [];
  for (const el of elementos) {
    if (el.imagem) continue; // cantos nao entram no bloco
    const texto = textoDo(el, dados);
    if (!texto) continue; // campo vazio nao ocupa espaco — nem deixa buraco
    const e = ESTILOS[el.estilo];
    const pedido = e.corpo * p.escala;
    /* A caixa util encolhe quando o elemento tem fundo: o texto respira dentro
       da barra em vez de encostar nas duas pontas. */
    const disponivel = L - MARGEM * 2 - (el.fundo ? pedido * 0.68 : 0);
    const corpo = corpoQueCabe(texto, e, pedido, disponivel);
    const altura = el.fundo ? corpo * 1.32 : corpo * 1.14;
    linhas.push({ el, texto, estilo: e, corpo, altura });
  }
  const total = linhas.reduce((s, l) => s + l.altura, 0) + Math.max(0, linhas.length - 1) * 10;
  return { linhas, total };
}

/** A faixa vertical onde o bloco comeca, conforme a zona pedida. */
function topoDoBloco(zona, alturaTotal) {
  if (zona === "meio") return (A - alturaTotal) / 2;
  if (zona === "base") return A - alturaTotal - 260;
  return 200;
}

/* =========================================================================
   DESENHO — um quadro, a partir do template + parametros + layout.
   ========================================================================= */

/** O mesmo fator de saida-e-volta, para o veu acompanhar o bloco. */
function reentradaDoVeu(k, tpl, tempo) {
  if (!tpl.reentrada) return 1;
  const { saiEm, voltaEm, dura } = tpl.reentrada;
  const saida = progresso(k, { em: saiEm, dura: dura * 0.6 }, tempo, linear);
  const volta = progresso(k, { em: voltaEm, dura }, tempo);
  return Math.max(0, Math.min(1, 1 - saida + volta));
}

function camadaDeUmQuadro(k, ctx) {
  const { tpl, p, dados, layout, tempo } = ctx;
  const partes = [];
  const fps = tempo.fps;
  const quadroAbertura = tpl.abertura ? tpl.abertura.ate * tempo.fator * fps : 0;

  /* ---- abertura ---- */
  if (k < quadroAbertura) {
    const pr = progresso(k, { em: 0.1, dura: tpl.abertura.ate - 0.25 }, tempo);
    const est = ANIMACOES.cresce(pr);
    const y = A * 0.42;

    if (tpl.abertura.tipo === "escudo" && dados.escudoB64) {
      partes.push(
        `<g opacity="${est.opacidade.toFixed(3)}" transform="translate(${L / 2} ${y}) scale(${est.escala.toFixed(3)})">
           <image href="data:image/png;base64,${dados.escudoB64}"
                  x="${-dados.escudoL / 2}" y="${-dados.escudoA / 2}"
                  width="${dados.escudoL}" height="${dados.escudoA}"/>
         </g>`,
      );
      const e = ESTILOS.legenda;
      partes.push(
        `<text x="${L / 2}" y="${y + dados.escudoA / 2 + 90}" text-anchor="middle" fill="#fff"
               font-family="${e.fonte}" font-size="${e.corpo * p.escala}" letter-spacing="${e.tracking}"
               opacity="${progresso(k, { em: 0.45, dura: 0.45 }, tempo).toFixed(3)}"
               >${escapar(dados.clube.toUpperCase())}</text>`,
      );
    }
    if (tpl.abertura.tipo === "logo" && dados.logoB64) {
      partes.push(
        `<g opacity="${est.opacidade.toFixed(3)}" transform="translate(${L / 2} ${y}) scale(${est.escala.toFixed(3)})">
           <image href="data:image/png;base64,${dados.logoB64}" x="-260" y="-125" width="520" height="250"
                  preserveAspectRatio="xMidYMid meet"/>
         </g>`,
      );
    }
    return partes.join("\n");
  }

  /* ---- transicao ---- */
  if (tpl.entrada === "flash") {
    const f = 1 - progresso(k - quadroAbertura, { em: 0, dura: 0.2 }, tempo, linear);
    if (f > 0.01) partes.push(`<rect width="${L}" height="${A}" fill="#fff" opacity="${(f * 0.45).toFixed(3)}"/>`);
  }

  /**
   * O bloco de texto SAI antes do corte e VOLTA depois.
   *
   * Sem isto a segunda cena seria a mesma tipografia parada sobre um
   * enquadramento novo, e o corte leria como falha de continuidade em vez de
   * segundo tempo. Nas referencias da agencia o texto sempre reaparece — e
   * reaparece mais rapido que na primeira vez, porque a informacao ja e
   * conhecida e nao precisa ser lida de novo com calma.
   */
  const reentrada = (() => {
    if (!tpl.reentrada) return { fator: 1, dy: 0 };
    const { saiEm, voltaEm, dura } = tpl.reentrada;
    const saida = progresso(k, { em: saiEm, dura: dura * 0.6 }, tempo, linear);
    const volta = progresso(k, { em: voltaEm, dura }, tempo);
    const fator = Math.min(1, 1 - saida + volta);
    return { fator: Math.max(0, fator), dy: (1 - volta) * (saida > 0.99 ? 26 : 0) };
  })();

  /* ---- o bloco de texto ---- */
  /**
   * O VEU: quando o fundo por tras do bloco e mesclado, cor nenhuma salva.
   *
   * Escolher branco ou preto resolve fundo uniforme. Fundo com a camisa branca
   * do atleta cruzando uma faixa escura nao tem cor certa — parte do texto vai
   * sumir de um jeito ou de outro. E o que a televisao faz ha decadas: um veu
   * suave atras do bloco, e a tipografia volta a ser legivel por construcao.
   *
   * Entra com o texto, nao antes: um retangulo aparecendo sozinho no fundo
   * antes da primeira letra le como falha de render.
   */
  if (dados.veu) {
      const entrada =
        Math.max(...layout.linhas.map((l) => progresso(k, l.el, tempo)), 0) * reentradaDoVeu(k, tpl, tempo);
    if (entrada > 0.01) {
      const folga = 34;
      partes.push(
        `<defs><linearGradient id="veu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${dados.veu.cor}" stop-opacity="0"/>
            <stop offset="14%" stop-color="${dados.veu.cor}" stop-opacity="${dados.veu.opacidade}"/>
            <stop offset="86%" stop-color="${dados.veu.cor}" stop-opacity="${dados.veu.opacidade}"/>
            <stop offset="100%" stop-color="${dados.veu.cor}" stop-opacity="0"/>
          </linearGradient></defs>
         <rect x="0" y="${(layout.topo - folga).toFixed(1)}" width="${L}"
               height="${(layout.total + folga * 2).toFixed(1)}"
               fill="url(#veu)" opacity="${entrada.toFixed(3)}"/>`,
      );
    }
  }

  const centralizado = p.alinhamento === "centro";
  const xBase = centralizado ? L / 2 : MARGEM;
  const larguraUtil = L - MARGEM * 2;
  let y = layout.topo;

  for (const linha of layout.linhas) {
    const { el, texto, estilo, corpo, altura } = linha;
    const pr = progresso(k, el, tempo);
    if (pr <= 0) {
      y += altura + 10;
      continue;
    }
    const est = ANIMACOES[el.como](pr);
    const dx = est.dx ?? 0;
    const dy = (est.dy ?? 0) + reentrada.dy;
    est.opacidade = (est.opacidade ?? 1) * reentrada.fator;
    if (est.opacidade < 0.01) {
      y += altura + 10;
      continue;
    }
    const base = y + corpo * 0.86;

    /* Barra ou tarja atras do texto, quando o elemento pede fundo. */
    if (el.fundo) {
      const corFundo = el.fundo === "clube" ? dados.corClube : "#0b0b0b";
      const opacidadeFundo = el.fundo === "clube" ? 1 : 0.72;
      const largura = est.revelar !== undefined ? larguraUtil * est.revelar : larguraUtil;
      const xr = centralizado ? L / 2 - largura / 2 : MARGEM;
      partes.push(
        `<rect x="${(xr + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" width="${largura.toFixed(1)}"
               height="${altura.toFixed(1)}" fill="${corFundo}" opacity="${(opacidadeFundo * est.opacidade).toFixed(3)}"/>`,
      );
    }

    /* O recorte da varredura: a letra nasce de dentro da barra. */
    let clip = "";
    if (est.revelar !== undefined) {
      const largura = larguraUtil * est.revelar;
      const xr = centralizado ? L / 2 - largura / 2 : MARGEM;
      partes.push(
        `<clipPath id="c${el.id}${k}"><rect x="${(xr + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}"
           width="${largura.toFixed(1)}" height="${altura.toFixed(1)}"/></clipPath>`,
      );
      clip = ` clip-path="url(#c${el.id}${k})"`;
    }

    const cor = el.fundo === "clube" ? dados.corSobreClube : dados.corTexto;
    const recuo = el.fundo ? corpo * 0.34 : 0;
    const x = centralizado ? xBase : xBase + recuo;

    partes.push(
      `<text x="${(x + dx).toFixed(1)}" y="${(base + dy).toFixed(1)}"${clip}
             ${centralizado ? 'text-anchor="middle"' : ""}
             fill="${cor}" opacity="${est.opacidade.toFixed(3)}"
             font-family="${estilo.fonte}" font-size="${corpo.toFixed(1)}"
             letter-spacing="${estilo.tracking}">${escapar(texto)}</text>`,
    );

    y += altura + 10;
  }

  /* ---- elementos de canto ---- */
  for (const el of tpl.elementos) {
    if (!el.imagem || !dados[`${el.imagem}B64`]) continue;
    const pr = progresso(k, el, tempo);
    if (pr <= 0) continue;
    const cx = el.canto === "inferior-centro" ? L / 2 - 115 : L - 300;
    partes.push(
      `<g opacity="${(pr * 0.95).toFixed(3)}">
         <image href="data:image/png;base64,${dados[`${el.imagem}B64`]}"
                x="${cx}" y="${A - 190}" width="230" height="110"
                preserveAspectRatio="${el.canto === "inferior-centro" ? "xMidYMax" : "xMaxYMax"} meet"/>
       </g>`,
    );
  }

  /* ---- fecho ---- */
  if (tpl.fecho?.tipo === "fade") {
    const inicio = tempo.total - tpl.fecho.ultimos * fps;
    if (k > inicio) {
      const f = suave(Math.min(1, (k - inicio) / (tpl.fecho.ultimos * fps)));
      partes.push(`<rect width="${L}" height="${A}" fill="#000" opacity="${f.toFixed(3)}"/>`);
    }
  }

  return partes.join("\n");
}

/**
 * Em que cena o quadro cai, e se ele esta atravessando um corte.
 *
 * Devolve tambem `u`: 0 a 1 cruzando a transicao, com 0.5 no corte exato. A
 * troca de cena acontece em 0.5 — antes dele o motor ainda desenha a cena que
 * sai, depois ja desenha a que entra, e a transicao so disfarca a emenda.
 */
function ondeEstamos(k, tpl, tempo) {
  const fps = tempo.fps;
  const seg = (x) => x * tempo.fator * fps;
  const cenas = tpl.cenas ?? [{ ate: 8.0, enquadramento: "cheio" }];

  let indice = cenas.length - 1;
  for (let i = 0; i < cenas.length; i++) {
    if (k < seg(cenas[i].ate)) { indice = i; break; }
  }

  /* Perto de um corte? O corte de uma cena e o `ate` da anterior. */
  const meiaJanela = seg(DURACAO_TRANSICAO) / 2;
  for (let i = 0; i < cenas.length - 1; i++) {
    const corte = seg(cenas[i].ate);
    if (k > corte - meiaJanela && k < corte + meiaJanela) {
      const u = (k - (corte - meiaJanela)) / (meiaJanela * 2);
      return {
        cena: cenas[u < 0.5 ? i : i + 1],
        indice: u < 0.5 ? i : i + 1,
        transicao: tpl.transicoes?.[i] ?? "corte",
        u,
      };
    }
  }
  return { cena: cenas[indice], indice, transicao: null, u: null };
}

/** O fundo de um quadro: preto na abertura, a cena recortada da placa depois. */
async function fundoDoQuadro(k, placa, ctx) {
  const { tpl, p, tempo } = ctx;
  const quadroAbertura = tpl.abertura ? tpl.abertura.ate * tempo.fator * tempo.fps : 0;

  if (k < quadroAbertura) {
    return sharp({ create: { width: L, height: A, channels: 3, background: "#000" } }).png().toBuffer();
  }

  const onde = ondeEstamos(k, tpl, tempo);
  const enq = ENQUADRAMENTOS[onde.cena.enquadramento] ?? ENQUADRAMENTOS.cheio;
  const efeito = onde.transicao ? TRANSICOES[onde.transicao](onde.u) : {};

  /* Progresso DENTRO da cena, para a camera nao reiniciar o curso a cada corte
     nem continuar de onde parou como se nada tivesse acontecido. */
  const seg = (x) => x * tempo.fator * tempo.fps;
  const cenas = tpl.cenas ?? [{ ate: 8.0 }];
  const de = onde.indice === 0 ? quadroAbertura : seg(cenas[onde.indice - 1].ate);
  const ate = seg(cenas[onde.indice].ate);
  const t = Math.min(1, Math.max(0, (k - de) / Math.max(1, ate - de)));

  const amplitude = 0.08 * p.intensidade;
  const modo = onde.cena.camera ?? p.camera;
  let escala = enq.escala;
  let deslocX = 0;
  if (modo === "push-in") escala = enq.escala + amplitude * t;
  else if (modo === "push-out") escala = enq.escala + amplitude * (1 - t);
  else if (modo === "pan") {
    escala = enq.escala + amplitude;
    deslocX = (t - 0.5) * amplitude * L * 0.9;
  }

  escala += efeito.escalaExtra ?? 0;
  deslocX += efeito.deslocX ?? 0;

  const lc = Math.round(L / escala);
  const ac = Math.round(A / escala);
  const left = Math.max(0, Math.min(L - lc, Math.round((L - lc) * enq.cx + deslocX)));
  const top = Math.max(0, Math.min(A - ac, Math.round((A - ac) * enq.cy)));

  let img = sharp(placa).extract({ left, top, width: lc, height: ac }).resize(L, A);

  /* Borrao direcional por resize: espremer a largura e devolver borra so na
     horizontal. O blur do sharp e isotropico e nao daria a leitura de whip. */
  if (efeito.borraoX > 1.5) {
    const estreito = Math.max(8, Math.round(L / efeito.borraoX));
    img = sharp(await img.resize(estreito, A, { fit: "fill" }).png().toBuffer()).resize(L, A, { fit: "fill" });
  }
  if (efeito.desfoque > 0.4) img = img.blur(efeito.desfoque);

  let saida = await img.png().toBuffer();

  /* A faixa: uma diagonal varrendo, com a cor do clube na aresta. Sem duas
     placas nao da para revelar "a proxima imagem" — o que a aresta revela e o
     proprio corte, e a barra e o que o olho segue enquanto ele acontece. */
  if (efeito.faixa !== undefined) {
    const x = (efeito.faixa * 1.6 - 0.3) * L;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
      <polygon points="${x},${A} ${x + L * 0.34},0 ${x + L * 0.46},0 ${x + L * 0.12},${A}"
               fill="${ctx.dados.corClube}"/>
    </svg>`;
    saida = await sharp(saida).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  }

  if (efeito.veu && efeito.veu.opacidade > 0.01) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
      <rect width="${L}" height="${A}" fill="${efeito.veu.cor}" opacity="${efeito.veu.opacidade.toFixed(3)}"/>
    </svg>`;
    saida = await sharp(saida).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  }

  return saida;
}

/* -------------------------------------------------------------- a placa */

function promptDaPlaca({ clube, cores }) {
  return [
    "Reproduza o ESTILO da imagem de referência: composição, paleta, tratamento de fundo,",
    "textura, iluminação e clima. O atleta da foto enviada é quem aparece na arte, com o",
    "rosto preservado exatamente como está na foto.",
    "",
    "ESTA ARTE NÃO TEM TEXTO NENHUM.",
    "Nenhuma palavra, letra, número, sigla, escudo, logo, marca d'água ou tipografia de",
    "espécie alguma — nem no fundo, nem sobre o atleta, nem nas bordas, nem no uniforme",
    "além do que já existe na camisa. A imagem de referência TEM texto: ignore o texto",
    "dela por completo e reproduza apenas o resto. Texto nenhum é o resultado pedido,",
    "não um esquecimento.",
    "",
    "A ARTE SANGRA ATÉ A BORDA. Ocupa o quadro inteiro, de canto a canto — sem moldura,",
    "sem margem, sem faixa branca em volta, sem parecer um pôster fotografado sobre uma",
    "página. A imagem É o quadro.",
    "",
    "O TERÇO SUPERIOR do quadro fica limpo — só fundo, sem elementos importantes e sem",
    "a cabeça do atleta subindo até lá. É onde a tipografia entra depois, por cima.",
    "",
    `O atleta é do ${clube}.`,
    cores ? `A paleta sai das cores do clube: ${cores}.` : "",
    "",
    "Nada de bandeira, monumento, mapa, objeto solto nem cor de outro clube. Se sobrar",
    "área, ela fica limpa.",
    "Formato vertical 9:16, alta resolução.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function gerarPlaca({ chave, modelo, prompt, referencia, foto }) {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: chave });

  const partes = [];
  if (referencia) {
    partes.push({ text: "Imagem 1 — referência de estilo:" });
    partes.push({ inlineData: { mimeType: "image/png", data: referencia.toString("base64") } });
  }
  if (foto) {
    partes.push({ text: "Imagem 2 — foto do atleta, preservar a identidade:" });
    partes.push({ inlineData: { mimeType: "image/jpeg", data: foto.toString("base64") } });
  }
  partes.push({ text: prompt });

  /* 503 do Gemini e comum e passageiro. Sem retry, uma rodada falha por motivo
     que nao tem nada a ver com o que ela testa. */
  let ultimo;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const r = await client.models.generateContent({
        model: modelo,
        contents: [{ role: "user", parts: partes }],
        config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } },
      });
      const d = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!d?.data) sair("O modelo respondeu sem imagem.");
      return Buffer.from(d.data, "base64");
    } catch (e) {
      if (e instanceof Parada) throw e;
      ultimo = e;
      const espera = tentativa * 8;
      console.log(`  tentativa ${tentativa} falhou (${e.status ?? "?"}), esperando ${espera}s`);
      await new Promise((r) => setTimeout(r, espera * 1000));
    }
  }
  throw ultimo;
}

/* ----------------------------------------------------------------- main */

function flag(args, nome, queda) {
  const i = args.indexOf(`--${nome}`);
  if (i < 0 || i === args.length - 1) return queda;
  const v = args[i + 1];
  return typeof queda === "number" ? Number(v) : v;
}

function mostrarLista() {
  console.log("\nTEMPLATES");
  for (const [k, t] of Object.entries(TEMPLATES)) {
    console.log(`  ${k.padEnd(14)} ${t.nome} — ${t.descricao}`);
  }
  console.log("\nPARÂMETROS");
  for (const [k, p] of Object.entries(PARAMETROS)) {
    console.log(`  --${k.padEnd(13)} ${String(p.padrao).padEnd(12)} ${p.ajuda}`);
  }
  console.log("\nA placa é reusada de out/video/placa.png. Só --nova-placa gasta geração.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--lista")) return mostrarLista();

  /* Casa UUID, e nao "qualquer coisa com hifen": valores de flag como
     `escudo-abre` e `push-in` tambem tem hifen e viravam id de pedido. */
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pedidoId = args.find((a) => UUID.test(a)) ?? PEDIDO_PADRAO;
  const nomeTemplate = flag(args, "template", PARAMETROS.template.padrao);
  const tpl = TEMPLATES[nomeTemplate];
  if (!tpl) sair(`Template "${nomeTemplate}" não existe. Rode --lista.`);

  /* O template pode trazer default proprio; a flag do usuario vence. */
  const p = {
    duracao: flag(args, "duracao", PARAMETROS.duracao.padrao),
    escala: flag(args, "escala", PARAMETROS.escala.padrao),
    velocidade: flag(args, "velocidade", PARAMETROS.velocidade.padrao),
    zona: flag(args, "zona", PARAMETROS.zona.padrao),
    alinhamento: flag(args, "alinhamento", tpl.alinhamento ?? PARAMETROS.alinhamento.padrao),
    camera: flag(args, "camera", tpl.camera ?? PARAMETROS.camera.padrao),
    intensidade: flag(args, "intensidade", PARAMETROS.intensidade.padrao),
  };

  const nomeSaida = flag(args, "saida", `video-${nomeTemplate}`);
  const env = await lerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) sair("SUPABASE_SERVICE_ROLE_KEY vazia no .env.local.");

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const pastaQuadros = path.join(SAIDA, "quadros");
  await mkdir(pastaQuadros, { recursive: true });
  /* Quadros de uma rodada anterior mais longa sobreviveriam e o ffmpeg os
     costuraria no fim do video novo. Limpa antes de desenhar. */
  for (const f of await readdir(pastaQuadros).catch(() => [])) {
    if (f.endsWith(".png")) await unlink(path.join(pastaQuadros, f));
  }

  console.log(`· template "${tpl.nome}" · ${p.duracao}s · texto ${p.escala}× · zona ${p.zona}`);

  const { data: pedido } = await db
    .from("pedidos")
    .select("id, tipo, clube, adversario, data_jogo, hora_jogo, campeonato, estadio, jogador_id, clube_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) sair(`Pedido ${pedidoId} não encontrado.`);

  const baixar = async (balde, caminho) => {
    if (!caminho) return null;
    const { data } = await db.storage.from(balde).download(caminho);
    return data ? Buffer.from(await data.arrayBuffer()) : null;
  };

  const [{ data: jogador }, { data: clube }, { data: marca }] = await Promise.all([
    db.from("jogadores").select("foto_url").eq("id", pedido.jogador_id).maybeSingle(),
    db.from("clubes").select("nome, nome_curto, escudo_url, cor_primaria, cor_secundaria").eq("id", pedido.clube_id).maybeSingle(),
    db.from("marcas").select("imagem_url").eq("ativa", true).limit(1).maybeSingle(),
  ]);

  const [escudo, logo] = await Promise.all([
    baixar("referencias", clube?.escudo_url),
    baixar("marcas", marca?.imagem_url),
  ]);

  /* --- a placa: reusar é o padrão, gerar é opt-in --- */
  const caminhoPlaca = path.join(SAIDA, "placa.png");
  let placa;
  if (!args.includes("--nova-placa") && existsSync(caminhoPlaca)) {
    console.log("· reusando a placa (custo zero)");
    placa = await readFile(caminhoPlaca);
  } else {
    const { data: ref } = await db
      .from("referencias")
      .select("imagem_url")
      .eq("tipo", pedido.tipo)
      .eq("formato", "story_9x16")
      .eq("ativa", true)
      .limit(1)
      .maybeSingle();
    console.log("· gerando placa nova (custa ~US$ 0,10)");
    placa = await gerarPlaca({
      chave: env.GEMINI_API_KEY,
      modelo: env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      prompt: promptDaPlaca({
        clube: clube?.nome ?? pedido.clube,
        cores: [clube?.cor_primaria, clube?.cor_secundaria].filter(Boolean).join(" e "),
      }),
      referencia: await baixar("referencias", ref?.imagem_url),
      foto: await baixar("fotos-jogadores", jogador?.foto_url),
    });
    await writeFile(caminhoPlaca, placa);
  }
  placa = await sharp(placa).resize(L, A, { fit: "cover" }).png().toBuffer();

  /* --- dados e layout, calculados uma vez --- */
  const dadosBase = {
    clube: clube?.nome_curto ?? pedido.clube ?? "",
    adversario: pedido.adversario ?? "",
    data: formatarData(pedido.data_jogo),
    hora: pedido.hora_jogo ?? "",
    estadio: pedido.estadio ?? "",
    campeonato: pedido.campeonato ?? "",
  };

  const layoutParcial = medirBloco(tpl.elementos, dadosBase, p);
  const topo = topoDoBloco(p.zona, layoutParcial.total);

  /* A medição do contraste usa a faixa EXATA do bloco, e não a imagem inteira:
     uma placa metade preta e metade branca tem luminância média 0.5 e não diz
     nada sobre o pedaço que interessa. */
  const alturaMedida = Math.min(A - Math.max(0, Math.round(topo)), Math.round(layoutParcial.total) || 300);
  const medida = await luminanciaDaRegiao(placa, {
    left: 0,
    top: Math.max(0, Math.round(topo)),
    width: L,
    height: Math.max(40, alturaMedida),
  });
  const corClube = clube?.cor_primaria || "#f2c200";
  const corTexto = contrasteDe(medida.media);

  /**
   * O veu e PROPORCIONAL ao desvio, e nao um liga-desliga.
   *
   * Um limiar cravado teria que ser calibrado, e nesta altura existe UMA placa
   * para calibrar em cima — foi assim que eu ja errei um diagnostico nesta
   * sessao, concluindo em cima de uma amostra so. A rampa evita a decisao: onde
   * a faixa e quase uniforme o veu chega perto de zero e nao suja a arte, e
   * onde ela e mesclada ele sobe sozinho.
   *
   * Os limites vieram de medir as tres faixas desta placa — topo 0.19, meio
   * 0.28, base 0.31 — mas a forma da rampa nao depende deles: mais placas so
   * ajustam onde ela comeca e termina.
   */
  const rampa = Math.min(1, Math.max(0, (medida.desvio - 0.18) / 0.14));
  const veu = rampa > 0.02
    ? { cor: corTexto === "#ffffff" ? "#000000" : "#ffffff", opacidade: 0.62 * rampa }
    : null;

  console.log(
    `· fundo do bloco: média ${medida.media.toFixed(2)}, desvio ${medida.desvio.toFixed(2)}` +
      ` → texto ${corTexto}${veu ? ` + véu ${veu.opacidade.toFixed(2)}` : ""}`,
  );

  const metaEscudo = escudo ? await sharp(escudo).metadata() : null;
  const caixa = 340;
  const prop = metaEscudo ? metaEscudo.width / metaEscudo.height : 1;

  const dados = {
    ...dadosBase,
    corClube,
    corTexto,
    veu,
    corSobreClube: contrasteDe(luminanciaDoHex(corClube)),
    escudoB64: escudo ? escudo.toString("base64") : "",
    escudoL: prop >= 1 ? caixa : caixa * prop,
    escudoA: prop >= 1 ? caixa / prop : caixa,
    logoAgenciaB64: logo ? (await sharp(logo).png().toBuffer()).toString("base64") : "",
    logoB64: logo ? (await sharp(logo).png().toBuffer()).toString("base64") : "",
  };

  const total = Math.round(p.duracao * FPS);
  const ctx = {
    tpl,
    p,
    dados,
    layout: { ...layoutParcial, topo },
    tempo: { fator: p.duracao / 8, velocidade: p.velocidade, fps: FPS, total },
  };

  console.log(`· desenhando ${total} quadros`);
  for (let k = 0; k < total; k++) {
    const fundo = await fundoDoQuadro(k, placa, ctx);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">${camadaDeUmQuadro(k, ctx)}</svg>`;
    const quadro = await sharp(fundo)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png({ compressionLevel: 3 })
      .toBuffer();
    await writeFile(path.join(pastaQuadros, `q${String(k).padStart(4, "0")}.png`), quadro);
    if (k % 30 === 0) process.stdout.write(`  ${k}/${total}\r`);
  }

  const mp4 = path.join(SAIDA, `${nomeSaida}.mp4`);
  console.log(`\n· codificando ${mp4}`);
  await execFileP(acharFfmpeg(), [
    "-y", "-v", "error",
    "-framerate", String(FPS),
    "-i", path.join(pastaQuadros, "q%04d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    mp4,
  ]);

  console.log(`\nPronto: ${mp4}`);
}

main().catch((e) => {
  if (e instanceof Parada) console.error(`\n${e.message}\n`);
  else console.error(e);
  process.exitCode = 1;
});
