/**
 * Prova de conceito: um matchday em VIDEO, 9:16, a partir de um pedido que ja
 * existe no banco.
 *
 *   node scripts/video-poc.mjs                      usa o pedido padrao
 *   node scripts/video-poc.mjs <pedido_id>
 *   node scripts/video-poc.mjs <pedido_id> --plate out/video/plate.png
 *
 * NAO toca no produto: nao cria tabela, nao muda tela, nao grava no banco.
 * Escreve tudo em out/video/ e no fim cospe um mp4.
 *
 * A APOSTA QUE ESTE ARQUIVO TESTA
 *
 * Os videos de referencia da agencia (Criciuma x Fortaleza, Botafogo-SP x
 * Criciuma) nao sao video generativo. Sao motion graphics: uma arte parada com
 * camada de texto animada por cima, mais um leve push-in de camera. O modelo
 * entra so onde ele e bom — fundo, atleta, clima — e a tipografia passa a ser
 * desenhada em CODIGO.
 *
 * Isso resolve de graca o problema que consumiu a sessao inteira de correcoes
 * de prompt: nome cortado, confronto pela metade, letra virando textura, cor de
 * rival. Nenhum desses erros e possivel quando quem desenha a letra e o
 * `sharp`. O modelo perde a chance de errar porque perde a tarefa.
 *
 * POR QUE SHARP + FFMPEG, E NAO REMOTION
 *
 * Remotion e o caminho de producao — React, composicao declarativa, mais facil
 * de evoluir. Mas ele traz Chromium junto, e o que precisa ser respondido
 * primeiro e ESTETICO, nao arquitetural: o resultado convence? Para isso, o
 * `sharp` que o projeto ja usa e o ffmpeg bastam, e a coreografia (tempos,
 * easing, ordem das entradas) transfere inteira depois.
 *
 * A FONTE
 *
 * Impact, e nao a Chakra Petch do produto. Um teste nesta maquina mostrou que o
 * librsvg do sharp so enxerga fontes instaladas no sistema: Chakra Petch e
 * Bahnschrift caem em serifa, Impact e Arial Black renderizam. Impact tambem e
 * a face certa para isto — condensada e pesada, que e o que matchday usa. Em
 * producao a fonte da marca entra como arquivo, nao por nome.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const SEGUNDOS = 8;
const TOTAL = FPS * SEGUNDOS;

const PEDIDO_PADRAO = "1f40e559-6c6b-4760-87f3-20100d8f66f1";
const SAIDA = "out/video";

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

/* ------------------------------------------------------------------ tempo */

/** Segundo -> quadro. Escrever a coreografia em segundos e o que a torna lida. */
const q = (s) => Math.round(s * FPS);

/** 0 antes de `de`, 1 depois de `ate`, com easing no meio. */
function faixa(quadro, de, ate, easing = saidaCubica) {
  const a = q(de);
  const b = q(ate);
  if (quadro <= a) return 0;
  if (quadro >= b) return 1;
  return easing((quadro - a) / (b - a));
}

const saidaCubica = (t) => 1 - Math.pow(1 - t, 3);
const suave = (t) => t * t * (3 - 2 * t);
const linear = (t) => t;

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
  for (const versao of ["ffmpeg-9.0-full_build", "ffmpeg-7.1-full_build"]) {
    const p = path.join(raiz, versao, "bin", "ffmpeg.exe");
    if (existsSync(p)) return p;
  }
  return "ffmpeg";
}

/* --------------------------------------------------------------- textos */

const escapar = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

/** "2026-07-30" -> "QUINTA 30.07". Data por extenso e o que o post comunica. */
function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return `${DIAS[d.getUTCDay()]} ${String(dia).padStart(2, "0")}.${String(mes).padStart(2, "0")}`;
}

/* ------------------------------------------------------------- a placa */

/**
 * O prompt da PLACA, que e o oposto do prompt da arte parada.
 *
 * A arte parada pede tipografia. Esta pede o contrario, e com insistencia: o
 * modelo desenha texto por reflexo, porque toda referencia do acervo tem texto.
 * A instrucao precisa dizer explicitamente para IGNORAR o texto da referencia e
 * reproduzir so o resto — pedir "sem texto" sem essa frase deixa o modelo achar
 * que ele deve copiar o layout inteiro, letras inclusive.
 *
 * O terco superior sai limpo de proposito: e onde a tipografia entra depois. Ao
 * contrario da arte parada, aqui a gente SABE onde o texto vai cair, entao dá
 * para reservar o espaco em vez de torcer.
 */
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

  /**
   * 503 do Gemini e comum e passageiro ("high demand"), e nao significa que o
   * pedido esta errado. Sem retry, uma prova de conceito falha por motivo que
   * nao tem nada a ver com o que ela testa. Espera crescente, teto baixo.
   */
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

/* ------------------------------------------------------------ contraste */

/**
 * A cor do texto sai de uma MEDICAO da placa, nao de um palpite.
 *
 * Aqui esta a diferenca de fundo entre a arte parada e o video. Na arte parada
 * a tipografia e desenhada pelo modelo, num lugar que so ele conhece, e a unica
 * ferramenta e pedir legibilidade no prompt — foi o que consumiu a sessao
 * inteira de correcoes. No video a gente SABE em que retangulo cada linha cai,
 * entao da para medir o que esta atras dela e escolher a cor que contrasta.
 *
 * A primeira placa saiu com o terco superior branco (luminancia 0.65) e o texto
 * branco sumiu. Nao e um erro de prompt a corrigir: e uma medicao que faltava.
 *
 * Luminancia perceptual, os mesmos pesos do `corQueContrasta` de src/lib —
 * verde pesa dez vezes mais que azul para o olho, e media aritmetica de RGB
 * erraria em fundo saturado.
 */
async function luminanciaDaRegiao(imagem, { left, top, width, height }) {
  const s = await sharp(imagem).extract({ left, top, width, height }).stats();
  const [r, g, b] = s.channels.map((c) => c.mean);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Preto sobre claro, branco sobre escuro. O corte em 0.55 e o do olho, nao 0.5. */
const contrasteDe = (lum) => (lum > 0.55 ? "#0b0b0b" : "#ffffff");

/** Mesma conta, a partir de um hex — a barra do confronto e cor chapada. */
function luminanciaDoHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/* ---------------------------------------------------------- coreografia */

/**
 * A camada de texto de UM quadro, como SVG.
 *
 * Tudo que se move vive aqui: cada elemento le o proprio progresso de `faixa()`
 * e desenha o estado daquele instante. Nao ha estado acumulado entre quadros —
 * qualquer quadro pode ser renderizado sozinho, o que torna o render paralelo e
 * a depuracao possivel (renderize o quadro 97 e olhe).
 */
function camadaDeTexto(k, d) {
  const partes = [];

  /* ---- Cena 0: abertura no preto, so o escudo e o nome do clube ---- */
  if (k < q(1.0)) {
    const entra = faixa(k, 0.1, 0.7);
    const escala = 0.72 + 0.28 * entra;
    const y = A * 0.42;
    partes.push(
      `<g opacity="${entra.toFixed(3)}" transform="translate(${L / 2} ${y}) scale(${escala.toFixed(3)})">
         <image href="data:image/png;base64,${d.escudoClubeB64}"
                x="${-d.escudoL / 2}" y="${-d.escudoA / 2}" width="${d.escudoL}" height="${d.escudoA}"/>
       </g>`,
      `<text x="${L / 2}" y="${y + 250}" text-anchor="middle" fill="#fff"
             font-family="Arial Black, Arial" font-size="34" letter-spacing="14"
             opacity="${faixa(k, 0.45, 0.9).toFixed(3)}">${escapar(d.clube.toUpperCase())}</text>`,
    );
    return partes.join("\n");
  }

  /* ---- Cena 1: a arte, com o bloco de texto entrando em camadas ---- */

  /* Flash curto no corte. Sem ele o corte parece engasgo; com ele, corte. */
  const flash = 1 - faixa(k, 1.0, 1.18, linear);
  if (flash > 0.01) {
    partes.push(`<rect width="${L}" height="${A}" fill="#fff" opacity="${(flash * 0.45).toFixed(3)}"/>`);
  }

  const M = 72; // margem lateral do bloco de texto
  const yClube = 300;

  /* Clube: desliza da esquerda. Deslocamento e opacidade no mesmo progresso —
     duas curvas diferentes fariam a letra chegar antes ou depois de si mesma. */
  const pClube = faixa(k, 1.25, 1.95);
  partes.push(
    `<g opacity="${pClube.toFixed(3)}" transform="translate(${(-70 * (1 - pClube)).toFixed(1)} 0)">
       <text x="${M}" y="${yClube}" fill="${d.corTexto}" font-family="Impact, Arial Black"
             font-size="150" letter-spacing="2" fill-opacity="1">${escapar(d.clube.toUpperCase())}</text>
     </g>`,
  );

  /* Confronto: a barra varre primeiro e o texto e revelado por ela — clipPath
     com largura animada, para a letra nascer de dentro da barra em vez de
     aparecer do lado dela. */
  const pBarra = faixa(k, 1.95, 2.45);
  const pTexto = faixa(k, 2.08, 2.62);
  const larguraBarra = (L - M * 2) * pBarra;
  const yBarra = yClube + 30;
  partes.push(
    `<rect x="${M}" y="${yBarra}" width="${larguraBarra.toFixed(1)}" height="86" fill="${d.cor}"/>`,
    `<clipPath id="cx"><rect x="${M}" y="${yBarra}" width="${((L - M * 2) * pTexto).toFixed(1)}" height="86"/></clipPath>`,
    `<text x="${M + 22}" y="${yBarra + 66}" clip-path="url(#cx)" fill="${d.corSobreBarra}"
           font-family="Impact, Arial Black" font-size="66" letter-spacing="1"
           >X ${escapar(d.adversario.toUpperCase())}</text>`,
  );

  /* Tarja de dados: mesma varredura, mais discreta e mais tarde. */
  const pTarja = faixa(k, 2.6, 3.15);
  const yTarja = yBarra + 108;
  const linhaDados = [d.data, d.hora, d.estadio].filter(Boolean).join("   ·   ").toUpperCase();
  partes.push(
    `<clipPath id="ct"><rect x="${M}" y="${yTarja}" width="${((L - M * 2) * pTarja).toFixed(1)}" height="56"/></clipPath>`,
    `<g clip-path="url(#ct)">
       <rect x="${M}" y="${yTarja}" width="${L - M * 2}" height="56" fill="#0b0b0b" opacity="0.72"/>
       <text x="${M + 20}" y="${yTarja + 39}" fill="#fff" font-family="Arial Black, Arial"
             font-size="27" letter-spacing="3">${escapar(linhaDados)}</text>
     </g>`,
  );

  /* Campeonato: pequeno, acima de tudo, entrando por ultimo. */
  if (d.campeonato) {
    partes.push(
      `<text x="${M}" y="${yClube - 128}" fill="${d.corTexto}" opacity="${(faixa(k, 3.0, 3.5) * 0.85).toFixed(3)}"
             font-family="Arial Black, Arial" font-size="26" letter-spacing="10"
             >${escapar(d.campeonato.toUpperCase())}</text>`,
    );
  }

  /* Logo da agencia: canto inferior direito, entra cedo e fica. */
  if (d.logoB64) {
    const pl = faixa(k, 1.4, 2.0);
    partes.push(
      `<g opacity="${(pl * 0.95).toFixed(3)}">
         <image href="data:image/png;base64,${d.logoB64}" x="${L - 300}" y="${A - 190}" width="230" height="110"
                preserveAspectRatio="xMaxYMax meet"/>
       </g>`,
    );
  }

  /* Fecha no preto. */
  const fim = faixa(k, 7.25, 8.0, suave);
  if (fim > 0) partes.push(`<rect width="${L}" height="${A}" fill="#000" opacity="${fim.toFixed(3)}"/>`);

  return partes.join("\n");
}

/** O fundo de um quadro: preto na abertura, placa com push-in depois. */
async function fundoDoQuadro(k, placa) {
  if (k < q(1.0)) {
    return sharp({ create: { width: L, height: A, channels: 3, background: "#000" } })
      .png()
      .toBuffer();
  }
  /* Push-in continuo e lento: 1.02 -> 1.10 ao longo dos 7s de cena. Recorta do
     centro e reamplia, que e o que uma camera fecharia. */
  const t = (k - q(1.0)) / (TOTAL - q(1.0));
  const escala = 1.02 + 0.08 * t;
  const lc = Math.round(L / escala);
  const ac = Math.round(A / escala);
  return sharp(placa)
    .extract({ left: Math.round((L - lc) / 2), top: Math.round((A - ac) / 2), width: lc, height: ac })
    .resize(L, A)
    .png()
    .toBuffer();
}

/* ----------------------------------------------------------------- main */

async function main() {
  const args = process.argv.slice(2);
  const pedidoId = args.find((a) => !a.startsWith("--")) ?? PEDIDO_PADRAO;
  const placaExistente = args.includes("--plate")
    ? args[args.indexOf("--plate") + 1]
    : null;

  const env = await lerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) sair("SUPABASE_SERVICE_ROLE_KEY vazia no .env.local.");

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  await mkdir(path.join(SAIDA, "quadros"), { recursive: true });

  console.log("· lendo o pedido");
  const { data: pedido, error } = await db
    .from("pedidos")
    .select(
      "id, tipo, nome_jogador, clube, adversario, data_jogo, hora_jogo, campeonato, estadio, jogador_id, clube_id, adversario_id",
    )
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) sair(`Pedido ${pedidoId} não encontrado.`);

  const baixar = async (balde, caminho) => {
    if (!caminho) return null;
    const { data, error: e } = await db.storage.from(balde).download(caminho);
    if (e || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  };

  console.log("· buscando materiais");
  const [{ data: jogador }, { data: clubeCasa }, { data: marca }] = await Promise.all([
    db.from("jogadores").select("foto_url").eq("id", pedido.jogador_id).maybeSingle(),
    db
      .from("clubes")
      .select("nome, nome_curto, escudo_url, cor_primaria, cor_secundaria")
      .eq("id", pedido.clube_id)
      .maybeSingle(),
    db.from("marcas").select("imagem_url").eq("ativa", true).limit(1).maybeSingle(),
  ]);

  const [foto, escudoClube, logo] = await Promise.all([
    baixar("fotos-jogadores", jogador?.foto_url),
    baixar("referencias", clubeCasa?.escudo_url),
    baixar("marcas", marca?.imagem_url),
  ]);

  /* --- a placa --- */
  const caminhoPlaca = path.join(SAIDA, "placa.png");
  let placa;
  if (placaExistente && existsSync(placaExistente)) {
    console.log(`· reusando a placa de ${placaExistente} (sem gastar geração)`);
    placa = await readFile(placaExistente);
  } else {
    const { data: ref } = await db
      .from("referencias")
      .select("imagem_url")
      .eq("tipo", pedido.tipo)
      .eq("formato", "story_9x16")
      .eq("ativa", true)
      .limit(1)
      .maybeSingle();
    const referencia = await baixar("referencias", ref?.imagem_url);

    console.log("· gerando a placa sem texto (custa uma geração)");
    const cores = [clubeCasa?.cor_primaria, clubeCasa?.cor_secundaria].filter(Boolean).join(" e ");
    placa = await gerarPlaca({
      chave: env.GEMINI_API_KEY,
      modelo: env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      prompt: promptDaPlaca({ clube: clubeCasa?.nome ?? pedido.clube, cores }),
      referencia,
      foto,
    });
    await writeFile(caminhoPlaca, placa);
    console.log(`  placa em ${caminhoPlaca}`);
  }

  /* Normaliza a placa para o quadro exato, senao o extract do push-in estoura. */
  placa = await sharp(placa).resize(L, A, { fit: "cover" }).png().toBuffer();

  /* --- os quadros --- */
  /**
   * As cores do texto saem de uma medicao da placa JA normalizada.
   *
   * A regiao medida e exatamente onde o bloco de texto cai (y 150..560), e nao
   * a imagem inteira: uma placa metade preta e metade branca tem luminancia
   * media 0.5 e nao diz nada sobre o pedaco que interessa.
   */
  const lumTexto = await luminanciaDaRegiao(placa, { left: 0, top: 150, width: L, height: 410 });
  const corBarra = clubeCasa?.cor_primaria || "#f2c200";
  console.log(`· luminância sob o texto: ${lumTexto.toFixed(2)} → ${contrasteDe(lumTexto)}`);

  const escudoMeta = escudoClube ? await sharp(escudoClube).metadata() : null;
  const caixaEscudo = 340;
  const proporcao = escudoMeta ? escudoMeta.width / escudoMeta.height : 1;

  const dados = {
    clube: clubeCasa?.nome_curto ?? pedido.clube ?? "",
    adversario: pedido.adversario ?? "",
    data: formatarData(pedido.data_jogo),
    hora: pedido.hora_jogo ?? "",
    estadio: pedido.estadio ?? "",
    campeonato: pedido.campeonato ?? "",
    cor: corBarra,
    corTexto: contrasteDe(lumTexto),
    corSobreBarra: contrasteDe(luminanciaDoHex(corBarra)),
    escudoL: proporcao >= 1 ? caixaEscudo : caixaEscudo * proporcao,
    escudoA: proporcao >= 1 ? caixaEscudo / proporcao : caixaEscudo,
    escudoClubeB64: escudoClube ? escudoClube.toString("base64") : "",
    logoB64: logo ? (await sharp(logo).png().toBuffer()).toString("base64") : "",
  };

  console.log(`· desenhando ${TOTAL} quadros`);
  for (let k = 0; k < TOTAL; k++) {
    const fundo = await fundoDoQuadro(k, placa);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${L}" height="${A}">${camadaDeTexto(k, dados)}</svg>`;
    const quadro = await sharp(fundo)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png({ compressionLevel: 3 })
      .toBuffer();
    await writeFile(path.join(SAIDA, "quadros", `q${String(k).padStart(4, "0")}.png`), quadro);
    if (k % 30 === 0) process.stdout.write(`  ${k}/${TOTAL}\r`);
  }

  /* --- o mp4 --- */
  const mp4 = path.join(SAIDA, "matchday.mp4");
  console.log(`\n· codificando ${mp4}`);
  await execFileP(acharFfmpeg(), [
    "-y", "-v", "error",
    "-framerate", String(FPS),
    "-i", path.join(SAIDA, "quadros", "q%04d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    mp4,
  ]);

  console.log(`\nPronto: ${mp4}`);
}

main().catch((e) => {
  if (e instanceof Parada) console.error(`\n${e.message}\n`);
  else console.error(e);
  process.exitCode = 1;
});
