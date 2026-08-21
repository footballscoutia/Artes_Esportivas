"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";

/**
 * Texto que ondula — o "Warp Text" do React Bits, adaptado.
 *
 * O texto e desenhado num canvas 2D, virado textura, e um shader o distorce:
 * um fbm lento empurra os pixels de leve, o ponteiro abre uma lente por perto,
 * e os canais R e B sao amostrados deslocados do G — e dai que vem a franja
 * colorida nas bordas das letras, como aberracao cromatica de lente.
 *
 * ACESSIBILIDADE: o titulo vira pixel, entao some do DOM. Quem monta isto
 * precisa manter um <h1> de verdade escondido ao lado; aqui o container e
 * marcado `aria-hidden` para o leitor de tela nao anunciar a mesma frase duas
 * vezes. Sem esse par, a pagina fica sem cabecalho para buscador e para quem
 * navega por audio.
 */

const VERTICE = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENTO = `#version 300 es
precision highp float;

uniform sampler2D uTextura;
uniform vec2  uResolucao;
uniform vec2  uPonteiro;
uniform float uPonteiroAtivo;
uniform float uTempo;
uniform float uForca;
uniform float uEscala;
uniform float uVelocidade;
uniform float uAlcance;
uniform float uPressao;
uniform float uRefracao;
uniform float uMovimento;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * ruido(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

/* Fora da textura nao ha letra nenhuma: devolver transparente evita a borda
   esticada que o CLAMP_TO_EDGE produziria ao puxar o pixel da margem. */
vec4 amostra(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextura, uv);
}

void main() {
  vec2 uv = vUv;
  float proporcao = uResolucao.x / max(uResolucao.y, 1.0);
  float t = uTempo * uVelocidade;
  float escala = max(uEscala, 0.001);

  // deriva lenta: a onda de fundo que nunca para
  vec2 deriva = vec2(t * 0.055, -t * 0.045);
  float n1 = fbm(uv * escala * 3.1 + deriva);
  float n2 = fbm((uv + 19.17) * escala * 3.4 - deriva.yx);
  vec2 ambiente = (vec2(n1, n2) - 0.5) * uForca * 0.045 * uMovimento;

  // lente do ponteiro: empurra as letras para longe do cursor
  vec2 delta = uv - uPonteiro;
  vec2 ajustado = vec2(delta.x * proporcao, delta.y);
  float dist = length(ajustado);
  float raio = max(uAlcance, 0.001);
  float t2 = clamp(dist / raio, 0.0, 1.0);
  float lente = smoothstep(raio, 0.0, dist) * uPonteiroAtivo;
  float bojo = t2 * (1.0 - t2) * (1.0 - t2) * 6.75 * uPonteiroAtivo;
  vec2 dir = dist > 0.0001 ? vec2(ajustado.x / proporcao, ajustado.y) / dist : vec2(0.0);

  vec2 empurrao = -dir * bojo * uPressao * 0.045;
  vec2 deslocado = uv + ambiente + empurrao;

  /* Aberracao cromatica: R e B saem do lugar do G. E o que da a franja
     colorida na beirada das letras, e o que faz o efeito parecer vidro. */
  vec2 eixo = ambiente + empurrao;
  float comp = length(eixo);
  eixo = comp > 0.00001 ? eixo / comp : vec2(0.7071, 0.7071);
  vec2 fenda = eixo * uRefracao * 0.16 * (0.35 + lente * 1.65);

  vec4 base = amostra(deslocado);
  float r = amostra(deslocado + fenda).r;
  float b = amostra(deslocado - fenda).b;
  float a = max(max(amostra(deslocado + fenda).a, base.a), amostra(deslocado - fenda).a);

  fragColor = vec4(vec3(r, base.g, b) + lente * base.a * 0.055, a);
}`;

type Props = {
  /** Quebra de linha com \n. */
  texto: string;
  cor?: string;
  className?: string;
  /** Aceita qualquer valor de font-size do CSS, clamp() incluso. */
  tamanho?: string;
  peso?: number;
  familia?: string;
  entrelinha?: number;
  espacamento?: string;
};

export function TextoWarp({
  texto,
  cor = "#EDEEF0",
  className = "",
  tamanho = "clamp(2.6rem, 8vw, 6rem)",
  peso = 400,
  familia = "inherit",
  entrelinha = 0.92,
  espacamento = "-0.03em",
}: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  /** As props vivem num ref para o laco nao precisar remontar quando mudam. */
  const atual = useRef({ texto, cor, tamanho, peso, familia, entrelinha, espacamento });

  /* Escrever no ref durante o render quebra o modelo do React 19 — vai num
     efeito. Este roda antes do efeito de montagem abaixo, entao o valor ja
     esta certo quando a rasterizacao acontece. */
  useEffect(() => {
    atual.current = { texto, cor, tamanho, peso, familia, entrelinha, espacamento };
  }, [texto, cor, tamanho, peso, familia, entrelinha, espacamento]);

  useEffect(() => {
    const container = caixa.current;
    if (!container) return;

    let descartado = false;
    let perdeuContexto = false;
    let quadro = 0;
    let versao = 0;
    let parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let render: Renderer;
    try {
      render = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch (e) {
      console.warn("[TextoWarp] sem WebGL2:", e);
      return;
    }

    const gl = render.gl;
    gl.clearColor(0, 0, 0, 0);
    const tela = gl.canvas as HTMLCanvasElement;
    Object.assign(tela.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    });
    container.appendChild(tela);

    const textura = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const programa = new Program(gl, {
      vertex: VERTICE,
      fragment: FRAGMENTO,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextura: { value: textura },
        uResolucao: { value: new Float32Array([1, 1]) },
        uPonteiro: { value: new Float32Array([0.5, 0.5]) },
        uPonteiroAtivo: { value: 0 },
        uTempo: { value: 0 },
        uForca: { value: 0.09 },
        uEscala: { value: 1.7 },
        uVelocidade: { value: 0.5 },
        uAlcance: { value: 0.42 },
        uPressao: { value: 0.38 },
        uRefracao: { value: 0.02 },
        uMovimento: { value: parado ? 0 : 1 },
      },
    });

    const malha = new Mesh(gl, { geometry: new Triangle(gl), program: programa });
    const desenhar = () => {
      if (!descartado && !perdeuContexto) render.render({ scene: malha });
    };

    /** Mede a linha somando caractere a caractere, para honrar o espacamento. */
    function larguraDaLinha(ctx: CanvasRenderingContext2D, linha: string, esp: number) {
      const letras = Array.from(linha);
      const soma = letras.reduce((w, c) => w + ctx.measureText(c).width, 0);
      return soma + Math.max(0, letras.length - 1) * esp;
    }

    /**
     * Rasteriza o titulo. Espera as fontes carregarem: sem isso o Anton (ou
     * qualquer face nova) e medido antes de existir, e a textura sai com a
     * fonte de sistema congelada dentro dela.
     */
    async function rasterizar() {
      const v = ++versao;
      try {
        await document.fonts?.ready;
      } catch {}
      if (descartado || perdeuContexto || v !== versao) return;

      const caixaDom = container!.getBoundingClientRect();
      if (caixaDom.width <= 0 || caixaDom.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const p = atual.current;

      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.floor(caixaDom.width * dpr));
      cv.height = Math.max(1, Math.floor(caixaDom.height * dpr));
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      /* Uma sonda invisivel resolve os valores computados: assim `clamp()` e
         `inherit` funcionam, coisa que o canvas sozinho nao entende. */
      const sonda = document.createElement("span");
      sonda.textContent = p.texto;
      Object.assign(sonda.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        whiteSpace: "pre",
        inset: "0 auto auto 0",
        fontFamily: p.familia,
        fontSize: p.tamanho,
        fontWeight: String(p.peso),
        letterSpacing: p.espacamento,
        lineHeight: String(p.entrelinha),
      });
      container!.appendChild(sonda);
      const cs = window.getComputedStyle(sonda);
      let corpo = parseFloat(cs.fontSize) || 96;
      const familia = cs.fontFamily || "sans-serif";
      const peso = cs.fontWeight || String(p.peso);
      let esp = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
      let alturaLinha = parseFloat(cs.lineHeight);
      if (!Number.isFinite(alturaLinha)) alturaLinha = corpo * p.entrelinha;
      sonda.remove();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, caixaDom.width, caixaDom.height);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = p.cor;
      ctx.imageSmoothingQuality = "high";

      const linhas = String(p.texto || "").split("\n");
      const aplicarFonte = () => {
        ctx.font = `${peso} ${corpo}px ${familia}`;
      };
      aplicarFonte();

      // encolhe para caber, mantendo a proporcao entre corpo, espaco e linha
      const maiorLargura = Math.max(...linhas.map((l) => larguraDaLinha(ctx, l, esp)), 1);
      const alturaBloco = Math.max(alturaLinha * linhas.length, 1);
      const cabe = Math.min(1, (caixaDom.width * 0.94) / maiorLargura, (caixaDom.height * 0.86) / alturaBloco);
      if (cabe < 1) {
        corpo *= cabe;
        esp *= cabe;
        alturaLinha *= cabe;
        aplicarFonte();
      }

      const y0 = caixaDom.height / 2 - (alturaLinha * (linhas.length - 1)) / 2;
      linhas.forEach((linha, i) => {
        let x = caixaDom.width / 2 - larguraDaLinha(ctx, linha, esp) / 2;
        Array.from(linha).forEach((c, j, todas) => {
          ctx.fillText(c, x, y0 + i * alturaLinha);
          x += ctx.measureText(c).width + (j === todas.length - 1 ? 0 : esp);
        });
      });

      textura.image = cv;
      textura.needsUpdate = true;
      desenhar();
    }

    function medir() {
      if (descartado || perdeuContexto) return;
      const r = container!.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      render.dpr = Math.min(window.devicePixelRatio || 1, 2);
      render.setSize(r.width, r.height);
      programa.uniforms.uResolucao.value[0] = gl.drawingBufferWidth;
      programa.uniforms.uResolucao.value[1] = gl.drawingBufferHeight;
      rasterizar();
    }

    const ponteiro = { x: 0.5, y: 0.5, ax: 0.5, ay: 0.5, ativo: 0, alvo: 0 };
    const inicio = performance.now();

    function aoMover(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const r = tela.getBoundingClientRect();
      if (r.width <= 0) return;
      ponteiro.ax = (e.clientX - r.left) / r.width;
      ponteiro.ay = 1 - (e.clientY - r.top) / r.height;
      ponteiro.alvo = 1;
    }
    const aoSair = () => {
      ponteiro.alvo = 0;
    };
    function aoPerder(e: Event) {
      e.preventDefault();
      perdeuContexto = true;
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
    }

    function laco(agora: number) {
      if (descartado || perdeuContexto) return;
      const s = (agora - inicio) * 0.001;

      /* Sem cursor, a lente passeia sozinha: parada, a distorcao vira uma
         mancha fixa e o efeito parece defeito de renderizacao. */
      const ociosoX = 0.5 + Math.sin(s * 0.33) * 0.12;
      const ociosoY = 0.5 + Math.cos(s * 0.27) * 0.1;
      const alvoX = ponteiro.alvo > 0 ? ponteiro.ax : ociosoX;
      const alvoY = ponteiro.alvo > 0 ? ponteiro.ay : ociosoY;
      const freio = ponteiro.alvo > 0 ? 0.12 : 0.035;

      ponteiro.x += (alvoX - ponteiro.x) * freio;
      ponteiro.y += (alvoY - ponteiro.y) * freio;
      ponteiro.ativo += ((ponteiro.alvo > 0 ? 1 : 0.18) - ponteiro.ativo) * 0.06;

      programa.uniforms.uPonteiro.value[0] = ponteiro.x;
      programa.uniforms.uPonteiro.value[1] = ponteiro.y;
      programa.uniforms.uPonteiroAtivo.value = parado ? ponteiro.ativo * 0.35 : ponteiro.ativo;
      programa.uniforms.uTempo.value = parado ? 0 : s;

      desenhar();
      quadro = requestAnimationFrame(laco);
    }

    const observador = new ResizeObserver(medir);
    observador.observe(container);

    /* Fora da tela, para de desenhar. O heroi some assim que a pagina rola, e
       manter um shader rodando atras de conteudo invisivel e gasto puro. */
    const vigia = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !quadro) quadro = requestAnimationFrame(laco);
        if (!e.isIntersecting && quadro) {
          cancelAnimationFrame(quadro);
          quadro = 0;
        }
      },
      { threshold: 0 },
    );
    vigia.observe(container);

    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aoTrocarMovimento = (e: MediaQueryListEvent) => {
      parado = e.matches;
      programa.uniforms.uMovimento.value = parado ? 0 : 1;
      desenhar();
    };

    tela.addEventListener("pointermove", aoMover);
    tela.addEventListener("pointerleave", aoSair);
    tela.addEventListener("webglcontextlost", aoPerder, false);
    consulta.addEventListener("change", aoTrocarMovimento);

    medir();
    quadro = requestAnimationFrame(laco);

    return () => {
      descartado = true;
      if (quadro) cancelAnimationFrame(quadro);
      observador.disconnect();
      vigia.disconnect();
      tela.removeEventListener("pointermove", aoMover);
      tela.removeEventListener("pointerleave", aoSair);
      tela.removeEventListener("webglcontextlost", aoPerder);
      consulta.removeEventListener("change", aoTrocarMovimento);
      if (!perdeuContexto) {
        try {
          if (textura.texture) gl.deleteTexture(textura.texture);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {}
      }
      if (tela.parentNode === container) container.removeChild(tela);
    };
  }, []);

  /* `aria-hidden`: o titulo de verdade vive num <h1> escondido ao lado. Aqui
     so ha pixel, e anunciar a mesma frase duas vezes atrapalha quem ouve. */
  return <div ref={caixa} aria-hidden className={`relative block w-full ${className}`} />;
}
