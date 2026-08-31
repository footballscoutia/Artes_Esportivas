import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FiltroGlitch, ID_GLITCH } from "./FiltroGlitch";
import { FONTE_DE_APOIO, FONTES } from "./fontes";
import {
  INTROS,
  ROTEIROS,
  ENTRADAS,
  TRANSICAO_PADRAO,
  estiloDoTratamento,
  deformacaoDaTransicao,
  estiloDoIntro,
  duracaoDaTransicao,
  estiloDaDeformacao,
  estiloDaEntrada,
  progressoDaLetra,
  TEMPLATES,
  type Camadas,
  type Dados,
  type Opcoes,
} from "./template";

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

  /**
   * OS CORTES. Eram um; agora sao ate quatro.
   *
   * Cada um tem instante e transicao propria. O quadro cai em NO MAXIMO um
   * deles — as janelas nao se sobrepoem porque o editor impoe espacamento —,
   * entao achar o corte ativo e procurar o primeiro cuja janela contem o
   * quadro, e nao somar deformacoes de varios.
   */
  const cortes =
    opcoes.cortes && opcoes.cortes.length > 0
      ? opcoes.cortes
      : [{ em: tpl.corte, transicao: opcoes.transicao ?? TRANSICAO_PADRAO }];

  /**
   * O instante do corte esta em segundos REAIS da arte, e nao na linha do
   * tempo de referencia de 8s.
   *
   * Multiplicar por `f` como no resto da coreografia parecia coerente e era
   * um bug: o controle diz "aos 3,0s" e o corte acontecia aos 2,25s num video
   * de 6s. A diferenca e que os tempos do TEMPLATE sao proporcoes de uma
   * receita — encolhem junto com o video — e este veio de uma pessoa olhando
   * uma regua que vai ate a duracao escolhida.
   */
  const meiaJanela = (duracaoDaTransicao(opcoes.velocidadeTransicao) / 2) * fps;
  const ativo = cortes
    .map((c) => ({ ...c, quadro: c.em * fps }))
    .find((c) => Math.abs(quadro - c.quadro) < meiaJanela);

  const u = ativo ? (quadro - (ativo.quadro - meiaJanela)) / (meiaJanela * 2) : -1;
  const def = deformacaoDaTransicao(
    ativo?.transicao ?? TRANSICAO_PADRAO,
    u,
    opcoes.intensidade,
    quadro,
  );
  const deformar = estiloDaDeformacao(def);
  const clarao = def.clarao;
  const escurece = def.escurece;

  /**
   * O bloco de texto sai e volta em CADA corte.
   *
   * Antes era uma conta unica em cima do corte do template. Com varios, a
   * visibilidade e o minimo entre as contas de todos: basta um corte estar
   * acontecendo para o texto estar fora.
   */
  const visivel = cortes.reduce((menor, c) => {
    const q = c.em * fps;
    const sai = interpolate(quadro, [q - 0.3 * fps, q], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const volta = interpolate(quadro, [q + 0.12 * fps, q + 0.5 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.min(menor, Math.max(0, Math.min(1, 1 - sai + volta)));
  }, 1);
  const e = opcoes.escalaTexto;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      {/* O filtro pega tudo que esta dentro: fundo, atleta e texto glitcham
          JUNTOS. Aplicado so ao fundo, o resto continuaria nitido por cima e
          leria como imagem estranha atras de imagem normal, nao como falha. */}
      {def.rgb > 0.5 && <FiltroGlitch dx={def.rgb} />}
      <AbsoluteFill
        style={{
          filter: def.rgb > 0.5 ? `url(#${ID_GLITCH})` : undefined,
        }}
      >
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
          {(ROTEIROS[opcoes.tipo] ?? ROTEIROS.matchday).map((linha, i) => {
            /* A tarja junta data, hora e estadio; as outras linhas sao um campo
               so. E a unica excecao, e ela mora aqui em vez de virar tres
               entradas no roteiro — tres entradas produziriam tres tarjas. */
            /* A tarja junta tres campos, entao ela filtra os ocultos um a um em
               vez de sumir inteira: esconder o estadio nao pode levar junto a
               data. As outras linhas sao um campo so e somem de vez. */
            const escondido = (c: string) => opcoes.ocultos.includes(c);
            /* "nenhuma" apaga a LINHA inteira, e nao campo por campo: e o
               interruptor unico da linha dos dados. O texto sai vazio e o
               `return null` logo abaixo cuida do resto — nao ha um segundo
               caminho de saida para manter em dia. */
            const texto =
              linha.papel === "tarja"
                ? opcoes.tarja === "nenhuma"
                  ? ""
                  : [
                    escondido("data") ? "" : dados.data,
                    escondido("hora") ? "" : dados.hora,
                    escondido("estadio") ? "" : dados.estadio,
                  ]
                    .filter(Boolean)
                    .join("   ·   ")
                : escondido(linha.campo)
                  ? ""
                  : `${linha.prefixo ?? ""}${dados[linha.campo]}`;
            if (!texto.trim()) return null;

            /* Os tempos seguem a ORDEM da linha no roteiro, e nao o nome do
               campo. Assim um roteiro novo nao precisa de tempos proprios. */
            const tempos = [tpl.tempos.campeonato, tpl.tempos.clube, tpl.tempos.confronto, tpl.tempos.dados];
            const p = entra(quadro, tempos[i] ?? tempos[tempos.length - 1], 0.6, fps, opcoes);

            /* O tratamento vale para o BLOCO, e nao so para o titulo: tratar uma
               linha e deixar as vizinhas chapadas nao cria hierarquia, cria duas
               tipografias no mesmo quadro. As linhas pequenas recebem a versao
               contida do mesmo acabamento. */
            const acabamento = {
              tratamento: opcoes.tratamento,
              imagem: camadas.fundo,
              destaque: opcoes.corBarra,
            };

            if (linha.papel === "etiqueta")
              return (
                <Etiqueta
                  key={i}
                  texto={texto}
                  cor={opcoes.corTexto}
                  corpo={26 * e}
                  p={p}
                  entrada={opcoes.entradaTexto}
                  {...acabamento}
                />
              );
            if (linha.papel === "destaque")
              return (
                <Titulo
                  key={i}
                  texto={texto}
                  cor={opcoes.corTexto}
                  corpo={132 * e}
                  fonte={opcoes.fonte}
                  entrada={opcoes.entradaTexto}
                  {...acabamento}
                  p={p}
                />
              );
            if (linha.papel === "confronto")
              return (
                <LinhaDoConfronto
                  key={i}
                  texto={texto}
                  cor={opcoes.corTexto}
                  corBarra={opcoes.corBarra}
                  corpo={64 * e}
                  fonte={opcoes.fonte}
                  entrada={opcoes.entradaTexto}
                  tratamento={opcoes.tratamento}
                  imagem={camadas.fundo}
                  p={p}
                />
              );
            return (
              <Tarja
                key={i}
                texto={texto}
                cor={opcoes.corTexto}
                corpo={24 * e}
                fonte={opcoes.fonte}
                entrada={opcoes.entradaTexto}
                forma={opcoes.tarja}
                {...acabamento}
                p={p}
              />
            );
          })}
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

      </AbsoluteFill>

      {clarao > 0.01 && (
        <AbsoluteFill
          style={{
            backgroundColor: def.veuCor === "clube" ? opcoes.corBarra : "#fff",
            opacity: clarao * 0.5,
          }}
        />
      )}
      {escurece > 0.01 && <AbsoluteFill style={{ backgroundColor: "#000", opacity: escurece * 0.9 }} />}

      {/**
        * FATIAS: faixas FINAS de interferencia, e nao bandas contiguas.
        *
        * A primeira versao desenhava o fundo em nove bandas cobrindo 100% da
        * altura — ou seja, uma cortina opaca que apagava o atleta e o texto. O
        * quadro renderizado mostrava so cenario durante o corte, e eu levei um
        * render inteiro para ver.
        *
        * Glitch de verdade nao substitui a imagem: ele desloca tiras dela. Cada
        * faixa cobre uma fracao pequena da altura, e entre elas o quadro
        * continua intacto — que e o que faz a falha parecer falha, e nao troca
        * de cena.
        *
        * O deslocamento sai de um `sin` da posicao e do quadro, e nao de um
        * aleatorio: aleatorio mudaria a cada render e o mesmo video sairia
        * diferente toda vez, o que torna conferir um defeito impossivel.
        */}
      {def.fatias > 0 &&
        Array.from({ length: def.fatias }).map((_, i) => {
          const passo = 100 / def.fatias;
          const topo = i * passo + (Math.sin(i * 3.7 + quadro * 0.5) + 1) * passo * 0.3;
          const espessura = 3.5 + Math.abs(Math.sin(i * 2.3)) * 3;
          const desloca = Math.sin((i + quadro * 0.7) * 2.1) * 60 * opcoes.intensidade;
          return (
            <AbsoluteFill
              key={i}
              style={{
                clipPath: `inset(${topo.toFixed(1)}% 0 ${(100 - topo - espessura).toFixed(1)}% 0)`,
                transform: `translateX(${desloca.toFixed(1)}px)`,
                opacity: 0.9,
              }}
            >
              <Img src={camadas.fundo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
          );
        })}
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
  const p = interpolate(quadro, [0.08 * fps, 0.68 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  /* O gesto vem do catalogo, e nao mais cravado aqui. E a mesma funcao que a
     previa do seletor usa. */
  const gesto = estiloDoIntro(opcoes.introEfeito, p);
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
      {opcoes.intro !== "logo" && camadas.escudo && (
        <Img
          src={camadas.escudo}
          style={{
            width: 300,
            opacity: gesto.opacity,
            transform: gesto.transform,
            filter: gesto.filter,
            clipPath: gesto.clipPath,
          }}
        />
      )}
      {opcoes.intro !== "logo" && (
      <div
        style={{
          opacity: pNome,
          fontFamily: FONTE_DE_APOIO,
          fontWeight: 600,
          fontSize: 34,
          letterSpacing: 15,
          color: opcoes.corTexto,
          whiteSpace: "nowrap",
        }}
      >
        {dados.clube.toUpperCase()}
      </div>
      )}
      {(opcoes.intro === "escudo-logo" || opcoes.intro === "logo") && camadas.logo && (
        <Img
          src={camadas.logo}
          style={{
            /* Sozinha ela e o assunto, e nao a assinatura: entra maior e no
               tempo do escudo, em vez de depois dele. */
            width: opcoes.intro === "logo" ? 420 : 210,
            /* Sozinha, a logo E o gesto da intro. Acompanhada, ela assina
               depois do escudo e entra simples — duas coisas fazendo o mesmo
               movimento ao mesmo tempo brigam em vez de somar. */
            opacity: opcoes.intro === "logo" ? gesto.opacity : pLogo * 0.95,
            transform: opcoes.intro === "logo" ? gesto.transform : undefined,
            filter: opcoes.intro === "logo" ? gesto.filter : undefined,
            clipPath: opcoes.intro === "logo" ? gesto.clipPath : undefined,
            marginTop: opcoes.intro === "logo" ? 0 : 26,
          }}
        />
      )}
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------- entrada do texto */

/**
 * Aplica a entrada escolhida a um texto — inteiro ou letra a letra.
 *
 * As de linha inteira sao um `transform` no bloco. As por letra precisam
 * quebrar o texto em pedacos, e ai vem o cuidado que nao e obvio: o ESPACO
 * entra como ` ` num span proprio. Espaco comum no fim de um
 * `inline-block` e descartado pelo navegador, e a frase sairia grudada —
 * exatamente o defeito que ja apareceu no titulo da landing page deste
 * projeto.
 */
function TextoComEntrada({
  texto,
  entrada,
  p,
}: {
  texto: string;
  entrada: string;
  p: number;
}) {
  const meta = ENTRADAS[entrada as keyof typeof ENTRADAS];

  if (!meta?.porLetra) {
    const e = estiloDaEntrada(entrada, p);
    return (
      <span
        style={{
          display: "inline-block",
          opacity: e.opacity,
          transform: e.transform,
          filter: e.filter,
          clipPath: e.clipPath,
        }}
      >
        {texto}
      </span>
    );
  }

  const letras = [...texto];
  return (
    <span style={{ display: "inline-block" }}>
      {letras.map((c, i) => {
        const pl = progressoDaLetra(p, i, letras.length, entrada);
        if (c === " ") return <span key={i}>{" "}</span>;
        const desloca = entrada === "onda" ? (1 - pl) * 34 : (1 - pl) * 12;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: pl,
              transform: `translateY(${desloca.toFixed(1)}px)`,
            }}
          >
            {c}
          </span>
        );
      })}
    </span>
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

function Etiqueta({
  texto, cor, corpo, p, entrada, tratamento, imagem, destaque,
}: {
  texto: string;
  cor: string;
  corpo: number;
  p: number;
  entrada: string;
  tratamento: string;
  imagem?: string;
  destaque?: string;
}) {
  if (p <= 0) return null;
  return (
    <div
      style={{
        fontFamily: FONTE_DE_APOIO,
        fontWeight: 600,
        fontSize: corpo,
        letterSpacing: corpo * 0.42,
        whiteSpace: "nowrap",
        ...estiloDoTratamento(tratamento, { cor, corpo, imagem, destaque, apoio: true }),
      }}
    >
      <TextoComEntrada texto={texto.toUpperCase()} entrada={entrada} p={p} />
    </div>
  );
}

function Titulo({
  texto, cor, corpo, p, fonte, entrada, tratamento, imagem, destaque,
}: {
  texto: string;
  cor: string;
  corpo: number;
  p: number;
  fonte: Opcoes["fonte"];
  entrada: string;
  tratamento: string;
  imagem?: string;
  destaque?: string;
}) {
  if (p <= 0) return null;
  const f = FONTES[fonte];
  return (
    <div
      style={{
        /* A inclinacao da fonte fica NO bloco e a entrada vai por dentro: se
           as duas dividissem o mesmo `transform`, uma sobrescreveria a outra e a
           letra perderia a inclinacao durante a animacao. */
        transform: inclinacaoDe(fonte),
        fontFamily: f.familia,
        fontWeight: f.peso,
        fontSize: corpo,
        lineHeight: 0.94,
        ...estiloDoTratamento(tratamento, { cor, corpo, imagem, destaque }),
        /* O aperto vem da FONTE porque cada desenho de letra tem o seu: Anton
           ja nasce apertada e pede folga, Archivo Black e larga e pede aperto.
           Um valor unico para todas produziria uma boa e quatro erradas. */
        letterSpacing: corpo * f.aperto,
        whiteSpace: "nowrap",
      }}
    >
      <TextoComEntrada texto={texto.toUpperCase()} entrada={entrada} p={p} />
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
  entrada,
  tratamento,
  imagem,
}: {
  texto: string;
  cor: string;
  corBarra: string;
  corpo: number;
  p: number;
  fonte: Opcoes["fonte"];
  entrada: string;
  tratamento: string;
  imagem?: string;
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
          fontWeight: FONTES[fonte].peso,
          fontSize: corpo,
          lineHeight: 1.06,
          whiteSpace: "nowrap",
          /**
           * A versao CONTIDA do tratamento, mesmo a 64px — e aqui a razao nao e
           * tamanho, e vizinhanca.
           *
           * Renderizado com a versao cheia, o "longa" jogava uma diagonal de 35px
           * para a direita, bem onde comeca a barra solida da mesma cor: as duas
           * se fundiam e a linha inteira virava um bloco vermelho, sem palavra
           * legivel dentro. O "bloco" fazia o mesmo em menor escala.
           *
           * Vale a regra tipografica de sempre: UMA linha carrega o acabamento
           * cheio — o titulo —, e as outras acompanham numa versao mais quieta.
           * Dois acabamentos pesados no mesmo bloco nao dobram o efeito, brigam.
           */
          ...estiloDoTratamento(tratamento, { cor, corpo, imagem, destaque: corBarra, apoio: true }),
        }}
      >
        <TextoComEntrada texto={texto.toUpperCase()} entrada={entrada} p={p} />
      </span>
      <span
        style={{
          /* A barra tem TETO. Com `flex: 1` puro, um adversario curto como
             "FLAMENGO" deixava um retangulo branco atravessando o quadro
             inteiro, que le como erro de layout e nao como gesto grafico. Ela
             continua elastica, mas para de crescer. */
          flex: 1,
          maxWidth: corpo * 5.5,
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

/**
 * A LINHA DOS DADOS — data, hora e estadio, a menor letra do quadro.
 *
 * Ela existe porque um matchday sem quando e onde nao e um anuncio, e um post.
 * Por muito tempo veio sempre dentro de um retangulo escuro; a placa resolvia
 * legibilidade — letra de 24px sobre foto some — mas cobria a arte e lia como
 * tarja de censura. Agora a placa e escolha, e o padrao e a letra solta, com o
 * tratamento cuidando do contraste.
 *
 * A placa e o texto sao DOIS elementos, e nao um so. Nao ha como um mesmo
 * elemento ter fundo proprio e `background-clip: text` ao mesmo tempo: o
 * recorte da letra apagaria a placa. Com a placa por fora, "ouro com placa"
 * simplesmente funciona.
 */
function Tarja({
  texto, cor, corpo, p, fonte, entrada, tratamento, imagem, destaque, forma,
}: {
  texto: string;
  cor: string;
  corpo: number;
  p: number;
  fonte: Opcoes["fonte"];
  entrada: string;
  tratamento: string;
  imagem?: string;
  destaque?: string;
  forma: Opcoes["tarja"];
}) {
  if (p <= 0 || !texto) return null;
  const comPlaca = forma === "placa";
  return (
    <div
      style={{
        transform: inclinacaoDe(fonte),
        /* O recorte e proprio e nao herda a entrada escolhida: a placa e um
           RECIPIENTE, e um recipiente que cai do ceu ou entra letra a letra le
           como erro. O texto dentro dela e que segue a escolha.
           Sem placa nao ha recipiente, e a linha entra como as outras. */
        clipPath: comPlaca ? `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` : undefined,
        opacity: comPlaca ? 1 : p,
        background: comPlaca ? "rgba(6,6,6,.82)" : undefined,
        padding: comPlaca ? `${corpo * 0.5}px ${corpo * 0.9}px` : undefined,
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontFamily: FONTE_DE_APOIO,
          fontWeight: 600,
          fontSize: corpo,
          letterSpacing: corpo * 0.14,
          whiteSpace: "nowrap",
          ...estiloDoTratamento(tratamento, { cor, corpo, imagem, destaque, apoio: true }),
        }}
      >
        <TextoComEntrada texto={texto.toUpperCase()} entrada={entrada} p={p} />
      </span>
    </div>
  );
}
