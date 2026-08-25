/**
 * Prova das CAMADAS: fundo e atleta gerados separados, compostos em codigo.
 *
 *   node scripts/camadas.mjs              reusa o que ja existe em out/camadas
 *   node scripts/camadas.mjs --gerar      gera as duas camadas (custa ~US$ 0,20)
 *
 * O QUE ISTO TESTA
 *
 * Hoje a placa e uma imagem chapada: fundo, atleta e clima num arquivo so. Tudo
 * se move junto, e o texto so pode ficar NA FRENTE de tudo.
 *
 * Com o atleta numa camada propria abrem-se tres coisas que a imagem chapada
 * nao permite:
 *
 *   1. PARALAXE — fundo e atleta andam em velocidades diferentes. E o que mais
 *      separa "imagem com zoom" de "video" na percepcao.
 *   2. TEXTO ATRAS DO ATLETA — a assinatura do genero, e a coisa que mais deu
 *      trabalho nesta sessao inteira. Em camadas ela deixa de ser um pedido ao
 *      modelo e vira ordem de composicao: fundo, texto, atleta. A oclusao passa
 *      a ser DECIDIDA, e nunca mais come uma silaba.
 *   3. O atleta entrar sozinho, com tempo proprio.
 *
 * O OBSTACULO, E A SAIDA
 *
 * O modelo devolve JPEG, que nao tem canal alpha — nao da para pedir "atleta
 * com fundo transparente". Entao ele desenha o atleta sobre um fundo CHAPADO e
 * o codigo chaveia a cor, como fundo infinito de estudio.
 *
 * Magenta puro porque nao existe uniforme de futebol magenta: verde brigaria
 * com gramado e com o Palmeiras, azul com metade da serie A, e qualquer cor
 * proxima de pele ou de manto abriria buraco no atleta.
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
const SEGUNDOS = 6;
const TOTAL = FPS * SEGUNDOS;

const PEDIDO = "1f40e559-6c6b-4760-87f3-20100d8f66f1";
const SAIDA = "out/camadas";
const CHAVE = { r: 255, g: 0, b: 255 };

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8");
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

/* ------------------------------------------------------------- prompts */

const SEM_TEXTO = [
  "ESTA IMAGEM NÃO TEM TEXTO NENHUM.",
  "Nenhuma palavra, letra, número, sigla, escudo, logo ou marca d'água — em lugar nenhum.",
  "A imagem de referência TEM texto: ignore o texto dela e reproduza apenas o resto.",
].join("\n");

function promptFundo({ clube, cores }) {
  return [
    "Reproduza o ESTILO da imagem de referência: paleta, tratamento de fundo, textura,",
    "iluminação e clima.",
    "",
    "NÃO DESENHE NENHUMA PESSOA. Esta imagem é só o CENÁRIO — estádio, luz, textura,",
    "atmosfera. Nenhum atleta, nenhuma silhueta humana, nenhum rosto. A figura entra",
    "depois, por cima, e o espaço dela precisa estar vazio.",
    "",
    SEM_TEXTO,
    "",
    "A imagem sangra até a borda: ocupa o quadro inteiro, sem moldura nem margem branca.",
    `Ambiente ligado ao ${clube}.`,
    cores ? `A paleta sai das cores do clube: ${cores}.` : "",
    "Formato vertical 9:16, alta resolução.",
  ]
    .filter(Boolean)
    .join("\n");
}

function promptAtleta({ clube }) {
  return [
    "O ATLETA DA FOTO, DE CORPO INTEIRO, SOBRE FUNDO MAGENTA CHAPADO.",
    "",
    "O fundo é MAGENTA PURO (#FF00FF), liso, uniforme, sem textura, sem sombra projetada,",
    "sem degradê e sem reflexo — fundo infinito de estúdio. Nada de magenta no atleta:",
    "nem na pele, nem no uniforme, nem no cabelo.",
    "",
    "O rosto é o da foto enviada, preservado. O atleta veste o uniforme da imagem de",
    "referência do manto, e aparece de corpo inteiro, em pé, postura de jogo, recortado",
    "com a silhueta inteira dentro do quadro e uma folga em volta.",
    "",
    "Tratamento fotográfico com contraste forte, como pôster esportivo. A luz vem de cima",
    "e de trás, deixando a borda do corpo definida contra o fundo.",
    "",
    SEM_TEXTO,
    "",
    `O atleta é do ${clube}.`,
    "Formato vertical 9:16.",
  ].join("\n");
}

async function gerar({ chave, modelo, prompt, imagens }) {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: chave });
  const partes = [];
  for (const im of imagens) {
    if (!im?.bytes) continue;
    partes.push({ text: im.rotulo });
    partes.push({ inlineData: { mimeType: im.mime ?? "image/png", data: im.bytes.toString("base64") } });
  }
  partes.push({ text: prompt });

  let ultimo;
  for (let t = 1; t <= 4; t++) {
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
      console.log(`  tentativa ${t} falhou (${e.status ?? "?"}), esperando ${t * 8}s`);
      await new Promise((r) => setTimeout(r, t * 8000));
    }
  }
  throw ultimo;
}

/* ------------------------------------------------------------ chaveamento */

/**
 * Tira o magenta e devolve o atleta com alpha.
 *
 * O sharp nao faz conta por pixel, entao os pixels saem como buffer cru, a
 * conta acontece em JS e o resultado volta. Dois megapixels uma vez so — o
 * custo e irrelevante perto de uma chamada ao modelo.
 *
 * A borda e uma RAMPA e nao um corte: alpha 0 dentro de `perto`, 1 fora de
 * `longe`, interpolado no meio. Limiar seco deixaria serrilha no cabelo, que e
 * onde chave de cor sempre se denuncia.
 *
 * O `derrame` existe porque o fundo magenta reflete no contorno do corpo: sem
 * tirar esse excesso de vermelho e azul, o atleta fica com auréola rosa por
 * cima de um fundo escuro.
 */
async function chavear(jpeg, { perto = 90, longe = 190, derrame = true } = {}) {
  const { data, info } = await sharp(jpeg)
    .resize(L, A, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];

    /* Distancia ao magenta, com o verde pesando: o que define magenta e a
       AUSENCIA de verde entre vermelho e azul altos. */
    const dist = Math.sqrt(
      (r - CHAVE.r) ** 2 + ((g - CHAVE.g) * 1.6) ** 2 + (b - CHAVE.b) ** 2,
    );

    let a = 255;
    if (dist <= perto) a = 0;
    else if (dist < longe) a = Math.round(((dist - perto) / (longe - perto)) * 255);
    data[o + 3] = a;

    if (a > 0 && derrame) {
      /* Derrame: onde vermelho e azul superam o verde, puxa os dois para perto
         dele. So no que sobrou, e proporcional ao excesso. */
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

/* ------------------------------------------------------------ coreografia */

const saidaCubica = (t) => 1 - Math.pow(1 - t, 3);
const suave = (t) => t * t * (3 - 2 * t);

function faixa(k, de, ate, easing = saidaCubica) {
  const a = de * FPS;
  const b = ate * FPS;
  if (k <= a) return 0;
  if (k >= b) return 1;
  return easing((k - a) / (b - a));
}

/** Recorte com zoom e deslocamento, para o paralaxe. */
async function plano(img, escala, deslocY = 0) {
  const lc = Math.round(L / escala);
  const ac = Math.round(A / escala);
  const top = Math.max(0, Math.min(A - ac, Math.round((A - ac) / 2 + deslocY)));
  return sharp(img)
    .extract({ left: Math.round((L - lc) / 2), top, width: lc, height: ac })
    .resize(L, A)
    .png()
    .toBuffer();
}

const escapar = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return `${DIAS[d.getUTCDay()]} ${String(dia).padStart(2, "0")}.${String(mes).padStart(2, "0")}`;
}

/**
 * O texto, que agora mora ENTRE o fundo e o atleta.
 *
 * Repare no que sumiu: nao ha medicao de luminancia, nao ha veu, nao ha regra
 * de "so a beirada pode ser coberta". A oclusao virou ordem de camada — o
 * atleta cobre o que cobrir, e nenhuma letra some por acidente porque o
 * desenho inteiro e conhecido antes de compor.
 */
function camadaDeTexto(k, d) {
  const M = 72;
  const partes = [];

  /**
   * O nome ATRAVESSA o atleta, e sobra dos dois lados.
   *
   * A primeira tentativa punha "VASCO" a 230px comecando na margem: terminava
   * antes do atleta e virava "VA" com o resto coberto. Nao e o atleta que esta
   * grande demais — e o nome que era estreito demais para atravessa-lo.
   *
   * A regra do genero e essa: tipografia larga o suficiente para o corpo cair
   * no MEIO dela. O que se perde e o miolo de duas letras, e o olho completa;
   * o que nao pode e a palavra acabar dentro do corpo.
   *
   * Repare que isto e a mesma regra da sql/031, que custou tres artes para
   * acertar por prompt. Aqui ela e uma coordenada.
   */
  const pClube = faixa(k, 0.5, 1.3);
  partes.push(
    `<text x="${-10 + -80 * (1 - pClube)}" y="560" fill="#fff" opacity="${pClube.toFixed(3)}"
           font-family="Impact, Arial Black" font-size="300" letter-spacing="-4"
           >${escapar(d.clube.toUpperCase())}</text>`,
  );

  /* O confronto fica ACIMA da cabeca, em area livre: linha fina nao sobrevive
     a oclusao como a linha grossa sobrevive. */
  const pAdv = faixa(k, 0.9, 1.7);
  partes.push(
    `<text x="${M + -80 * (1 - pAdv)}" y="300" fill="#fff" opacity="${pAdv.toFixed(3)}"
           font-family="Impact, Arial Black" font-size="104"
           >X ${escapar(d.adversario.toUpperCase())}</text>`,
  );

  return partes.join("\n");
}

/** O que vai POR CIMA do atleta: só o mínimo — dados e assinatura. */
function camadaDaFrente(k, d) {
  const M = 72;
  const partes = [];
  const p = faixa(k, 1.9, 2.6);
  if (p > 0.01) {
    const largura = (L - M * 2) * p;
    partes.push(
      `<clipPath id="cd"><rect x="${M}" y="1560" width="${largura.toFixed(1)}" height="64"/></clipPath>`,
      `<g clip-path="url(#cd)">
         <rect x="${M}" y="1560" width="${L - M * 2}" height="64" fill="#0b0b0b" opacity="0.78"/>
         <text x="${M + 22}" y="1604" fill="#fff" font-family="Arial Black, Arial"
               font-size="30" letter-spacing="3">${escapar(d.dados)}</text>
       </g>`,
    );
  }
  if (d.logoB64) {
    partes.push(
      `<g opacity="${(faixa(k, 1.2, 1.8) * 0.95).toFixed(3)}">
         <image href="data:image/png;base64,${d.logoB64}" x="${L - 300}" y="${A - 180}"
                width="230" height="110" preserveAspectRatio="xMaxYMax meet"/>
       </g>`,
    );
  }
  const fim = faixa(k, SEGUNDOS - 0.7, SEGUNDOS, suave);
  if (fim > 0) partes.push(`<rect width="${L}" height="${A}" fill="#000" opacity="${fim.toFixed(3)}"/>`);
  return partes.join("\n");
}

/* ----------------------------------------------------------------- main */

async function main() {
  const args = process.argv.slice(2);
  await mkdir(path.join(SAIDA, "quadros"), { recursive: true });

  const env = await lerEnv();
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: pedido } = await db
    .from("pedidos")
    .select("tipo, clube, adversario, data_jogo, hora_jogo, estadio, jogador_id, clube_id")
    .eq("id", PEDIDO)
    .maybeSingle();
  if (!pedido) sair("Pedido não encontrado.");

  const baixar = async (b, c) => {
    if (!c) return null;
    const { data } = await db.storage.from(b).download(c);
    return data ? Buffer.from(await data.arrayBuffer()) : null;
  };

  const [{ data: jog }, { data: clube }, { data: marca }, { data: unif }, { data: ref }] =
    await Promise.all([
      db.from("jogadores").select("foto_url").eq("id", pedido.jogador_id).maybeSingle(),
      db.from("clubes").select("nome, nome_curto, cor_primaria, cor_secundaria").eq("id", pedido.clube_id).maybeSingle(),
      db.from("marcas").select("imagem_url").eq("ativa", true).limit(1).maybeSingle(),
      db.from("uniformes").select("imagem_url").eq("clube_id", pedido.clube_id).eq("ativo", true).limit(1).maybeSingle(),
      db.from("referencias").select("imagem_url").eq("tipo", pedido.tipo).eq("formato", "story_9x16").eq("ativa", true).limit(1).maybeSingle(),
    ]);

  const [foto, logo, uniforme, referencia] = await Promise.all([
    baixar("fotos-jogadores", jog?.foto_url),
    baixar("marcas", marca?.imagem_url),
    baixar("uniformes", unif?.imagem_url),
    baixar("referencias", ref?.imagem_url),
  ]);

  const caminhoFundo = path.join(SAIDA, "fundo.png");
  const caminhoAtletaCru = path.join(SAIDA, "atleta-magenta.png");
  const caminhoAtleta = path.join(SAIDA, "atleta.png");

  let fundo;
  let atleta;

  if (args.includes("--gerar") || !existsSync(caminhoFundo)) {
    const comum = {
      chave: env.GEMINI_API_KEY,
      modelo: env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    };
    const cores = [clube?.cor_primaria, clube?.cor_secundaria].filter(Boolean).join(" e ");

    console.log("· gerando o FUNDO (sem ninguém)");
    fundo = await gerar({
      ...comum,
      prompt: promptFundo({ clube: clube?.nome ?? pedido.clube, cores }),
      imagens: [{ rotulo: "Imagem 1 — referência de estilo:", bytes: referencia }],
    });
    await writeFile(caminhoFundo, fundo);

    console.log("· gerando o ATLETA sobre magenta");
    const cru = await gerar({
      ...comum,
      prompt: promptAtleta({ clube: clube?.nome ?? pedido.clube }),
      imagens: [
        { rotulo: "Imagem 1 — foto do atleta, preservar a identidade:", bytes: foto, mime: "image/png" },
        { rotulo: "Imagem 2 — o uniforme que ele veste:", bytes: uniforme, mime: "image/jpeg" },
      ],
    });
    await writeFile(caminhoAtletaCru, cru);

    console.log("· chaveando o magenta");
    atleta = await chavear(cru);
    await writeFile(caminhoAtleta, atleta);
  } else {
    console.log("· reusando as camadas (custo zero)");
    fundo = await readFile(caminhoFundo);
    atleta = await readFile(caminhoAtleta);
  }

  fundo = await sharp(fundo).resize(L, A, { fit: "cover" }).png().toBuffer();

  const dados = {
    clube: clube?.nome_curto ?? pedido.clube ?? "",
    adversario: pedido.adversario ?? "",
    dados: [formatarData(pedido.data_jogo), pedido.hora_jogo, pedido.estadio]
      .filter(Boolean)
      .join("   ·   ")
      .toUpperCase(),
    logoB64: logo ? (await sharp(logo).png().toBuffer()).toString("base64") : "",
  };

  console.log(`· desenhando ${TOTAL} quadros (fundo → texto → atleta → frente)`);
  for (let k = 0; k < TOTAL; k++) {
    const t = k / TOTAL;

    /* PARALAXE: o fundo fecha devagar, o atleta fecha mais rapido. A diferenca
       entre as duas velocidades e o efeito inteiro — igual, seria zoom. */
    const camadaFundo = await plano(fundo, 1.02 + 0.05 * t);
    const camadaAtleta = await plano(atleta, 1.0 + 0.14 * t, 30 * t);

    /* O atleta ainda entra: sobe um pouco e ganha corpo nos primeiros 0,8s. */
    const entrada = faixa(k, 0, 0.8);
    const atletaEntrando = await sharp(camadaAtleta)
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
               <rect width="${L}" height="${A}" fill="#000" opacity="${(1 - entrada).toFixed(3)}"/>
             </svg>`,
          ),
          blend: "dest-in",
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer()
      .catch(() => camadaAtleta);

    const svgAtras = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">${camadaDeTexto(k, dados)}</svg>`;
    const svgFrente = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">${camadaDaFrente(k, dados)}</svg>`;

    const quadro = await sharp(camadaFundo)
      .composite([
        { input: Buffer.from(svgAtras), top: 0, left: 0 },
        { input: entrada < 1 ? atletaEntrando : camadaAtleta, top: 0, left: 0 },
        { input: Buffer.from(svgFrente), top: 0, left: 0 },
      ])
      .png({ compressionLevel: 3 })
      .toBuffer();

    await writeFile(path.join(SAIDA, "quadros", `q${String(k).padStart(4, "0")}.png`), quadro);
    if (k % 30 === 0) process.stdout.write(`  ${k}/${TOTAL}\r`);
  }

  const mp4 = path.join(SAIDA, "camadas.mp4");
  console.log(`\n· codificando ${mp4}`);
  await execFileP(acharFfmpeg(), [
    "-y", "-v", "error",
    "-framerate", String(FPS),
    "-i", path.join(SAIDA, "quadros", "q%04d.png"),
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
