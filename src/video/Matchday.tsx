import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TEMPLATES, type Camadas, type Dados, type Opcoes } from "./template";

/**
 * A composicao, refeita em cima das referencias da agencia.
 *
 * A PRIMEIRA VERSAO ERRAVA O ALVO, e vale registrar por que: eu trouxe da arte
 * PARADA a regra de "o nome atravessa o atleta" e apliquei aqui. Nos videos do
 * Marcio nao e assim. O atleta fica inteiro e quieto ocupando os dois tercos de
 * baixo, e o texto e um bloco COMPACTO num canto, sobre area vazia. Sao dois
 * generos diferentes, e eu misturei.
 *
 * Pior: o enquadramento com zoom foi desenhado para o FUNDO, onde fechar o
 * quadro so corta cenario. Aplicado a camada do atleta, ele cortava a cabeca
 * dele. Aqui o atleta praticamente nao escala — o paralaxe e de poucos por
 * cento, o suficiente para o olho ler profundidade e longe de recortar o corpo.
 */

export type PropsMatchday = {
  dados: Dados;
  camadas: Camadas;
  opcoes: Opcoes;
};

/** Entrada 0..1 com o easing de saida que o genero usa. */
function entra(quadro: number, em: number, dura: number, fps: number, o: Opcoes) {
  const f = o.duracao / 8;
  return interpolate(quadro, [em * f * fps, (em * f + dura / o.velocidade) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
}

export const Matchday: React.FC<PropsMatchday> = ({ dados, camadas, opcoes }) => {
  const quadro = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tpl = TEMPLATES[opcoes.template] ?? TEMPLATES.confronto;
  const f = opcoes.duracao / 8;
  const t = quadro / Math.max(1, durationInFrames);

  /**
   * O movimento e DISCRETO de proposito.
   *
   * Nas referencias a camera quase nao anda: o que da vida e o texto entrando
   * em camadas, nao o zoom. Fundo e atleta andam pouco, e em velocidades
   * levemente diferentes — e a DIFERENCA que le como profundidade, nao a
   * quantidade. Iguais, seria zoom; muito, corta o atleta.
   */
  const forca = 0.05 * opcoes.intensidade;
  const zoomFundo = 1.0 + forca * t;
  const zoomAtleta = 1.0 + forca * 0.45 * t;

  const entradaAtleta = entra(quadro, 0, 1.0, fps, opcoes);

  const fecho = interpolate(quadro, [durationInFrames - 0.6 * fps, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* O corte do meio: o bloco de texto sai e volta, e um clarao curto marca a
     emenda. Sem a saida do texto, a segunda metade seria a primeira parada. */
  const corte = tpl.corte * f * fps;
  const sai = interpolate(quadro, [corte - 0.3 * f * fps, corte], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const volta = interpolate(quadro, [corte + 0.12 * f * fps, corte + 0.5 * f * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visivel = Math.max(0, Math.min(1, 1 - sai + volta));
  const clarao =
    1 -
    Math.min(1, Math.abs(quadro - corte) / (0.14 * f * fps));

  const e = opcoes.escalaTexto;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoomFundo})` }}>
        <Img src={camadas.fundo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          transform: `scale(${zoomAtleta}) translateY(${(1 - entradaAtleta) * 26}px)`,
          opacity: entradaAtleta,
        }}
      >
        {/* Sombra de contato: sem chao, o recorte flutua e denuncia colagem. */}
        <div
          style={{
            position: "absolute",
            left: "18%",
            right: "18%",
            bottom: "3%",
            height: 110,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,.7) 0%, rgba(0,0,0,.25) 58%, rgba(0,0,0,0) 100%)",
          }}
        />
        <Img src={camadas.atleta} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/**
       * O BLOCO, empilhado como na referencia.
       *
       * Cada linha e um filho de um flex column, e nao um elemento posicionado
       * por coordenada absoluta. E o que mantem o conjunto alinhado quando o
       * texto muda de tamanho: "SAO JANUARIO" e "ARENA DA BAIXADA" tem larguras
       * diferentes, e com coordenadas cravadas uma das duas sairia torta.
       */}
      <AbsoluteFill style={{ opacity: visivel }}>
        <div
          style={{
            position: "absolute",
            top: `${tpl.blocoTopo * 100}%`,
            left: "6%",
            right: "6%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8 * e,
          }}
        >
          {dados.campeonato && (
            <Etiqueta
              texto={dados.campeonato}
              cor={opcoes.corTexto}
              corpo={22 * e}
              p={entra(quadro, tpl.tempos.campeonato, 0.5, fps, opcoes)}
            />
          )}

          <Titulo
            texto={dados.clube}
            cor={opcoes.corTexto}
            corpo={104 * e}
            p={entra(quadro, tpl.tempos.clube, 0.7, fps, opcoes)}
          />

          {dados.adversario && (
            <LinhaDoConfronto
              texto={`X ${dados.adversario}`}
              cor={opcoes.corTexto}
              corBarra={opcoes.corBarra}
              corpo={54 * e}
              p={entra(quadro, tpl.tempos.confronto, 0.6, fps, opcoes)}
            />
          )}

          <Tarja
            texto={[dados.data, dados.hora, dados.estadio].filter(Boolean).join("   ·   ")}
            cor={opcoes.corTexto}
            corpo={21 * e}
            p={entra(quadro, tpl.tempos.dados, 0.55, fps, opcoes)}
          />
        </div>
      </AbsoluteFill>

      {camadas.logo && (
        <Img
          src={camadas.logo}
          style={{
            position: "absolute",
            right: "6%",
            top: "4%",
            width: 150,
            opacity: entra(quadro, 0.6, 0.8, fps, opcoes) * 0.9,
          }}
        />
      )}

      {clarao > 0 && (
        <AbsoluteFill style={{ backgroundColor: "#fff", opacity: clarao * 0.22 * opcoes.intensidade }} />
      )}
      {fecho > 0 && <AbsoluteFill style={{ backgroundColor: "#000", opacity: fecho }} />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- as linhas */

/** A inclinacao e o que da o ar esportivo — a referencia usa condensada itálica. */
const INCLINA = "skewX(-8deg)";
const CONDENSADA = "Impact, 'Arial Narrow', 'Arial Black', sans-serif";

function Etiqueta({ texto, cor, corpo, p }: { texto: string; cor: string; corpo: number; p: number }) {
  if (p <= 0) return null;
  return (
    <div
      style={{
        opacity: p,
        transform: `translateX(${-24 * (1 - p)}px)`,
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: corpo,
        letterSpacing: corpo * 0.42,
        color: cor,
        whiteSpace: "nowrap",
      }}
    >
      {texto.toUpperCase()}
    </div>
  );
}

function Titulo({ texto, cor, corpo, p }: { texto: string; cor: string; corpo: number; p: number }) {
  if (p <= 0) return null;
  return (
    <div
      style={{
        opacity: p,
        transform: `translateX(${-40 * (1 - p)}px) ${INCLINA}`,
        fontFamily: CONDENSADA,
        fontSize: corpo,
        lineHeight: 0.94,
        letterSpacing: -1,
        color: cor,
        whiteSpace: "nowrap",
        textShadow: "0 6px 26px rgba(0,0,0,.55)",
      }}
    >
      {texto.toUpperCase()}
    </div>
  );
}

/**
 * A linha do confronto: o texto, e uma BARRA que come o resto da largura.
 *
 * E o gesto que mais marca a referencia. A barra nao tem largura propria — ela
 * e `flex: 1` e ocupa o que sobrar, entao adversario curto ou longo produz o
 * mesmo desenho, sem ninguem calcular nada.
 */
function LinhaDoConfronto({
  texto,
  cor,
  corBarra,
  corpo,
  p,
}: {
  texto: string;
  cor: string;
  corBarra: string;
  corpo: number;
  p: number;
}) {
  if (p <= 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: corpo * 0.28,
        width: "100%",
        opacity: p,
        transform: INCLINA,
      }}
    >
      <span
        style={{
          fontFamily: CONDENSADA,
          fontSize: corpo,
          lineHeight: 1.06,
          color: cor,
          whiteSpace: "nowrap",
          textShadow: "0 4px 18px rgba(0,0,0,.5)",
        }}
      >
        {texto.toUpperCase()}
      </span>
      <span
        style={{
          flex: 1,
          background: corBarra,
          /* Cresce da esquerda junto com a entrada, como uma varredura. */
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          minWidth: 0,
        }}
      />
    </div>
  );
}

function Tarja({ texto, cor, corpo, p }: { texto: string; cor: string; corpo: number; p: number }) {
  if (p <= 0 || !texto) return null;
  return (
    <div
      style={{
        opacity: 1,
        transform: INCLINA,
        /* O recorte revela a tarja da esquerda para a direita, em vez de a
           fazer aparecer inteira: entrada de barra que so acende le como falha. */
        clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`,
        background: "rgba(6,6,6,.82)",
        padding: `${corpo * 0.5}px ${corpo * 0.9}px`,
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: corpo,
        letterSpacing: corpo * 0.14,
        color: cor,
        whiteSpace: "nowrap",
      }}
    >
      {texto.toUpperCase()}
    </div>
  );
}
