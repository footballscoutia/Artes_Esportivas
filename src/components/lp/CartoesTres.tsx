"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Os cartoes da vitrine em three.js — as mesmas placas da mesa do heroi.
 *
 * Mesmo material: corpo escuro fosco com aresta acesa em azul. Isso e
 * deliberado, e nao economia. A pagina abre com tres placas se fundindo numa
 * so; se o que sai do outro lado fosse feito de outro material, seriam duas
 * cenas sem parentesco. Aqui a peca que entrou na mesa e a peca que sai da
 * fabrica, e a pagina inteira passa a falar de uma coisa so.
 *
 * A face e uma textura de canvas — barra, rotulo e blocos no lugar do nome.
 * ESQUEMATICA de proposito: nao ha arte real enquanto IMAGE_PROVIDER=mock, e o
 * acervo veio do Pinterest. Desenhar uma arte plausivel seria prometer um
 * resultado especifico que ninguem viu.
 *
 * A cena nao sabe o que e scroll. Recebe `progresso` de 0 a 1 e sabe apenas
 * interpolar entre "vazio" e "fileira montada" — o mesmo contrato da Mesa, o
 * que a deixa testavel e reaproveitavel.
 */

const AZUL = 0x2e7cff;
const AZUL_CSS = "#2E7CFF";

/* Medidas em unidades de cena, nao pixels. A proporcao e 4:5, a do feed. */
const LARG = 2;
const ALT = 2.5;
const ESP = 0.07;
const VAO = 0.24;
const PASSO = LARG + VAO;
/** quanto o cartao solitario cresce enquanto esta sozinho no meio da tela */
const ESCALA_SOZINHO = 1.5;

/**
 * Quanto do progresso acontece ANTES da secao prender, enquanto ela ainda sobe.
 *
 * Sem isso a cena comecava vazia no exato instante em que a pagina para de
 * rolar: chegar na secao era ver o scroll travar e nada acontecer. Com um
 * pedaco da chegada acontecendo na subida, no momento em que ela prende o
 * cartao ja esta em voo — a pessoa nunca ve o quadro parado.
 *
 * Quem alimenta essa fatia e a Vitrine, com um gatilho proprio. O numero mora
 * aqui porque e aqui que as etapas da coreografia sao medidas.
 */
export const FATIA_ENTRADA = 0.18;

/**
 * Quanto do caminho que falta sobra depois de um segundo de aproximacao.
 *
 * Menor = mais rapido e mais colado no scroll; maior = mais preguicoso. O valor
 * da uma constante de tempo perto de 150ms: rapido o bastante para nao parecer
 * atrasado, lento o bastante para a cena desacelerar sozinha quando a rolagem
 * para, em vez de estancar no meio do movimento.
 */
const SUAVIDADE = 0.0015;

/** Desaceleracao exponencial — a mesma curva do resto da pagina. */
function suave(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Recorta um trecho de `p` e devolve 0 a 1 dentro dele. */
function fatia(p: number, a: number, b: number) {
  return Math.min(Math.max((p - a) / (b - a), 0), 1);
}

function entre(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * A face do cartao, desenhada num canvas 2D.
 *
 * A familia vem do computed style e nao escrita a mao: o `next/font` gera um
 * nome proprio para a Chakra Petch (algo como `__Chakra_Petch_e3b1f2`), e o
 * canvas nao entende `var(--fonte-display)`. Pedir a fonte pelo nome publico
 * cairia calado na substituta, e o rotulo sairia com outra letra.
 */
function texturaDaFace(rotulo: string) {
  const L = 512;
  const A = 640;
  const tela = document.createElement("canvas");
  tela.width = L;
  tela.height = A;
  const g = tela.getContext("2d");
  if (!g) return new THREE.CanvasTexture(tela);

  const familia =
    getComputedStyle(document.documentElement).getPropertyValue("--fonte-display").trim() ||
    "system-ui";

  const fundo = g.createLinearGradient(0, 0, 0, A);
  fundo.addColorStop(0, "#161a21");
  fundo.addColorStop(0.55, "#0f1116");
  fundo.addColorStop(1, "#0a0c0f");
  g.fillStyle = fundo;
  g.fillRect(0, 0, L, A);

  /* vulto azul subindo de baixo: o lugar do atleta, sem inventar um rosto */
  const halo = g.createRadialGradient(L / 2, A + 20, 0, L / 2, A + 20, 520);
  halo.addColorStop(0, "rgba(46,124,255,0.46)");
  halo.addColorStop(1, "rgba(46,124,255,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, L, A);

  g.fillStyle = AZUL_CSS;
  g.beginPath();
  g.roundRect(46, 452, 116, 10, 5);
  g.fill();

  g.fillStyle = "rgba(237,238,240,0.92)";
  g.font = `600 34px ${familia}, system-ui, sans-serif`;
  g.textBaseline = "alphabetic";
  g.fillText(rotulo, 46, 512);

  g.fillStyle = "rgba(255,255,255,0.34)";
  g.beginPath();
  g.roundRect(46, 540, 310, 15, 4);
  g.fill();

  g.fillStyle = "rgba(255,255,255,0.16)";
  g.beginPath();
  g.roundRect(46, 572, 208, 12, 4);
  g.fill();

  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export function CartoesTres({
  rotulos,
  progresso,
}: {
  rotulos: readonly string[];
  progresso: React.RefObject<number>;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    /* Quem prefere menos movimento recebe a fileira pronta: a informacao e o
       conjunto existir, nao a chegada dele. */
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
    const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    alvo.appendChild(render.domElement);

    /* A mesma iluminacao da mesa: chave alta pela esquerda e contraluz azul
       atras, que e o que separa a placa escura do fundo escuro. */
    cena.add(new THREE.AmbientLight(0xffffff, 0.36));
    const foco = new THREE.DirectionalLight(0xffffff, 1.05);
    foco.position.set(-4, 6, 8);
    cena.add(foco);
    const contraluz = new THREE.PointLight(AZUL, 46, 34);
    contraluz.position.set(1.4, 1.2, -4.2);
    cena.add(contraluz);

    const corpo = () =>
      new THREE.MeshStandardMaterial({
        color: 0x16181c,
        roughness: 0.52,
        metalness: 0.22,
        transparent: true,
      });

    const geoCaixa = new THREE.BoxGeometry(LARG, ALT, ESP);
    const geoAresta = new THREE.EdgesGeometry(geoCaixa);

    const cartoes = rotulos.map((rotulo) => {
      const grupo = new THREE.Group();

      const face = new THREE.MeshStandardMaterial({
        map: texturaDaFace(rotulo),
        roughness: 0.58,
        metalness: 0.12,
        transparent: true,
      });
      /* ordem das faces da BoxGeometry: +x, -x, +y, -y, +z, -z — a arte vai na
         de frente, o resto fica no material escuro da placa */
      const lados = [corpo(), corpo(), corpo(), corpo(), face, corpo()];
      const placa = new THREE.Mesh(geoCaixa, lados);
      grupo.add(placa);

      /* A aresta acesa e o que faz a placa existir contra o fundo escuro —
         sem ela, quatro retangulos pretos somem num fundo preto. */
      const aresta = new THREE.LineSegments(
        geoAresta,
        new THREE.LineBasicMaterial({ color: AZUL, transparent: true, opacity: 0.62 }),
      );
      grupo.add(aresta);

      cena.add(grupo);
      return { grupo, placa, aresta, materiais: lados, incX: 0, incY: 0, salto: 0 };
    });

    /* Qual layout cabe e quanto da cena a camera enxerga — decidido na medicao,
       lido pelo laco. Uma fileira de quatro precisa de um container largo; num
       celular ela viraria quatro tiras, entao la o arranjo e 2x2. */
    let linhaUnica = true;
    let alturaVisivel = 5.2;

    function medir() {
      if (!alvo) return;
      const l = alvo.clientWidth;
      const a = alvo.clientHeight;
      /* Contêiner de tamanho zero (aba oculta, montagem antes do layout) não
         pode ser gravado: o canvas ficaria travado em 0 e não voltaria mais. */
      if (l === 0 || a === 0) return;

      const proporcao = l / a;
      linhaUnica = proporcao >= 1.7;

      const conteudo = linhaUnica
        ? { l: PASSO * 3 + LARG, a: ALT * ESCALA_SOZINHO }
        : { l: PASSO + LARG, a: (ALT + VAO) * 2 };
      const margem = 1.08;

      /* A altura visivel atende a dimensao mais apertada das duas: a folga
         vertical do cartao aumentado, ou a largura da fileira dividida pela
         proporcao. Assim o conjunto cabe em qualquer janela sem cortar. */
      alturaVisivel = Math.max(conteudo.a * margem, (conteudo.l * margem) / proporcao);

      camera.aspect = proporcao;
      camera.position.z = alturaVisivel / 2 / Math.tan((camera.fov * Math.PI) / 360);
      camera.updateProjectionMatrix();
      render.setSize(l, a);
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);

    function lugar(i: number) {
      if (linhaUnica) return { x: (i - 1.5) * PASSO, y: 0 };
      return { x: ((i % 2) - 0.5) * PASSO, y: (0.5 - Math.floor(i / 2)) * (ALT + VAO) };
    }

    /* Ponteiro em coordenadas de recorte (-1 a 1), lido pelo raio no laco. */
    const ponteiro = new THREE.Vector2();
    let dentro = false;
    const raio = new THREE.Raycaster();

    const mover = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = render.domElement.getBoundingClientRect();
      ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      dentro = true;
    };
    const sair = () => {
      dentro = false;
    };
    render.domElement.addEventListener("pointermove", mover);
    render.domElement.addEventListener("pointerleave", sair);

    /* Fora da tela o laco para. Sao quatro contextos WebGL nesta pagina, e
       manter todos desenhando o tempo todo cobra caro em maquina modesta. */
    let visivel = true;
    const vigia = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
    });
    vigia.observe(alvo);

    let vivo = true;
    let quadro = 0;

    /**
     * O progresso desenhado PERSEGUE o do scroll, nao e igual a ele.
     *
     * Ligado direto, a cena copiava a rolagem quadro a quadro: parou de rolar,
     * parou no lugar, no meio do movimento. E a aproximacao usa o tempo do
     * quadro, e nao um passo fixo — com passo fixo a mesma animacao corre em
     * velocidades diferentes num monitor de 60Hz e num de 144Hz.
     */
    let suavizado = parado ? 1 : 0;
    let ultimo = performance.now();

    function desenhar() {
      const agora = performance.now();
      const dt = Math.min((agora - ultimo) / 1000, 0.1);
      ultimo = agora;

      const alvo = parado ? 1 : Math.min(Math.max(progresso.current ?? 0, 0), 1);
      suavizado += (alvo - suavizado) * (1 - Math.pow(SUAVIDADE, dt));
      const p = suavizado;
      /* respiracao lenta: a cena nunca fica completamente imovel, nem quando a
         rolagem para. E o que separa "pausa" de "travou". */
      const tempo = parado ? 0 : agora * 0.0004;

      /* Qual cartao esta sob o cursor, e em que ponto da face. O `uv` do
         cruzamento ja vem em coordenada local (0 a 1), o que dispensa converter
         pixel de tela para posicao dentro da placa. */
      let sobre = -1;
      let uv: THREE.Vector2 | undefined;
      if (dentro) {
        raio.setFromCamera(ponteiro, camera);
        const toques = raio.intersectObjects(
          cartoes.map((c) => c.placa),
          false,
        );
        if (toques.length > 0) {
          sobre = cartoes.findIndex((c) => c.placa === toques[0].object);
          uv = toques[0].uv;
        }
      }

      cartoes.forEach((c, i) => {
        const l = lugar(i);
        let x: number;
        let esc: number;
        let giro: number;
        let opacidade: number;
        let frente = 0;

        if (!linhaUnica) {
          // arranjo 2x2: os quatro so aparecem, em ordem
          const e = suave(fatia(p, i * 0.1, 0.45 + i * 0.1));
          x = l.x;
          esc = entre(0.94, 1, e);
          giro = 0;
          opacidade = fatia(p, i * 0.1, 0.3 + i * 0.1);
        } else if (i === 0) {
          /* 1. chega da direita, grande, e para no meio  2. encolhe e recua.
             O recuo comeca em 0.36 e a chegada acaba em 0.30: a folga entre as
             duas e curta de proposito. Antes eram 0.30 e 0.42, e nesse intervalo
             NADA se movia — doze por cento da rolagem presa em que a cena ficava
             literalmente congelada. Era isso que parecia travamento. */
          const chega = suave(fatia(p, 0, 0.3));
          const recua = suave(fatia(p, 0.36, 0.66));
          x = entre(entre(alturaVisivel * 1.6, 0, chega), l.x, recua);
          esc = entre(ESCALA_SOZINHO, 1, recua);
          giro = entre(-0.5, 0, chega);
          opacidade = fatia(p, 0, 0.12);
          /* enquanto esta grande ele passa na frente dos outros; ao pousar na
             fileira volta ao mesmo plano */
          frente = (1 - recua) * 0.5;
        } else {
          /* 3. os outros tres entram, um atras do outro. O primeiro deles parte
             em 0.46, com o solitario ainda encolhendo: as duas etapas se
             sobrepoem, e nunca ha um momento sem nada acontecendo. */
          const parte = 0.46 + (i - 1) * 0.08;
          const e = suave(fatia(p, parte, parte + 0.3));
          x = entre(l.x + PASSO * 1.1, l.x, e);
          esc = entre(0.88, 1, e);
          giro = entre(-0.28, 0, e);
          opacidade = fatia(p, parte, parte + 0.14);
        }

        /* A placa se vira PARA o cursor: o ponto tocado vem para frente. Vai
           por aproximacao a cada quadro em vez de saltar, senao o movimento
           fica duro e denuncia que e o mouse mandando direto no angulo. */
        const mirado = sobre === i && uv !== undefined;
        const incAlvoX = mirado ? (uv!.y - 0.5) * 0.34 : 0;
        const incAlvoY = mirado ? -(uv!.x - 0.5) * 0.42 : 0;
        const saltoAlvo = mirado ? 0.34 : 0;
        c.incX += (incAlvoX - c.incX) * 0.12;
        c.incY += (incAlvoY - c.incY) * 0.12;
        c.salto += (saltoAlvo - c.salto) * 0.12;

        /* A respiracao: um flutuar lento e dessincronizado entre os cartoes,
           com amplitude pequena. Nao e enfeite — e o que garante que, parada a
           rolagem, a cena continue viva em vez de virar uma imagem estatica. */
        const sobe = Math.sin(tempo * 1.6 + i * 1.7) * 0.05;
        const gingado = Math.sin(tempo * 1.1 + i * 2.3) * 0.02;

        c.grupo.position.set(x, l.y + sobe, frente + c.salto);
        c.grupo.rotation.set(c.incX, giro + gingado + c.incY, 0);
        c.grupo.scale.setScalar(esc);

        c.materiais.forEach((m) => {
          m.opacity = opacidade;
        });
        const linha = c.aresta.material as THREE.LineBasicMaterial;
        linha.opacity = Math.min(0.62 * opacidade * (mirado ? 1.6 : 1), 1);
      });

      render.render(cena, camera);
    }

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);
      if (!visivel) return;
      desenhar();
    }
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      vigia.disconnect();
      render.domElement.removeEventListener("pointermove", mover);
      render.domElement.removeEventListener("pointerleave", sair);
      render.domElement.remove();
      render.dispose();
      geoCaixa.dispose();
      geoAresta.dispose();
      cartoes.forEach((c) => {
        c.materiais.forEach((m) => {
          m.map?.dispose();
          m.dispose();
        });
        (c.aresta.material as THREE.LineBasicMaterial).dispose();
      });
    };
  }, [rotulos, progresso]);

  return <div ref={caixa} aria-hidden className="h-full w-full" />;
}
