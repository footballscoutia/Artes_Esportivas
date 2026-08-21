"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * A cena — uma camera so, atravessando a pagina inteira.
 *
 * Nao ha uma cena por secao: ha UMA, fixa atras de todo o conteudo, e o scroll
 * da pagina inteira dirige uma camera por seis atos. E o que separa
 * "cinematografico" de "efeito por secao": o corte nunca acontece, a materia se
 * transforma continuamente na frente de quem le.
 *
 *   mesa -> fusao -> grade -> formatos -> esteira -> final
 *
 * As placas sao DIAGRAMA, nao imitacao: nunca uma foto falsa de atleta nem
 * escudo inventado. Nao ha arte real enquanto IMAGE_PROVIDER=mock, e fingir que
 * ha seria mentir sobre o produto na propria pagina que o vende.
 *
 * O `progresso` (0 a 1) vem de fora, do ScrollTrigger. A cena nao sabe o que e
 * scroll — so interpola entre atos, o que a deixa testavel sozinha.
 */

const AZUL = new THREE.Color(0x2e7cff);
const N = 14;

/** Recorta uma faixa do progresso global e devolve 0..1 dentro dela. */
function faixa(p: number, a: number, b: number) {
  return Math.min(Math.max((p - a) / (b - a), 0), 1);
}

/** Desaceleracao exponencial — a mesma curva do resto da pagina. */
function suave(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };

const OCULTO: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 0 };

/** Onde cada placa fica em cada ato. i e o indice da placa. */
const ATOS: Array<(i: number, largura: number) => Pose> = [
  // 0 — a mesa: tres materiais separados, deitados, vistos de cima
  (i) => {
    if (i > 2) return OCULTO;
    const spread = [-3.1, 0.15, 3.0][i];
    const prof = [-0.55, 1.35, -0.75][i];
    return { x: spread, y: 0, z: prof, rx: -Math.PI / 2, ry: 0, rz: [-0.22, 0.16, 0.28][i], s: 1 };
  },
  // 1 — a fusao: as tres empilhadas viram uma peca so
  (i) => {
    if (i > 2) return OCULTO;
    return { x: 0, y: i * 0.06, z: 0, rx: -Math.PI / 2, ry: 0, rz: 0, s: 1 };
  },
  // 2 — a grade: a peca se multiplica nas oito categorias, de frente
  (i, largura) => {
    if (i > 7) return OCULTO;
    const cols = largura < 720 ? 2 : 4;
    const col = i % cols;
    const lin = Math.floor(i / cols);
    const passoX = largura < 720 ? 2.5 : 2.75;
    return {
      x: (col - (cols - 1) / 2) * passoX,
      y: (lin - (Math.ceil(8 / cols) - 1) / 2) * -3.15,
      z: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      s: 0.92,
    };
  },
  // 3 — os formatos: feed 4:5 e story 9:16, lado a lado
  (i) => {
    if (i > 1) return OCULTO;
    return { x: i === 0 ? -2.3 : 2.3, y: 0, z: 0, rx: 0, ry: i === 0 ? 0.2 : -0.2, rz: 0, s: 1 };
  },
  // 4 — a esteira: a producao passando pela camera
  (i) => ({
    x: (i % 2 === 0 ? -1 : 1) * 2.4,
    y: 0,
    z: 4 - i * 2.1,
    rx: 0,
    ry: (i % 2 === 0 ? 1 : -1) * 0.42,
    rz: 0,
    s: 1,
  }),
  // 5 — o final: uma peca so, de frente, acesa
  (i) => (i > 0 ? OCULTO : { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1.25 }),
];

/** Camera em cada ato: onde ela esta e para onde olha. */
const CAMERAS: Array<{ pos: [number, number, number]; alvo: [number, number, number] }> = [
  { pos: [0, 7.6, 3.2], alvo: [0, 0, 0] },
  { pos: [0, 5.4, 4.6], alvo: [0, 0, 0] },
  { pos: [0, 0, 10.5], alvo: [0, 0, 0] },
  { pos: [0, 0, 7.4], alvo: [0, 0, 0] },
  { pos: [0, 1.1, 6.2], alvo: [0, 0, -7] },
  { pos: [0, 0, 5.0], alvo: [0, 0, 0] },
];

function misturarPose(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    x: m(a.x, b.x), y: m(a.y, b.y), z: m(a.z, b.z),
    rx: m(a.rx, b.rx), ry: m(a.ry, b.ry), rz: m(a.rz, b.rz),
    s: m(a.s, b.s),
  };
}

/**
 * A face da placa, desenhada em canvas.
 *
 * Um retangulo escuro com uma barra de acento e linhas de composicao — a
 * anatomia de uma arte esportiva sem ser nenhuma arte especifica. Textura
 * procedural em vez de arquivo: nao ha imagem real para carregar, e nao ha o
 * que baixar.
 */
function faceDaPlaca(indice: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const g = c.getContext("2d")!;

  const fundo = g.createLinearGradient(0, 0, 512, 640);
  fundo.addColorStop(0, "#14161a");
  fundo.addColorStop(1, "#0b0c0e");
  g.fillStyle = fundo;
  g.fillRect(0, 0, 512, 640);

  // barra de acento: onde o nome do atleta vive nas artes reais
  g.fillStyle = "#2e7cff";
  g.globalAlpha = 0.9;
  g.fillRect(48, 470, 150 + ((indice * 37) % 120), 16);
  g.globalAlpha = 0.28;
  g.fillRect(48, 508, 96 + ((indice * 23) % 80), 9);
  g.globalAlpha = 0.14;
  g.fillRect(48, 530, 190 + ((indice * 17) % 60), 9);

  // moldura interna: a margem de diagramacao
  g.globalAlpha = 0.1;
  g.strokeStyle = "#8fb4ff";
  g.lineWidth = 2;
  g.strokeRect(30, 30, 452, 580);
  g.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Cena({ progresso }: { progresso: React.RefObject<number> }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fraco = window.innerWidth < 720;

    const cena = new THREE.Scene();
    /* Nevoa: e o que da profundidade cinematografica. Sem ela a esteira vira
       uma fila de retangulos flutuando no vazio. */
    cena.fog = new THREE.FogExp2(0x0a0b0d, 0.055);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    const render = new THREE.WebGLRenderer({ antialias: !fraco, alpha: true, powerPreference: "high-performance" });
    render.setPixelRatio(Math.min(window.devicePixelRatio, fraco ? 1.5 : 2));
    render.toneMapping = THREE.ACESFilmicToneMapping;
    render.toneMappingExposure = 1.05;
    alvo.appendChild(render.domElement);

    cena.add(new THREE.AmbientLight(0xffffff, 0.3));

    const chave = new THREE.DirectionalLight(0xffffff, 1.7);
    chave.position.set(-4, 8, 5);
    cena.add(chave);

    const recorte = new THREE.PointLight(AZUL, 40, 26);
    cena.add(recorte);

    const preenche = new THREE.PointLight(0x9ec3ff, 12, 20);
    preenche.position.set(-5, -2, 4);
    cena.add(preenche);

    /* Campo de poeira: partículas lentas dando volume ao ar. É o que faz a
       câmera parecer estar DENTRO de um lugar, não olhando para um vazio. */
    const poeiraGeo = new THREE.BufferGeometry();
    const qtd = fraco ? 260 : 700;
    const pos = new Float32Array(qtd * 3);
    for (let i = 0; i < qtd; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    poeiraGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const poeira = new THREE.Points(
      poeiraGeo,
      new THREE.PointsMaterial({ color: 0x6f9dff, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    cena.add(poeira);

    /* Grade de chão: só existe no primeiro ato (a mesa) e some depois. */
    const grade = new THREE.GridHelper(60, 60, 0x1d2026, 0x131519);
    grade.position.y = -0.42;
    (grade.material as THREE.Material).transparent = true;
    cena.add(grade);

    const geoPlaca = new THREE.BoxGeometry(2.16, 0.05, 2.7);
    const geoAresta = new THREE.EdgesGeometry(geoPlaca);
    const texturas: THREE.CanvasTexture[] = [];

    const placas = Array.from({ length: N }, (_, i) => {
      const grupo = new THREE.Group();
      const tex = faceDaPlaca(i);
      texturas.push(tex);

      const corpo = new THREE.Mesh(
        geoPlaca,
        new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.45, metalness: 0.3 }),
      );
      grupo.add(corpo);

      /* A face vai numa placa fina por cima do topo: o BoxGeometry aplica a
         mesma textura nos seis lados, o que deitaria a arte na lateral. */
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(2.16, 2.7),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.026;
      grupo.add(face);

      const aresta = new THREE.LineSegments(
        geoAresta,
        new THREE.LineBasicMaterial({ color: AZUL, transparent: true, opacity: 0.7 }),
      );
      grupo.add(aresta);

      cena.add(grupo);
      return { grupo, aresta, face: face.material as THREE.MeshBasicMaterial };
    });

    /* Bloom: a assinatura cinematográfica. Sem ele as arestas azuis são só
       linhas; com ele viram luz, e a cena ganha o brilho de tela de cinema. */
    const compositor = new EffectComposer(render);
    compositor.addPass(new RenderPass(cena, camera));
    const brilho = new UnrealBloomPass(new THREE.Vector2(1, 1), fraco ? 0.5 : 0.85, 0.7, 0.2);
    compositor.addPass(brilho);
    compositor.addPass(new OutputPass());

    const alvoCam = new THREE.Vector3();

    function medir() {
      const l = alvo!.clientWidth;
      const a = alvo!.clientHeight;
      if (l === 0 || a === 0) return; // aba oculta: não gravar 0 e travar o canvas
      camera.aspect = l / a;
      camera.updateProjectionMatrix();
      render.setSize(l, a);
      compositor.setSize(l, a);
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);

    let vivo = true;
    let quadro = 0;

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);

      const bruto = Math.min(Math.max(progresso.current ?? 0, 0), 1);
      const p = parado ? 0.999 : bruto;
      const t = parado ? 0 : performance.now() * 0.00035;
      const largura = alvo!.clientWidth;

      // seis atos em cinco transições ao longo do scroll da página inteira
      const escala = p * (ATOS.length - 1);
      const ato = Math.min(Math.floor(escala), ATOS.length - 2);
      const dentro = suave(escala - ato);

      placas.forEach(({ grupo, aresta, face }, i) => {
        const a = ATOS[ato](i, largura);
        const b = ATOS[ato + 1](i, largura);
        const pose = misturarPose(a, b, dentro);

        // respiração: some conforme a placa se aproxima do estado final
        const respira = Math.sin(t * 2 + i * 1.7) * 0.05 * (1 - dentro);

        grupo.position.set(pose.x, pose.y + respira, pose.z);
        grupo.rotation.set(pose.rx, pose.ry, pose.rz);
        grupo.scale.setScalar(pose.s);
        grupo.visible = pose.s > 0.001;

        aresta.material.opacity = 0.7 * Math.min(pose.s, 1);
        face.opacity = Math.min(pose.s, 1);
        face.transparent = true;
      });

      // a câmera percorre o mesmo caminho, no mesmo compasso
      const ca = CAMERAS[ato];
      const cb = CAMERAS[ato + 1];
      camera.position.set(
        ca.pos[0] + (cb.pos[0] - ca.pos[0]) * dentro,
        ca.pos[1] + (cb.pos[1] - ca.pos[1]) * dentro,
        ca.pos[2] + (cb.pos[2] - ca.pos[2]) * dentro,
      );
      alvoCam.set(
        ca.alvo[0] + (cb.alvo[0] - ca.alvo[0]) * dentro,
        ca.alvo[1] + (cb.alvo[1] - ca.alvo[1]) * dentro,
        ca.alvo[2] + (cb.alvo[2] - ca.alvo[2]) * dentro,
      );
      camera.lookAt(alvoCam);
      // deriva lenta: a câmera nunca fica parada, como câmera na mão
      camera.position.x += Math.sin(t * 0.9) * 0.16;
      camera.position.y += Math.cos(t * 0.7) * 0.1;

      // a luz de recorte acompanha a ação e acende no fechamento
      recorte.position.set(Math.sin(t * 1.4) * 5, 2.6, 3.4);
      recorte.intensity = 40 + faixa(p, 0.8, 1) * 70;

      // a grade pertence à mesa: some quando a câmera levanta
      const g = grade.material as THREE.Material;
      g.opacity = 1 - faixa(p, 0.12, 0.3);
      grade.visible = g.opacity > 0.01;

      poeira.rotation.y = t * 0.4;

      compositor.render();
    }
    laco();

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      render.domElement.remove();
      compositor.dispose();
      render.dispose();
      geoPlaca.dispose();
      geoAresta.dispose();
      poeiraGeo.dispose();
      texturas.forEach((t) => t.dispose());
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Points) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    };
  }, [progresso]);

  return <div ref={caixa} aria-hidden className="fixed inset-0 z-0" />;
}
