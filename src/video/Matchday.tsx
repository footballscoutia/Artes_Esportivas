import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ENQUADRAMENTOS,
  ESTILOS,
  TEMPLATES,
  textoDo,
  type Camada,
  type Camadas,
  type Dados,
  type Elemento,
  type Opcoes,
} from "./template";

/**
 * A composicao. O mesmo componente que o Player toca ao vivo no navegador e o
 * que o servidor renderiza em mp4 — que e a razao inteira de ter vindo para ca.
 *
 * Renderizar 180 quadros com `sharp` levava mais de um minuto, e nao existe
 * editor interativo em cima disso. Aqui o preview e o produto final saem da
 * MESMA descricao, e nao de dois caminhos que precisam ser mantidos iguais.
 */

export type PropsMatchday = {
  dados: Dados;
  camadas: Camadas;
  opcoes: Opcoes;
};

const DURACAO_TRANSICAO = 0.34;

/** Progresso 0..1 de uma entrada, com o easing de saida que o genero usa. */
function entrada(quadro: number, em: number, dura: number, fps: number, o: Opcoes) {
  const fator = o.duracao / 8;
  return interpolate(
    quadro,
    [em * fator * fps, (em * fator + dura / o.velocidade) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) },
  );
}

/** Em que cena o quadro cai, e se atravessa um corte. */
function ondeEstamos(quadro: number, tpl: (typeof TEMPLATES)[string], fps: number, o: Opcoes) {
  const seg = (x: number) => x * (o.duracao / 8) * fps;
  const meia = seg(DURACAO_TRANSICAO) / 2;

  for (let i = 0; i < tpl.cenas.length - 1; i++) {
    const corte = seg(tpl.cenas[i].ate);
    if (quadro > corte - meia && quadro < corte + meia) {
      const u = (quadro - (corte - meia)) / (meia * 2);
      const indice = u < 0.5 ? i : i + 1;
      return { indice, transicao: tpl.transicoes[i] ?? "corte", u, de: i === 0 ? 0 : seg(tpl.cenas[i - 1].ate) };
    }
  }

  let indice = tpl.cenas.length - 1;
  for (let i = 0; i < tpl.cenas.length; i++) {
    if (quadro < seg(tpl.cenas[i].ate)) {
      indice = i;
      break;
    }
  }
  return { indice, transicao: null as null | string, u: null as null | number, de: indice === 0 ? 0 : seg(tpl.cenas[indice - 1].ate) };
}

/**
 * O bloco de texto sai antes do corte e volta depois.
 *
 * Sem isto a segunda cena seria a mesma tipografia parada sobre um
 * enquadramento novo, e o corte leria como falha de continuidade.
 */
function reentrada(quadro: number, tpl: (typeof TEMPLATES)[string], fps: number, o: Opcoes) {
  if (!tpl.reentrada) return 1;
  const fator = o.duracao / 8;
  const { saiEm, voltaEm, dura } = tpl.reentrada;
  const sai = interpolate(quadro, [saiEm * fator * fps, (saiEm + dura * 0.6) * fator * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const volta = interpolate(quadro, [voltaEm * fator * fps, (voltaEm + dura) * fator * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.max(0, Math.min(1, 1 - sai + volta));
}

function Linha({
  el,
  dados,
  opcoes,
  quadro,
  fps,
  fator,
}: {
  el: Elemento;
  dados: Dados;
  opcoes: Opcoes;
  quadro: number;
  fps: number;
  fator: number;
}) {
  const texto = textoDo(el, dados);
  if (!texto) return null;

  const e = ESTILOS[el.estilo];
  const p = entrada(quadro, el.em, el.dura, fps, opcoes);
  if (p <= 0) return null;

  const corpo = e.corpo * opcoes.escalaTexto;
  let dx = 0;
  let dy = 0;
  let opacidade = p;
  let recorte: string | undefined;

  if (el.como === "desliza-esquerda") dx = -90 * (1 - p);
  if (el.como === "sobe") dy = 60 * (1 - p);
  if (el.como === "varre") {
    opacidade = 1;
    recorte = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
  }

  const comFundo = Boolean(el.fundo);

  return (
    <div
      style={{
        position: "absolute",
        top: `${el.y * 100}%`,
        left: `${(el.x ?? 0.045) * 100}%`,
        right: comFundo ? "4.5%" : undefined,
        transform: `translate(${dx}px, ${dy}px)`,
        opacity: opacidade,
        clipPath: recorte,
        background: comFundo ? (el.fundo === "clube" ? opcoes.corBarra : "rgba(8,8,8,.78)") : undefined,
        padding: comFundo ? `${corpo * 0.34}px ${corpo * 0.6}px` : undefined,
        /* `nowrap` é deliberado: o nome PRECISA transbordar o quadro quando for
           largo demais. Quebrar em duas linhas destruiria a leitura do gênero,
           em que a tipografia atravessa o atleta e sobra dos dois lados. */
        whiteSpace: "nowrap",
        fontFamily: e.fonte,
        fontSize: corpo,
        letterSpacing: e.tracking,
        color: opcoes.corTexto,
        lineHeight: 1,
      }}
    >
      {texto}
    </div>
  );
}

function Bloco({
  camada,
  ...resto
}: {
  camada: Camada;
  tpl: (typeof TEMPLATES)[string];
  dados: Dados;
  opcoes: Opcoes;
  quadro: number;
  fps: number;
  fator: number;
}) {
  const { tpl, dados, opcoes, quadro, fps, fator } = resto;
  const visivel = reentrada(quadro, tpl, fps, opcoes);
  if (visivel < 0.01) return null;

  return (
    <AbsoluteFill style={{ opacity: visivel }}>
      {tpl.elementos
        .filter((el) => el.camada === camada)
        .map((el) => (
          <Linha key={el.id} el={el} dados={dados} opcoes={opcoes} quadro={quadro} fps={fps} fator={fator} />
        ))}
    </AbsoluteFill>
  );
}

export const Matchday: React.FC<PropsMatchday> = ({ dados, camadas, opcoes }) => {
  const quadro = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tpl = TEMPLATES[opcoes.template] ?? TEMPLATES.atravessa;
  const fator = opcoes.duracao / 8;

  const onde = ondeEstamos(quadro, tpl, fps, opcoes);
  const cena = tpl.cenas[onde.indice];
  const enq = ENQUADRAMENTOS[cena.enquadramento];

  const ate = cena.ate * fator * fps;
  const t = Math.min(1, Math.max(0, (quadro - onde.de) / Math.max(1, ate - onde.de)));
  const amplitude = 0.1 * opcoes.intensidade;

  const zoomCena =
    cena.camera === "push-in"
      ? enq.escala + amplitude * t
      : cena.camera === "push-out"
        ? enq.escala + amplitude * (1 - t)
        : enq.escala;

  /* O efeito da transicao deforma o quadro inteiro. O corte de verdade — a
     troca de cena — quem faz e o `ondeEstamos`; isto so disfarca a emenda. */
  const pico = onde.u === null ? 0 : 1 - Math.abs(onde.u - 0.5) * 2;
  const whip = onde.transicao === "whip" ? pico : 0;
  const punch = onde.transicao === "punch" ? pico : 0;
  const flash = onde.transicao === "flash" ? pico : 0;

  /* A força do whip acompanha a `intensidade` em vez de ser constante: é uma
     das opções que o editor vai mexer, e 420px de arrasto com 26px de borrão
     lia como borrão de foco, não como corte. */
  const deslocX = whip * (onde.u! < 0.5 ? -1 : 1) * 260 * opcoes.intensidade;
  const borrao = (whip * 15 + punch * 11) * opcoes.intensidade;
  const zoom = zoomCena + punch * 0.28;

  /* PARALAXE: o atleta fecha mais rapido que o fundo. A diferenca entre as duas
     velocidades e o efeito inteiro — iguais, seria zoom. */
  const zoomFundo = zoom;
  const zoomAtleta = zoom + amplitude * t * 0.9;

  const entradaAtleta = interpolate(quadro, [0, 0.8 * fator * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fecho = interpolate(
    quadro,
    [durationInFrames - 0.7 * fps, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const comum: React.CSSProperties = {
    filter: borrao > 0.5 ? `blur(${borrao}px)` : undefined,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ ...comum, transform: `translateX(${deslocX}px) scale(${zoomFundo})` }}>
        <Img src={camadas.fundo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ ...comum, transform: `translateX(${deslocX}px) scale(${zoomFundo})` }}>
        <Bloco camada="atras" tpl={tpl} dados={dados} opcoes={opcoes} quadro={quadro} fps={fps} fator={fator} />
      </AbsoluteFill>

      {/* A sombra de contato entre o texto e o atleta: sem ela o recorte flutua,
          e figura flutuando é o que denuncia colagem antes de tudo. */}
      <AbsoluteFill style={{ ...comum, transform: `translateX(${deslocX}px) scale(${zoomAtleta})` }}>
        <div
          style={{
            position: "absolute",
            left: "20%",
            right: "20%",
            bottom: "6%",
            height: 90,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(0,0,0,.72) 0%, rgba(0,0,0,.26) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
        <Img
          src={camadas.atleta}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: entradaAtleta,
            transform: `translateY(${(1 - entradaAtleta) * 40}px)`,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill>
        <Bloco camada="frente" tpl={tpl} dados={dados} opcoes={opcoes} quadro={quadro} fps={fps} fator={fator} />
        {camadas.logo && (
          <Img
            src={camadas.logo}
            style={{
              position: "absolute",
              right: 64,
              bottom: 64,
              width: 240,
              opacity: interpolate(quadro, [1.2 * fator * fps, 1.8 * fator * fps], [0, 0.95], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />
        )}
      </AbsoluteFill>

      {flash > 0.01 && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flash * 0.45 }} />}
      {fecho > 0 && <AbsoluteFill style={{ backgroundColor: "#000", opacity: fecho }} />}
    </AbsoluteFill>
  );
};
