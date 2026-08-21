"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";

/**
 * Texto que ondula — porte fiel do "Warp Text" do React Bits.
 *
 * O titulo e desenhado num canvas 2D, vira textura, e um shader o distorce:
 * um fbm lento empurra os pixels no repouso, o ponteiro abre uma lente com
 * anel de ondulacao (o `ondulacao`), e os canais R e B sao amostrados
 * deslocados do G — dai a franja colorida na beirada das letras.
 *
 * ACESSIBILIDADE: o original marca o container com `role="img"` e
 * `aria-label`. Aqui ele vai `aria-hidden`, e o <h1> de verdade fica ao lado,
 * invisivel, no Landing. Motivo: `role="img"` entrega a frase ao leitor de
 * tela mas nao entrega cabecalho nenhum ao buscador, e numa landing o h1 e o
 * que indexa. E o unico desvio do original, e nao toca no efeito.
 */

const VERTICE = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENTO = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

type Medida = string | number;

type Props = {
  /** Quebra de linha com \n. */
  texto?: string;
  cor?: string;
  /** Distorcao ambiente, no repouso. */
  forca?: number;
  /** Tamanho das celulas de distorcao. */
  escala?: number;
  velocidade?: number;
  /** Raio da lente do cursor. */
  alcance?: number;
  /** Forca da curvatura sob o cursor. */
  pressao?: number;
  /** Separacao dos canais RGB — a franja de vidro. */
  refracao?: number;
  /** Anel de ondulacao acompanhando a lente. */
  ondulacao?: boolean;
  tamanho?: Medida;
  peso?: Medida;
  familia?: string;
  espacamento?: Medida;
  entrelinha?: Medida;
  /** Flecha do arco como fracao da largura da linha. 0 = reta. */
  curvatura?: number;
  className?: string;
  style?: React.CSSProperties;
};

type PropsInternas = Required<
  Pick<
    Props,
    | "texto"
    | "cor"
    | "forca"
    | "escala"
    | "velocidade"
    | "alcance"
    | "pressao"
    | "refracao"
    | "ondulacao"
    | "tamanho"
    | "peso"
    | "familia"
    | "espacamento"
    | "entrelinha"
    | "curvatura"
  >
>;

const emCss = (v: Medida) => (typeof v === "number" ? `${v}px` : v);

/** Mede a linha caractere a caractere, para o espacamento entrar na conta. */
function larguraDaLinha(ctx: CanvasRenderingContext2D, linha: string, espacamento: number) {
  const letras = Array.from(linha);
  const soma = letras.reduce((w, c) => w + ctx.measureText(c).width, 0);
  return soma + Math.max(0, letras.length - 1) * espacamento;
}

/**
 * Desenha a linha sobre um arco raso — pontas para cima, meio embaixo.
 *
 * `curvatura` e a flecha do arco como fracao da largura da linha: 0.03 quer
 * dizer que as pontas sobem 3% da largura em relacao ao centro. Vem dai o raio,
 * pela relacao da sagitta (s = L² / 8R), e cada letra e posicionada pelo
 * angulo correspondente ao seu centro.
 *
 * Cada letra tambem GIRA para acompanhar a tangente. Sem isso as letras ficam
 * de pe sobre uma linha curva, que le como erro de alinhamento e nao como
 * curva. O giro e `-theta` porque no canvas o angulo positivo desce.
 *
 * Com `curvatura` em 0 volta a ser uma linha reta, identica ao original.
 */
function desenharLinha(
  ctx: CanvasRenderingContext2D,
  linha: string,
  x: number,
  y: number,
  espacamento: number,
  curvatura: number,
) {
  const letras = Array.from(linha);
  const largura = larguraDaLinha(ctx, linha, espacamento);

  if (curvatura <= 0 || largura <= 0) {
    let cursor = x - largura / 2;
    letras.forEach((c, i) => {
      ctx.fillText(c, cursor, y);
      cursor += ctx.measureText(c).width + (i === letras.length - 1 ? 0 : espacamento);
    });
    return;
  }

  const flecha = curvatura * largura;
  const raio = (largura * largura) / (8 * flecha);

  let percorrido = -largura / 2;
  letras.forEach((c, i) => {
    const larguraChar = ctx.measureText(c).width;
    const theta = (percorrido + larguraChar / 2) / raio;

    ctx.save();
    ctx.translate(x + raio * Math.sin(theta), y - raio * (1 - Math.cos(theta)));
    ctx.rotate(-theta);
    ctx.fillText(c, -larguraChar / 2, 0);
    ctx.restore();

    percorrido += larguraChar + (i === letras.length - 1 ? 0 : espacamento);
  });
}

/**
 * Quebra o texto para caber na largura, sem cortar palavra.
 *
 * O titulo e uma linha so por natureza; em tela estreita ela nao cabe, e a
 * alternativa a quebrar seria encolher a fonte ate ficar ilegivel. As linhas
 * resultantes curvam todas, cada uma no seu arco.
 */
function quebrarEmLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  espacamento: number,
  larguraMax: number,
) {
  const cabe = (s: string) => larguraDaLinha(ctx, s, espacamento) <= larguraMax;

  const linhas: string[] = [];

  // \n continua sendo quebra obrigatoria; dentro de cada trecho, quebra sozinho
  for (const trecho of String(texto || "").split("\n")) {
    const limpo = trecho.trim();
    if (!limpo) {
      linhas.push("");
      continue;
    }
    if (cabe(limpo)) {
      linhas.push(limpo);
      continue;
    }

    /**
     * Primeiro tenta cortar entre FRASES.
     *
     * O titulo sao duas oracoes, e a quebra por palavra deixava "pronto."
     * sozinho numa linha — orfa, e cortando a frase no meio. Se cada frase
     * couber inteira, esse e o corte que o texto ja pedia.
     */
    const frases = limpo.match(/[^.!?]+[.!?]*\s*/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
    if (frases.length > 1 && frases.every(cabe)) {
      linhas.push(...frases);
      continue;
    }

    // nao deu: volta para a quebra gulosa por palavra
    const palavras = limpo.split(/\s+/);
    let atual = palavras[0];
    for (let i = 1; i < palavras.length; i++) {
      const tentativa = `${atual} ${palavras[i]}`;
      if (cabe(tentativa)) {
        atual = tentativa;
      } else {
        linhas.push(atual);
        atual = palavras[i];
      }
    }
    linhas.push(atual);
  }

  return linhas;
}

function montarCanvasDoTexto(
  container: HTMLElement,
  largura: number,
  altura: number,
  dpr: number,
  p: PropsInternas,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(largura * dpr));
  canvas.height = Math.max(1, Math.floor(altura * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  /* Sonda invisivel: e ela que resolve `clamp()` e `inherit`, coisas que o
     canvas 2D sozinho nao entende. */
  const sonda = document.createElement("span");
  sonda.textContent = p.texto;
  Object.assign(sonda.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    inset: "0 auto auto 0",
    fontFamily: p.familia,
    fontSize: emCss(p.tamanho),
    fontWeight: String(p.peso),
    letterSpacing: emCss(p.espacamento),
    lineHeight: typeof p.entrelinha === "number" ? String(p.entrelinha) : p.entrelinha,
  });
  container.appendChild(sonda);
  const cs = window.getComputedStyle(sonda);
  let corpo = parseFloat(cs.fontSize) || 96;
  const familia = cs.fontFamily || "sans-serif";
  const peso = cs.fontWeight || String(p.peso);
  let espacamento = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
  let alturaLinha = parseFloat(cs.lineHeight);
  if (!Number.isFinite(alturaLinha)) {
    alturaLinha = corpo * (typeof p.entrelinha === "number" ? p.entrelinha : 0.92);
  }
  sonda.remove();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, largura, altura);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = p.cor;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const aplicarFonte = () => {
    ctx.font = `${peso} ${corpo}px ${familia}`;
  };
  aplicarFonte();

  const larguraMax = largura * 0.94;
  const alturaMax = altura * 0.78;

  /* Quebra primeiro, encolhe depois. Na ordem inversa a fonte encolheria para
     caber numa linha so, e em celular o titulo viraria um fio ilegivel. */
  let linhas = quebrarEmLinhas(ctx, p.texto, espacamento, larguraMax);

  const maisLarga = Math.max(...linhas.map((l) => larguraDaLinha(ctx, l, espacamento)), 1);
  /* A flecha do arco soma altura ao bloco: sem contar isso, as pontas das
     linhas curvas encostam na borda do canvas e ficam cortadas. */
  const flecha = p.curvatura * maisLarga;
  const alturaBloco = Math.max(alturaLinha * linhas.length + flecha, 1);
  const cabe = Math.min(1, larguraMax / maisLarga, alturaMax / alturaBloco);

  if (cabe < 1) {
    corpo *= cabe;
    espacamento *= cabe;
    alturaLinha *= cabe;
    aplicarFonte();
    // com a fonte menor, mais palavras cabem por linha: refaz a quebra
    linhas = quebrarEmLinhas(ctx, p.texto, espacamento, larguraMax);
  }

  /* O centro desce metade da flecha: como as pontas sobem, o bloco desenhado
     fica com o peso visual acima do meio se ele nao for compensado. */
  const y0 =
    altura / 2 + (p.curvatura * maisLarga * cabe) / 2 - (alturaLinha * (linhas.length - 1)) / 2;

  linhas.forEach((linha, i) =>
    desenharLinha(ctx, linha, largura / 2, y0 + i * alturaLinha, espacamento, p.curvatura),
  );

  return canvas;
}

function sincronizar(program: Program, p: PropsInternas) {
  const u = program.uniforms;
  u.uWarpStrength.value = p.forca;
  u.uWarpScale.value = p.escala;
  u.uSpeed.value = p.velocidade;
  u.uPointerInfluence.value = p.alcance;
  u.uPointerStrength.value = p.pressao;
  u.uRefraction.value = p.refracao;
  u.uRipple.value = p.ondulacao ? 1 : 0;
}

export function TextoWarp({
  texto = "Bend the moment",
  cor = "#f8f5ff",
  forca = 0.08,
  escala = 1.7,
  velocidade = 0.55,
  alcance = 0.42,
  pressao = 0.38,
  refracao = 0.018,
  ondulacao = true,
  tamanho = "clamp(3rem, 10vw, 9rem)",
  peso = 800,
  familia = "inherit",
  espacamento = "-0.06em",
  entrelinha = 0.9,
  curvatura = 0,
  className = "",
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const props = useRef<PropsInternas>({
    texto, cor, forca, escala, velocidade, alcance, pressao, refracao,
    ondulacao, tamanho, peso, familia, espacamento, entrelinha, curvatura,
  });
  const contexto = useRef<{ program: Program; rasterizar: () => void } | null>(null);

  /* Props mudaram: atualiza os uniformes e redesenha a textura, sem remontar
     o contexto WebGL inteiro. */
  useEffect(() => {
    props.current = {
      texto, cor, forca, escala, velocidade, alcance, pressao, refracao,
      ondulacao, tamanho, peso, familia, espacamento, entrelinha, curvatura,
    };
    if (contexto.current) {
      sincronizar(contexto.current.program, props.current);
      contexto.current.rasterizar();
    }
  }, [texto, cor, forca, escala, velocidade, alcance, pressao, refracao,
      ondulacao, tamanho, peso, familia, espacamento, entrelinha, curvatura]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    let descartado = false;
    let perdeuContexto = false;
    let visivel = true;
    let paginaVisivel = !document.hidden;
    let semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let versao = 0;

    const ponteiro = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, ativo: 0, alvo: 0 };
    const inicio = performance.now();

    let render: Renderer;
    try {
      render = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch (erro) {
      console.warn("[TextoWarp] WebGL não pôde ser inicializado.", erro);
      return;
    }

    const gl = render.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const textura = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const geometria = new Triangle(gl);
    const programa = new Program(gl, {
      vertex: VERTICE,
      fragment: FRAGMENTO,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: textura },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: props.current.forca },
        uWarpScale: { value: props.current.escala },
        uSpeed: { value: props.current.velocidade },
        uPointerInfluence: { value: props.current.alcance },
        uPointerStrength: { value: props.current.pressao },
        uRefraction: { value: props.current.refracao },
        uRipple: { value: props.current.ondulacao ? 1 : 0 },
        uMotion: { value: semMovimento ? 0 : 1 },
      },
    });
    const malha = new Mesh(gl, { geometry: geometria, program: programa });

    const desenhar = () => {
      if (descartado || perdeuContexto) return;
      render.render({ scene: malha });
    };

    /* Espera as fontes: sem isso o Anton e medido antes de existir e a textura
       congela com a fonte de sistema dentro dela. */
    const rasterizar = async () => {
      const v = ++versao;
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }
      if (descartado || perdeuContexto || v !== versao) return;

      const r = container.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      textura.image = montarCanvasDoTexto(container, r.width, r.height, dpr, props.current);
      textura.needsUpdate = true;
      desenhar();
    };

    const medir = () => {
      if (descartado || perdeuContexto) return;
      const r = container.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      render.dpr = Math.min(window.devicePixelRatio || 1, 2);
      render.setSize(r.width, r.height);
      programa.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      programa.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      rasterizar();
    };

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      ponteiro.tx = (e.clientX - r.left) / r.width;
      ponteiro.ty = 1 - (e.clientY - r.top) / r.height;
      ponteiro.alvo = 1;
    };
    const aoSair = () => {
      ponteiro.alvo = 0;
    };
    const aoPerderContexto = (e: Event) => {
      e.preventDefault();
      perdeuContexto = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const aoTrocarVisibilidade = () => {
      paginaVisivel = !document.hidden;
      if (paginaVisivel && visivel && !raf) raf = requestAnimationFrame(laco);
      if (!paginaVisivel && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aoTrocarMovimento = (e: MediaQueryListEvent) => {
      semMovimento = e.matches;
      programa.uniforms.uMotion.value = semMovimento ? 0 : 1;
      desenhar();
    };

    function laco(agora: number) {
      if (descartado || perdeuContexto) return;

      const s = (agora - inicio) * 0.001;
      /* Sem cursor a lente passeia sozinha: parada, a distorcao vira mancha
         fixa e o efeito parece defeito de renderizacao. */
      const ociosoX = 0.5 + Math.sin(s * 0.33) * 0.12;
      const ociosoY = 0.5 + Math.cos(s * 0.27) * 0.1;
      const alvoX = ponteiro.alvo > 0 ? ponteiro.tx : ociosoX;
      const alvoY = ponteiro.alvo > 0 ? ponteiro.ty : ociosoY;
      const freio = ponteiro.alvo > 0 ? 0.12 : 0.035;

      ponteiro.x += (alvoX - ponteiro.x) * freio;
      ponteiro.y += (alvoY - ponteiro.y) * freio;
      ponteiro.ativo += ((ponteiro.alvo > 0 ? 1 : 0.18) - ponteiro.ativo) * 0.06;

      programa.uniforms.uPointer.value[0] = ponteiro.x;
      programa.uniforms.uPointer.value[1] = ponteiro.y;
      programa.uniforms.uPointerActive.value = semMovimento ? ponteiro.ativo * 0.35 : ponteiro.ativo;
      programa.uniforms.uTime.value = semMovimento ? 0 : s;

      desenhar();
      raf = requestAnimationFrame(laco);
    }

    const observador = new ResizeObserver(medir);
    observador.observe(container);

    const vigia = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        if (visivel && paginaVisivel && !raf) raf = requestAnimationFrame(laco);
        if (!visivel && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 },
    );
    vigia.observe(container);

    canvas.addEventListener("pointermove", aoMover);
    canvas.addEventListener("pointerleave", aoSair);
    canvas.addEventListener("webglcontextlost", aoPerderContexto, false);
    document.addEventListener("visibilitychange", aoTrocarVisibilidade);
    consulta.addEventListener("change", aoTrocarMovimento);

    sincronizar(programa, props.current);
    contexto.current = { program: programa, rasterizar };
    medir();
    raf = requestAnimationFrame(laco);

    return () => {
      descartado = true;
      contexto.current = null;
      if (raf) cancelAnimationFrame(raf);
      observador.disconnect();
      vigia.disconnect();
      canvas.removeEventListener("pointermove", aoMover);
      canvas.removeEventListener("pointerleave", aoSair);
      canvas.removeEventListener("webglcontextlost", aoPerderContexto);
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
      consulta.removeEventListener("change", aoTrocarMovimento);

      if (!perdeuContexto) {
        try {
          if (textura.texture) gl.deleteTexture(textura.texture);
          geometria.remove?.();
          programa.remove?.();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {}
      }
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`relative block w-full overflow-hidden isolate ${className}`.trim()}
      style={style}
    />
  );
}
