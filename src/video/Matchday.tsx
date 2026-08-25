import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTES, INTROS, TEMPLATES, type Camadas, type Dados, type Opcoes } from "./template";

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
  const quadroBruto = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tpl = TEMPLATES[opcoes.template] ?? TEMPLATES.confronto;
  const f = opcoes.duracao / 8;

  /**
   * A intro consome quadros do INICIO, e o resto da composicao nao fica sabendo.
   *
   * Deslocando o relogio aqui, toda a coreografia continua escrita em segundos
   * "a partir do inicio da arte". Sem isso, ligar a intro exigiria somar a
   * duracao dela em cada tempo de cada linha — e alguem esqueceria um.
   */
  const duraIntro = INTROS[opcoes.intro].dura * f;
  const quadroIntro = duraIntro * fps;
  const quadro = quadroBruto - quadroIntro;
  const emIntro = quadroBruto < quadroIntro;
  const restante = Math.max(1, durationInFrames - quadroIntro);
  const t = Math.max(0, quadro) / restante;

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

  /**
   * O pico da transicao: 1 no corte exato, 0 nas beiradas da janela.
   *
   * A escolha muda o EFEITO, nao o instante — o corte acontece de qualquer
   * jeito, e a transicao so decide como a emenda e disfarcada.
   */
  const janela = 0.16 * f * fps;
  const pico = Math.max(0, 1 - Math.abs(quadro - corte) / janela) * opcoes.intensidade;
  const clarao = opcoes.transicao === "flash" ? pico : 0;
  const escurece = opcoes.transicao === "fecha" ? pico : 0;
  const arrasto = opcoes.transicao === "whip" ? pico : 0;
  const avanco = opcoes.transicao === "punch" ? pico : 0;
  const deformar = {
    transform: `translateX(${arrasto * (quadro < corte ? -1 : 1) * 190}px) scale(${1 + avanco * 0.24})`,
    filter: arrasto + avanco > 0.02 ? `blur(${(arrasto * 16 + avanco * 11).toFixed(1)}px)` : undefined,
  };

  const e = opcoes.escalaTexto;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoomFundo}) ${deformar.transform}`, filter: deformar.filter }}>
        <Img src={camadas.fundo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          transform: `scale(${zoomAtleta}) translateY(${(1 - entradaAtleta) * 26}px) ${deformar.transform}`,
          filter: deformar.filter,
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
            fonte={opcoes.fonte}
            p={entra(quadro, tpl.tempos.clube, 0.7, fps, opcoes)}
          />

          {dados.adversario && (
            <LinhaDoConfronto
              texto={`X ${dados.adversario}`}
              cor={opcoes.corTexto}
              corBarra={opcoes.corBarra}
              corpo={54 * e}
              fonte={opcoes.fonte}
              p={entra(quadro, tpl.tempos.confronto, 0.6, fps, opcoes)}
            />
          )}

          <Tarja
            texto={[dados.data, dados.hora, dados.estadio].filter(Boolean).join("   ·   ")}
            cor={opcoes.corTexto}
            corpo={21 * e}
            fonte={opcoes.fonte}
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

      {clarao > 0.01 && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: clarao * 0.5 }} />}
      {escurece > 0.01 && <AbsoluteFill style={{ backgroundColor: "#000", opacity: escurece * 0.9 }} />}
      {fecho > 0 && <AbsoluteFill style={{ backgroundColor: "#000", opacity: fecho }} />}

      {emIntro && (
        <Intro
          camadas={camadas}
          dados={dados}
          opcoes={opcoes}
          quadro={quadroBruto}
          fps={fps}
          dura={duraIntro}
        />
      )}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- intro */

/**
 * A abertura, copiada da referencia do Criciuma: escudo surgindo no preto, o
 * nome do clube abaixo, e — quando pedido — a marca da agencia assinando.
 *
 * Ela nao custa geracao. Escudo e logo ja estao cadastrados, e tudo aqui e
 * desenhado. Por isso e uma escolha barata de oferecer: ligar a intro nao muda
 * o preco do video, so o tempo dele.
 *
 * O escudo entra com ESCALA e nao so com opacidade. Objeto que so acende le
 * como imagem carregando; objeto que cresce um pouco le como abertura.
 */
function Intro({
  camadas,
  dados,
  opcoes,
  quadro,
  fps,
  dura,
}: {
  camadas: Camadas;
  dados: Dados;
  opcoes: Opcoes;
  quadro: number;
  fps: number;
  dura: number;
}) {
  const fim = dura * fps;
  const p = interpolate(quadro, [0.08 * fps, 0.62 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const pNome = interpolate(quadro, [0.34 * fps, 0.86 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pLogo = interpolate(quadro, [0.78 * fps, 1.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /* Sai escurecendo nos ultimos quadros, para o corte para a arte nao ser um
     salto de preto cheio para imagem cheia. */
  const sai = interpolate(quadro, [fim - 0.18 * fps, fim], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        opacity: 1 - sai,
      }}
    >
      {camadas.escudo && (
        <Img
          src={camadas.escudo}
          style={{
            width: 300,
            opacity: p,
            transform: `scale(${0.78 + 0.22 * p})`,
          }}
        />
      )}
      <div
        style={{
          opacity: pNome,
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: 34,
          letterSpacing: 15,
          color: opcoes.corTexto,
          whiteSpace: "nowrap",
        }}
      >
        {dados.clube.toUpperCase()}
      </div>
      {opcoes.intro === "escudo-logo" && camadas.logo && (
        <Img src={camadas.logo} style={{ width: 210, opacity: pLogo * 0.9, marginTop: 26 }} />
      )}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------- as linhas */

/**
 * A inclinacao ANDA JUNTO da familia, e nao e um controle separado.
 *
 * Inclinar uma fonte que ja nasce reta produz italico falso, que e um dos
 * defeitos tipograficos mais visiveis que existem. Entao cada personalidade
 * traz a sua inclinacao: a condensada pede -8 graus, a reta pede zero, e nao
 * ha combinacao possivel entre as duas coisas que produza o erro.
 */
function inclinacaoDe(fonte: Opcoes["fonte"]) {
  const g = FONTES[fonte].inclinacao;
  return g === 0 ? undefined : `skewX(${g}deg)`;
}

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

function Titulo({
  texto, cor, corpo, p, fonte,
}: { texto: string; cor: string; corpo: number; p: number; fonte: Opcoes["fonte"] }) {
  if (p <= 0) return null;
  return (
    <div
      style={{
        opacity: p,
        transform: [`translateX(${-40 * (1 - p)}px)`, inclinacaoDe(fonte)].filter(Boolean).join(" "),
        fontFamily: FONTES[fonte].familia,
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
  fonte,
}: {
  texto: string;
  cor: string;
  corBarra: string;
  corpo: number;
  p: number;
  fonte: Opcoes["fonte"];
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
        transform: inclinacaoDe(fonte),
      }}
    >
      <span
        style={{
          fontFamily: FONTES[fonte].familia,
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

function Tarja({
  texto, cor, corpo, p, fonte,
}: { texto: string; cor: string; corpo: number; p: number; fonte: Opcoes["fonte"] }) {
  if (p <= 0 || !texto) return null;
  return (
    <div
      style={{
        opacity: 1,
        transform: inclinacaoDe(fonte),
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
