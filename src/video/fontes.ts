import { loadFont as carregarAnton } from "@remotion/google-fonts/Anton";
import { loadFont as carregarArchivo } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as carregarBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as carregarOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as carregarTeko } from "@remotion/google-fonts/Teko";

/**
 * As fontes, carregadas de verdade — e num arquivo SO delas.
 *
 * A separacao nao e organizacao: e necessidade. O `@remotion/google-fonts`
 * arrasta o runtime do Remotion, que precisa de React, e a rota /api/video
 * importa o esquema de `template.ts`. Com as fontes la dentro, o build quebrava
 * com "Remotion requires React.createContext" ao coletar a configuracao da
 * rota — uma rota de servidor nao tem por que carregar um motor de video.
 *
 * Entao `template.ts` guarda o CONTRATO, que o servidor pode ler, e este
 * arquivo guarda o DESENHO, que so o navegador e o render carregam.
 *
 * Antes disto a tipografia usava Impact e Arial Black, do sistema. Saia fraca —
 * Impact e estreita e leve perto do que cartaz esportivo usa — e nao existiria
 * no Mac de outra pessoa. Estas sao baixadas e embutidas: o preview e o mp4
 * usam o mesmo desenho de letra em qualquer maquina.
 */

const anton = carregarAnton();
const bebas = carregarBebas();
const archivo = carregarArchivo();
const oswald = carregarOswald();
const teko = carregarTeko();

export const FONTES = {
  cartaz: {
    rotulo: "Cartaz",
    nota: "Anton — pesada e condensada, a de pôster de jogo",
    familia: anton.fontFamily,
    inclinacao: -7,
    peso: 400,
    aperto: -0.01,
  },
  estadio: {
    rotulo: "Estádio",
    nota: "Bebas Neue — alta e estreita, muita palavra em pouca largura",
    familia: bebas.fontFamily,
    inclinacao: -7,
    peso: 400,
    aperto: 0.01,
  },
  bloco: {
    rotulo: "Bloco",
    nota: "Archivo Black — larga e sólida, mais institucional",
    familia: archivo.fontFamily,
    inclinacao: 0,
    peso: 400,
    aperto: -0.02,
  },
  jornal: {
    rotulo: "Jornal",
    nota: "Oswald — condensada e sóbria, ar de placar de TV",
    familia: oswald.fontFamily,
    inclinacao: 0,
    peso: 700,
    aperto: 0,
  },
  veloz: {
    rotulo: "Veloz",
    nota: "Teko — muito condensada e angulosa",
    familia: teko.fontFamily,
    inclinacao: -9,
    peso: 700,
    aperto: 0,
  },
} as const;

/** A fonte da tarja e da etiqueta é sempre a mesma: elas são dado, não título. */
export const FONTE_DE_APOIO = oswald.fontFamily;
