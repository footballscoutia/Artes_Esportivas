"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * O fundo — um plano de tela cheia rodando um shader.
 *
 * Nao ha objeto nenhum na cena: ha luz. Um campo que escorre devagar por baixo
 * de tudo, e quatro camadas de futebol que se revezam conforme a pagina rola —
 * refletores, escalacao, linhas de campo e a rede do gol.
 * Uma por trecho, nunca duas fortes ao mesmo tempo.
 *
 * Todas somam luz e nenhuma desenha objeto solido: foi objeto solido que deixou
 * a versao anterior literal e dura.
 *
 * Toda a animacao vive no fragment shader: um triangulo de tela cheia, zero
 * geometria, zero objeto por quadro. Sai mais barato que qualquer cena com
 * malha, e e o que permite isso rodar liso em celular.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENTO = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTempo;
  uniform vec2  uRes;
  uniform float uScroll;
  uniform vec2  uMouse;

  const vec3 AZUL   = vec3(0.180, 0.486, 1.000); // #2E7CFF
  const vec3 FUNDO  = vec3(0.031, 0.035, 0.043);
  const vec3 VIOLETA= vec3(0.298, 0.220, 0.760);

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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

  /* Tres oitavas, nao cinco. Cada oitava a mais acrescenta detalhe fino, e
     detalhe fino em campo de luz le como FUMACA. O que se quer aqui e massa
     grande e macia, entao o ruido para cedo. */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * ruido(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v / 0.875; // renormaliza: tres oitavas somam menos que cinco
  }

  /**
   * Peso de uma camada ao longo da pagina.
   *
   * Cada uma nasce e morre em volta do seu trecho, e por isso nunca ha duas
   * fortes ao mesmo tempo — e o que impede a soma de virar sopa. O centro e a
   * posicao no scroll (0 a 1); a largura, o quanto ela demora para sumir.
   */
  float peso(float centro, float largura) {
    return smoothstep(largura, 0.0, abs(uScroll - centro));
  }

  /* ---- 1. refletores: feixes descendo do alto, como holofote de estadio ---- */
  float refletores(vec2 p, float t) {
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
      float f = float(i);
      float base = -0.62 + f * 0.62;
      float inclina = 0.2 * (f - 1.0);
      // distancia ao eixo do feixe, que e uma reta inclinada
      float d = abs(p.x - base - p.y * inclina + sin(t * 0.5 + f) * 0.06);
      float feixe = smoothstep(0.24, 0.0, d);
      // forte em cima, morrendo antes do rodape: luz vem de cima
      feixe *= smoothstep(-0.55, 0.62, p.y);
      s += feixe;
    }
    return s;
  }

  /* ---- 2. escalacao: oito pontos, um por categoria, se rearranjando ---- */
  vec2 pontoA(float f) { return vec2(cos(f * 2.39) * 0.95, sin(f * 1.71) * 0.44); }
  vec2 pontoB(float f) { return vec2(-0.92 + f * 0.263, sin(f * 2.11) * 0.36); }

  /** Distancia de p ao segmento ab — e o que desenha a linha de ligacao. */
  float segmento(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  float escalacao(vec2 p, float t) {
    float m = smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(t * 0.35));
    float s = 0.0;
    vec2 ant = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      float f = float(i);
      vec2 q = mix(pontoA(f), pontoB(f), m);
      s += smoothstep(0.028, 0.0, length(p - q)) * 0.9;          // o ponto
      if (i > 0) s += smoothstep(0.0035, 0.0, segmento(p, ant, q)) * 0.32; // a ligacao
      ant = q;
    }
    return s;
  }

  /* ---- 3. linhas de campo: a geometria do gramado em perspectiva ---- */
  float campoDeJogo(vec2 p, float t) {
    float y = p.y + 0.78;               // horizonte um pouco abaixo do centro
    if (y < 0.02) return 0.0;
    float z = 1.0 / y;                   // profundidade: perto embaixo, longe em cima
    float x = p.x * z;
    // transversais correndo em direcao ao horizonte
    float tr = smoothstep(0.5, 0.46, abs(fract(z * 0.32 - t * 0.1) - 0.5));
    // longitudinais fixas
    float lo = smoothstep(0.5, 0.47, abs(fract(x * 0.22) - 0.5));
    return (tr + lo) * smoothstep(0.0, 0.55, y) * smoothstep(2.6, 0.7, z);
  }

  /* ---- 4. rede: a malha do gol, ondulando devagar ---- */
  float rede(vec2 p, float t) {
    vec2 q = p * 13.0;
    q.x += sin(q.y * 0.42 + t * 1.1) * 0.55;
    q.y += sin(q.x * 0.33 + t * 0.85) * 0.4;
    vec2 g = abs(fract(q) - 0.5);
    return smoothstep(0.44, 0.5, max(g.x, g.y));
  }

  void main() {
    // aspecto corrigido: sem isto o brilho vira elipse em tela larga
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

    float t = uTempo * 0.045;

    /* Duas camadas de fbm correndo em sentidos diferentes. E o que faz a luz
       parecer liquida em vez de um degrade parado com opacidade animada. */
    vec2 desloc = vec2(fbm(p * 0.85 + vec2(t, -t * 0.7)), fbm(p * 0.85 + vec2(-t * 0.8, t)));
    float campo = fbm(p * 1.05 + desloc * 0.9 - vec2(0.0, t * 1.1 + uScroll * 1.6));

    /* O scroll DESLOCA o campo, nao o clareia. Somar ao campo (era +0.16 *
       uScroll) fazia a pagina inteira ficar progressivamente mais clara: no
       meio da leitura o fundo ja tinha virado fumaca luminosa por cima do
       texto. Agora ele viaja, e o brilho fica constante do topo ao rodape. */

    /* Os limiares moram em volta de 0.5 porque e ali que o fbm vive: cinco
       oitavas somadas com amplitude decrescente se concentram no meio da
       faixa. Com 0.42 e 0.62 o brilho quase nao acendia e o nucleo azul nunca
       acendia — o fundo saia preto. */
    float brilho = smoothstep(0.26, 0.68, campo);
    float nucleo = smoothstep(0.46, 0.88, campo);

    /* Ambiente, nao assunto — mas presente. O ajuste que importou nao foi este
       numero e sim tirar a rampa de brilho por scroll: era ela que fazia o
       miolo da pagina estourar enquanto o topo parecia certo. */
    vec3 cor = FUNDO;
    cor = mix(cor, VIOLETA * 0.60, brilho * 0.46);
    cor = mix(cor, AZUL * 0.92, nucleo * 0.56);

    /* Halo do cursor: presenca discreta, so o suficiente para a pagina
       responder ao mouse sem virar lanterna. */
    float dMouse = length(p - uMouse);
    cor += AZUL * 0.10 * smoothstep(0.85, 0.0, dMouse);

    /**
     * As quatro camadas, uma por trecho da pagina.
     *
     * Todas somam luz e nenhuma desenha objeto solido — foi objeto solido que
     * deixou a versao anterior dura. Os pesos se cruzam de leve nas bordas, o
     * suficiente para a troca nao ter emenda, e as intensidades sao baixas de
     * proposito: cada uma tem de ser notada, nunca encarada.
     *
     * O desvio sai barato porque o peso vem de uniform: a ramificacao e a
     * mesma para todos os pixels do quadro, entao a GPU nao diverge.
     */
    float t2 = uTempo * 0.16;

    float wRef = peso(0.02, 0.20) + peso(1.0, 0.13);
    if (wRef > 0.004) cor += AZUL * refletores(p, t2) * 0.055 * wRef;

    /* O trecho dos materiais fica so com o campo de luz. Os arcos de passe
       moravam aqui e sairam: uma curva fina atravessando a tela inteira le
       como risco solto, nao como trajetoria. Secao quieta tambem e ritmo. */
    float wEsc = peso(0.42, 0.15);
    if (wEsc > 0.004) cor += AZUL * escalacao(p, t2) * 0.42 * wEsc;

    float wCam = peso(0.62, 0.15);
    if (wCam > 0.004) cor += AZUL * campoDeJogo(p, t2) * 0.075 * wCam;

    float wRede = peso(0.81, 0.14);
    if (wRede > 0.004) cor += AZUL * rede(p, t2) * 0.05 * wRede;

    // vinheta: fecha as bordas para o texto ter chao em qualquer canto
    float vinheta = smoothstep(1.45, 0.15, length(p));
    cor *= mix(0.72, 1.0, vinheta);

    /* Granulacao. Sem ela um degrade escuro faixeia em tela OLED, e o fundo
       inteiro ganha aquelas listras horizontais. */
    float grao = (hash(uv * uRes + fract(uTempo)) - 0.5) * 0.022;
    cor += grao;

    gl_FragColor = vec4(cor, 1.0);
  }
`;

export function Fundo() {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cena = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const render = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    render.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    alvo.appendChild(render.domElement);

    const uniformes = {
      uTempo: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENTO,
      uniforms: uniformes,
      depthTest: false,
      depthWrite: false,
    });
    cena.add(new THREE.Mesh(geo, mat));

    const mouse = new THREE.Vector2(0, 0);
    function aoMover(e: PointerEvent) {
      const l = alvo!.clientWidth;
      const a = alvo!.clientHeight;
      mouse.set(((e.clientX / l) - 0.5) * (l / a), -((e.clientY / a) - 0.5));
    }
    window.addEventListener("pointermove", aoMover, { passive: true });

    function medir() {
      const l = alvo!.clientWidth;
      const a = alvo!.clientHeight;
      if (l === 0 || a === 0) return;
      render.setSize(l, a);
      uniformes.uRes.value.set(l, a);
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);

    let vivo = true;
    let quadro = 0;
    const nascimento = performance.now();

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);

      const agora = (performance.now() - nascimento) / 1000;
      uniformes.uTempo.value = parado ? 0 : agora;

      /**
       * O progresso vem do proprio scroll, nao do ScrollTrigger.
       *
       * Passar pelo GSAP somava o scrub do gatilho a este lerp, e a defasagem
       * ficava grande o bastante para uma camada aparecer no trecho da outra —
       * a escalacao surgia onde a rede deveria estar. Lendo a posicao direto,
       * o que o shader ve e o que a pagina esta mostrando.
       */
      const alcance = document.body.scrollHeight - window.innerHeight;
      const pr = alcance > 0 ? Math.min(Math.max(window.scrollY / alcance, 0), 1) : 0;
      // ainda persegue o alvo, so que de perto: rolagem brusca nao vira salto
      uniformes.uScroll.value += (pr - uniformes.uScroll.value) * 0.14;
      uniformes.uMouse.value.lerp(mouse, 0.05);

      render.render(cena, camera);
    }
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      window.removeEventListener("pointermove", aoMover);
      render.domElement.remove();
      render.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return <div ref={caixa} aria-hidden className="fixed inset-0 z-0" />;
}
