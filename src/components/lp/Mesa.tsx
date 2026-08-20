"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A mesa do analista — a cena 3D que carrega a tese da pagina.
 *
 * Tres placas flutuam separadas sobre uma superficie escura: a foto do atleta,
 * o escudo do clube e a marca da agencia. O scroll traz as tres ao centro ate
 * se fundirem numa placa so, no formato 4:5 do feed. E o mecanismo do produto
 * acontecendo, sem precisar de legenda.
 *
 * As placas sao DIAGRAMA, nao imitacao: retangulos com aresta acesa e rotulo,
 * nunca uma foto falsa de atleta nem um escudo inventado. Nao ha arte real para
 * mostrar ainda, e fingir que ha seria mentir sobre o produto na propria pagina
 * que o vende.
 *
 * O progresso vem de fora, por `progresso` (0 a 1), alimentado pelo
 * ScrollTrigger. A cena nao sabe o que e scroll — so sabe interpolar entre
 * "separado" e "fundido", o que a deixa testavel e reaproveitavel.
 */

/** Onde cada placa nasce e para onde vai. Unidades da cena, nao pixels. */
const PLACAS = [
  { x: -3.1, z: -0.55, giro: -0.22, alvoY: 0.06, rotulo: "foto" },
  { x: 0.15, z: 1.35, giro: 0.16, alvoY: 0.16, rotulo: "escudo" },
  { x: 3.0, z: -0.75, giro: 0.28, alvoY: 0.26, rotulo: "marca" },
];

const AZUL = 0x2e7cff;

/** Interpolacao com desaceleracao exponencial — a mesma curva do resto da pagina. */
function suave(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function Mesa({ progresso }: { progresso: React.RefObject<number> }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    /* Quem prefere menos movimento recebe a cena parada no estado final: a
       informacao e a fusao ter acontecido, nao a animacao dela. */
    const paradoPorPreferencia = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    render.setSize(alvo.clientWidth, alvo.clientHeight);
    alvo.appendChild(render.domElement);

    /* Vista de cima, levemente inclinada. Reto de 90 graus achataria tudo e
       tiraria a leitura de altura entre as placas. */
    camera.position.set(0, 7.4, 3.1);
    camera.lookAt(0, 0, 0);

    cena.add(new THREE.AmbientLight(0xffffff, 0.34));

    const foco = new THREE.DirectionalLight(0xffffff, 1.5);
    foco.position.set(-3, 9, 4);
    cena.add(foco);

    const contraluz = new THREE.PointLight(AZUL, 26, 22);
    contraluz.position.set(2.5, 2.4, -2.5);
    cena.add(contraluz);

    /* A mesa. Escura e fosca: ela e o fundo, nao o assunto. */
    const mesa = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.94, metalness: 0.04 }),
    );
    mesa.rotation.x = -Math.PI / 2;
    mesa.position.y = -0.42;
    cena.add(mesa);

    /* Grade da mesa: retomada da grade de diagramacao das artes, nao textura
       decorativa. Fica quase invisivel, so dando escala a superficie. */
    const grade = new THREE.GridHelper(30, 30, 0x1b1d21, 0x141619);
    grade.position.y = -0.4;
    cena.add(grade);

    const grupos = PLACAS.map(({ x, z, giro }) => {
      const grupo = new THREE.Group();

      const placa = new THREE.Mesh(
        new THREE.BoxGeometry(2.16, 0.05, 2.7),
        new THREE.MeshStandardMaterial({
          color: 0x16181c,
          roughness: 0.52,
          metalness: 0.22,
        }),
      );
      grupo.add(placa);

      /* A aresta acesa e o que faz a placa existir contra a mesa escura —
         sem ela, tres retangulos pretos somem num fundo preto. */
      const aresta = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.16, 0.05, 2.7)),
        new THREE.LineBasicMaterial({ color: AZUL, transparent: true, opacity: 0.62 }),
      );
      grupo.add(aresta);

      grupo.position.set(x, 0, z);
      grupo.rotation.y = giro;
      cena.add(grupo);
      return { grupo, aresta, inicio: { x, z, giro } };
    });

    let vivo = true;
    let quadro = 0;

    function medir() {
      if (!alvo) return;
      const l = alvo.clientWidth;
      const a = alvo.clientHeight;
      /* Contêiner de tamanho zero (aba oculta, montagem antes do layout) não
         pode ser gravado: o canvas ficaria travado em 0 e não voltaria mais.
         Sair aqui deixa o observador chamar de novo com a medida real. */
      if (l === 0 || a === 0) return;
      camera.aspect = l / a;
      /* Em tela estreita a camera recua: com o mesmo enquadramento as placas
         saem pelas laterais e a fusao acontece fora do campo de visao. */
      camera.position.set(0, l < 720 ? 9.6 : 7.4, l < 720 ? 4.1 : 3.1);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      render.setSize(l, a);
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);

      const p = paradoPorPreferencia ? 1 : suave(Math.min(Math.max(progresso.current ?? 0, 0), 1));
      const tempo = paradoPorPreferencia ? 0 : performance.now() * 0.0004;

      grupos.forEach(({ grupo, aresta, inicio }, i) => {
        const { alvoY } = PLACAS[i];
        // as placas viajam para o centro e empilham na ordem em que o codigo compoe
        grupo.position.x = inicio.x * (1 - p);
        grupo.position.z = inicio.z * (1 - p);
        grupo.position.y = alvoY * p + Math.sin(tempo * 2 + i * 1.7) * 0.07 * (1 - p);
        grupo.rotation.y = inicio.giro * (1 - p);

        // fundidas, as arestas se apagam: viraram uma peca so, nao tres
        const m = aresta.material as THREE.LineBasicMaterial;
        m.opacity = 0.62 * (1 - p * 0.72);
      });

      contraluz.intensity = 26 + p * 30;
      render.render(cena, camera);
    }
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      render.domElement.remove();
      render.dispose();
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    };
  }, [progresso]);

  return <div ref={caixa} aria-hidden className="absolute inset-0" />;
}
