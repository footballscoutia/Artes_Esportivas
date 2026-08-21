"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * O fundo — um plano de tela cheia rodando um shader.
 *
 * Nao ha objeto nenhum na cena: ha luz. Campos de brilho que escorrem devagar,
 * granulacao para o degrade nao faixear, e ondas de choque que abrem quando a
 * pessoa rola ou clica. E o oposto da versao anterior, que tentava explicar o
 * produto com placas voando e ficava literal e dura.
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
  /** xy = centro em uv, z = instante do nascimento, w = forca */
  uniform vec4  uOndas[4];

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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * ruido(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // aspecto corrigido: sem isto o brilho vira elipse em tela larga
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

    float t = uTempo * 0.045;

    /* Duas camadas de fbm correndo em sentidos diferentes. E o que faz a luz
       parecer liquida em vez de um degrade parado com opacidade animada. */
    vec2 desloc = vec2(fbm(p * 1.6 + vec2(t, -t * 0.7)), fbm(p * 1.6 + vec2(-t * 0.8, t)));
    float campo = fbm(p * 2.1 + desloc * 1.4 - vec2(0.0, t * 1.2));

    // o campo sobe conforme a pagina rola: o fundo acompanha a leitura
    campo += uScroll * 0.16;

    float brilho = smoothstep(0.42, 0.92, campo);
    float nucleo = smoothstep(0.62, 1.0, campo);

    vec3 cor = FUNDO;
    cor = mix(cor, VIOLETA * 0.5, brilho * 0.34);
    cor = mix(cor, AZUL, nucleo * 0.55);

    /* Halo do cursor: presenca discreta, so o suficiente para a pagina
       responder ao mouse sem virar lanterna. */
    float dMouse = length(p - uMouse);
    cor += AZUL * 0.10 * smoothstep(0.85, 0.0, dMouse);

    /* Ondas de choque: aneis que abrem e somem. Sao o unico movimento rapido
       da pagina, e por isso so acontecem quando alguem faz alguma coisa. */
    for (int i = 0; i < 4; i++) {
      vec4 onda = uOndas[i];
      if (onda.w <= 0.0) continue;
      float idade = uTempo - onda.z;
      if (idade < 0.0 || idade > 2.6) continue;
      vec2 centro = (onda.xy - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      float raio = idade * 0.62;
      float d = abs(length(p - centro) - raio);
      float anel = smoothstep(0.055, 0.0, d);
      float vida = 1.0 - idade / 2.6;
      cor += AZUL * anel * vida * vida * onda.w * 0.85;
    }

    // vinheta: fecha as bordas para o texto ter chao em qualquer canto
    float vinheta = smoothstep(1.25, 0.25, length(p));
    cor *= mix(0.55, 1.0, vinheta);

    /* Granulacao. Sem ela um degrade escuro faixeia em tela OLED, e o fundo
       inteiro ganha aquelas listras horizontais. */
    float grao = (hash(uv * uRes + fract(uTempo)) - 0.5) * 0.022;
    cor += grao;

    gl_FragColor = vec4(cor, 1.0);
  }
`;

export function Fundo({ progresso }: { progresso: React.RefObject<number> }) {
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
      uOndas: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)) },
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

    let proxima = 0;
    /** Dispara uma onda a partir de um ponto em coordenadas de tela (0..1). */
    function onda(x: number, y: number, forca = 1) {
      const v = uniformes.uOndas.value[proxima];
      v.set(x, y, uniformes.uTempo.value, forca);
      proxima = (proxima + 1) % 4;
    }

    const mouse = new THREE.Vector2(0, 0);
    function aoMover(e: PointerEvent) {
      const l = alvo!.clientWidth;
      const a = alvo!.clientHeight;
      mouse.set(((e.clientX / l) - 0.5) * (l / a), -((e.clientY / a) - 0.5));
    }
    function aoClicar(e: PointerEvent) {
      onda(e.clientX / alvo!.clientWidth, 1 - e.clientY / alvo!.clientHeight, 1);
    }
    window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("pointerdown", aoClicar, { passive: true });

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
    /* Uma onda a cada quinto da pagina rolada: marca a passagem de secao sem
       precisar de gatilho por secao. */
    let marcoAnterior = -1;

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);

      const agora = (performance.now() - nascimento) / 1000;
      uniformes.uTempo.value = parado ? 0 : agora;

      const pr = Math.min(Math.max(progresso.current ?? 0, 0), 1);
      // o valor persegue o alvo: rolagem brusca nao vira salto no fundo
      uniformes.uScroll.value += (pr - uniformes.uScroll.value) * 0.06;
      uniformes.uMouse.value.lerp(mouse, 0.05);

      if (!parado) {
        const marco = Math.floor(pr * 5);
        if (marco !== marcoAnterior && marcoAnterior !== -1) {
          onda(0.5 + (Math.random() - 0.5) * 0.5, 0.5 + (Math.random() - 0.5) * 0.4, 0.7);
        }
        marcoAnterior = marco;
      }

      render.render(cena, camera);
    }
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerdown", aoClicar);
      render.domElement.remove();
      render.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, [progresso]);

  return <div ref={caixa} aria-hidden className="fixed inset-0 z-0" />;
}
