/**
 * Gera as imagens de mentira da fase 1 (public/mock) com sharp.
 *
 *   fundo-*.png  fundo limpo — e o que o MockProvider devolve ao pipeline
 *   arte-*.png   arte ja composta, povoa a fila com historico
 *   ref-*.png    referencia curada de mentira do admin
 *
 * O estilo do texto aqui repete o de src/lib/compose.ts de proposito: este
 * arquivo inteiro morre quando as artes reais vierem do Supabase Storage.
 * Some quando as artes reais passarem a vir do Supabase Storage.
 *   node scripts/gerar-mocks.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const TIPOS = {
  contratacao: { rotulo: "CONTRATAÇÃO", c1: "#FF2D6F", c2: "#7B3BFF", tag: "BEM-VINDO" },
  gol: { rotulo: "GOL", c1: "#FF4D2D", c2: "#FF2D6F", tag: "GOLAÇO" },
  estreia: { rotulo: "ESTREIA", c1: "#2D7BFF", c2: "#7B3BFF", tag: "PRIMEIRO JOGO" },
  mvp: { rotulo: "CRAQUE DO JOGO", c1: "#FFB020", c2: "#FF2D6F", tag: "MELHOR EM CAMPO" },
  aniversario: { rotulo: "ANIVERSÁRIO", c1: "#FF2D6F", c2: "#FF8AC4", tag: "PARABÉNS" },
  frase: { rotulo: "FRASE", c1: "#2FD08A", c2: "#7B3BFF", tag: "EM SUAS PALAVRAS" },
};

const NOMES = {
  contratacao: "LUCAS FERREIRA",
  gol: "RAFAEL NUNES",
  estreia: "DIEGO MATOS",
  mvp: "CAIO RIBEIRO",
  aniversario: "THIAGO SOUZA",
  frase: "BRUNO ALVES",
};

const FORMATOS = {
  feed: { w: 540, h: 675 },
  story: { w: 540, h: 960 },
};

/** Silhueta abstrata — placeholder do recorte do jogador, nao pretende ser realista. */
function figura(w, h) {
  const cx = w * 0.5;
  const base = h * 0.86;
  const alt = Math.min(h * 0.56, w * 1.05);
  const topo = base - alt;
  const r = alt * 0.095;
  const ombroY = topo + r * 2.15;
  const quadrilY = base - alt * 0.42;
  const ombro = alt * 0.185;
  const cintura = alt * 0.125;
  const braco = alt * 0.062;
  const perna = alt * 0.085;

  const bracoEsq = `M ${cx - ombro} ${ombroY} l ${braco} 0
    l ${-alt * 0.03} ${alt * 0.32} l ${-braco} ${-alt * 0.01} z`;
  const bracoDir = `M ${cx + ombro} ${ombroY} l ${-braco} 0
    l ${alt * 0.03} ${alt * 0.32} l ${braco} ${-alt * 0.01} z`;
  const torso = `M ${cx - ombro} ${ombroY}
    q ${ombro} ${-alt * 0.055} ${ombro * 2} 0
    l ${-(ombro - cintura)} ${quadrilY - ombroY}
    l ${-(cintura * 2)} 0 z`;
  const pernaEsq = `M ${cx - cintura} ${quadrilY} l ${cintura - perna * 0.15} 0
    l ${-perna * 0.35} ${base - quadrilY} l ${-perna} 0 z`;
  const pernaDir = `M ${cx + cintura} ${quadrilY} l ${-(cintura - perna * 0.15)} 0
    l ${perna * 0.35} ${base - quadrilY} l ${perna} 0 z`;

  return `
    <g fill="url(#figura)">
      <circle cx="${cx}" cy="${topo + r}" r="${r}"/>
      <path d="${bracoEsq}"/><path d="${bracoDir}"/>
      <path d="${torso}"/>
      <path d="${pernaEsq}"/><path d="${pernaDir}"/>
    </g>`;
}

function svg(tipo, formato, { referencia = false, limpo = false } = {}) {
  const { w, h } = FORMATOS[formato];
  const t = TIPOS[tipo];
  const nome = NOMES[tipo];
  const escala = w / 540;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#0A0F1C"/>
      <stop offset="55%" stop-color="#141024"/>
      <stop offset="100%" stop-color="#05070D"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${t.c1}" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="${t.c2}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${t.c2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="figura" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F6F2FF" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="${t.c2}" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="faixa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05070D" stop-opacity="0"/>
      <stop offset="45%" stop-color="#05070D" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#05070D" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="risco" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.c1}"/>
      <stop offset="100%" stop-color="${t.c2}"/>
    </linearGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#fundo)"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.42}" rx="${w * 0.62}" ry="${h * 0.4}" fill="url(#halo)"/>

  <g stroke="${t.c1}" stroke-opacity="0.16" stroke-width="${1.5 * escala}">
    ${Array.from({ length: 7 }, (_, i) => {
      const x = w * (0.08 + i * 0.14);
      return `<line x1="${x}" y1="${h * 0.06}" x2="${x - w * 0.18}" y2="${h * 0.94}"/>`;
    }).join("")}
  </g>

  ${figura(w, h)}

  ${limpo ? "" : `<rect x="0" y="${h * 0.52}" width="${w}" height="${h * 0.48}" fill="url(#faixa)"/>`}

  ${
    referencia
      ? `<rect x="${12 * escala}" y="${12 * escala}" width="${w - 24 * escala}" height="${h - 24 * escala}"
             fill="none" stroke="${t.c1}" stroke-opacity="0.5" stroke-width="${2 * escala}"
             stroke-dasharray="${10 * escala} ${8 * escala}" rx="${10 * escala}"/>
         <text x="${w - 22 * escala}" y="${38 * escala}" text-anchor="end"
               font-family="Arial, Helvetica, sans-serif" font-size="${13 * escala}"
               font-weight="700" letter-spacing="${2 * escala}" fill="${t.c1}">REFERÊNCIA</text>`
      : ""
  }

  ${limpo ? "" : `<rect x="${w * 0.08}" y="${h * 0.795}" width="${w * 0.16}" height="${3 * escala}" fill="url(#risco)" rx="2"/>
  <text x="${w * 0.08}" y="${h * 0.775}" font-family="Arial, Helvetica, sans-serif"
        font-size="${13 * escala}" font-weight="700" letter-spacing="${3 * escala}"
        fill="${t.c1}">${t.tag}</text>
  <text x="${w * 0.08}" y="${h * 0.865}" font-family="Arial, Helvetica, sans-serif"
        font-size="${38 * escala}" font-weight="800" letter-spacing="${-1 * escala}"
        fill="#FFFFFF">${nome.split(" ")[0]}</text>
  <text x="${w * 0.08}" y="${h * 0.915}" font-family="Arial, Helvetica, sans-serif"
        font-size="${38 * escala}" font-weight="800" letter-spacing="${-1 * escala}"
        fill="#FFFFFF" fill-opacity="0.55">${nome.split(" ").slice(1).join(" ")}</text>

  <g transform="translate(${w * 0.08} ${h * 0.06})">
    <rect x="0" y="0" width="${26 * escala}" height="${26 * escala}" rx="${8 * escala}" fill="url(#risco)"/>
    <text x="${34 * escala}" y="${18 * escala}" font-family="Arial, Helvetica, sans-serif"
          font-size="${13 * escala}" font-weight="700" letter-spacing="${2 * escala}"
          fill="#FFFFFF">MB SPORTS</text>
  </g>
  <text x="${w - w * 0.08}" y="${h * 0.945}" text-anchor="end"
        font-family="Arial, Helvetica, sans-serif" font-size="${11 * escala}"
        letter-spacing="${2 * escala}" fill="#FFFFFF" fill-opacity="0.4">${t.rotulo}</text>`}
</svg>`;
}

await mkdir("public/mock", { recursive: true });

for (const tipo of Object.keys(TIPOS)) {
  for (const formato of Object.keys(FORMATOS)) {
    await sharp(Buffer.from(svg(tipo, formato)))
      .png({ quality: 82 })
      .toFile(`public/mock/arte-${tipo}-${formato}.png`);
    await sharp(Buffer.from(svg(tipo, formato, { referencia: true })))
      .png({ quality: 82 })
      .toFile(`public/mock/ref-${tipo}-${formato}.png`);
    // fundo limpo: e o que o MockProvider devolve, para as camadas de texto e
    // logo virem do compose.ts e nao ficarem duplicadas
    await sharp(Buffer.from(svg(tipo, formato, { limpo: true })))
      .png({ quality: 82 })
      .toFile(`public/mock/fundo-${tipo}-${formato}.png`);
  }
}

// foto de exemplo do jogador (o que o usuario sobe)
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600">
    <rect width="480" height="600" fill="#1A2133"/>
    <ellipse cx="240" cy="250" rx="300" ry="240" fill="#242C42"/>
    ${figura(480, 600)}
    <defs><linearGradient id="figura" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8A93A8"/><stop offset="100%" stop-color="#5D6679"/>
    </linearGradient></defs>
  </svg>`),
)
  .png()
  .toFile("public/mock/foto-jogador.png");

console.log("mocks gerados em public/mock");
