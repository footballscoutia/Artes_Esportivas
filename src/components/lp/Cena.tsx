"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * A cena — uma camera so, seis atos, e cada ato mostra algo que o produto
 * REALMENTE faz.
 *
 *   0 materiais  tres formas DIFERENTES: retrato, escudo, marca
 *   1 fusao      o escudo afunda na arte e a cor dele inunda a peca
 *   2 categorias a peca se multiplica em oito, num arco em volta da camera
 *   3 formatos   a MESMA peca muda de proporcao: 4:5 vira 9:16
 *   4 esteira    a producao passando pela camera
 *   5 final      uma peca so, acesa, a camera entrando nela
 *
 * A versao anterior errou aqui: eram tres retangulos identicos em angulo
 * rasante, e nada dizia qual era qual. Forma so comunica quando as formas se
 * distinguem — o escudo agora e um escudo, o retrato e vertical, a marca e uma
 * barra. E a camera olha de frente, senao a face nao aparece.
 *
 * As pecas continuam sendo DIAGRAMA, nunca foto falsa de atleta nem escudo de
 * clube real: nao ha arte real enquanto IMAGE_PROVIDER=mock.
 */

const AZUL = new THREE.Color(0x2e7cff);
const N = 12;

const RAZAO_FEED = 1350 / 1080; // 1.25
const RAZAO_STORY = 1920 / 1080; // 1.78

function faixa(p: number, a: number, b: number) {
  return Math.min(Math.max((p - a) / (b - a), 0), 1);
}
function suave(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function mist(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Pose = {
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  s: number;
  /** altura/largura da peca. 1.25 = feed, 1.78 = story. */
  razao: number;
};

const NADA: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 0, razao: RAZAO_FEED };
const p = (o: Partial<Pose>): Pose => ({ ...NADA, s: 1, ...o });

/** Onde cada PECA (a arte) fica em cada ato. */
const ATOS_PECA: Array<(i: number, largura: number) => Pose> = [
  // 0 — os materiais: a arte e o objeto principal, e o escudo e a marca sao
  //     ingredientes flutuando na frente dela. A hierarquia de tamanho e o que
  //     diz quem e o assunto.
  (i) => (i === 0 ? p({ x: 0.55, y: 0, ry: -0.12 }) : NADA),
  // 1 — a fusao: a peca vem ao centro e recebe tudo
  (i) => (i === 0 ? p({ x: 0, y: 0, ry: 0 }) : NADA),
  // 2 — as categorias: oito pecas num arco raso em volta da camera
  (i, largura) => {
    if (i > 7) return NADA;
    const t = (i - 3.5) / 3.5; // -1 .. 1
    const abertura = largura < 720 ? 3.4 : 5.2;
    return p({
      x: t * abertura,
      y: 0,
      z: -Math.abs(t) * 2.6,
      ry: -t * 0.42,
      s: 0.78,
    });
  },
  // 3 — os formatos: duas pecas, MESMA largura, alturas diferentes
  (i, largura) => {
    const d = largura < 720 ? 1.55 : 2.15;
    if (i === 0) return p({ x: -d, razao: RAZAO_FEED, s: 0.92, ry: 0.16 });
    if (i === 1) return p({ x: d, razao: RAZAO_STORY, s: 0.92, ry: -0.16 });
    return NADA;
  },
  // 4 — a esteira: a producao descendo o corredor
  (i) => p({
    x: (i % 2 === 0 ? -1 : 1) * 2.5,
    y: 0,
    z: 3.5 - i * 2.2,
    ry: (i % 2 === 0 ? 1 : -1) * 0.5,
    razao: i % 3 === 0 ? RAZAO_STORY : RAZAO_FEED,
  }),
  /* 5 — a consistencia: a mesma grade, alinhada, todas iguais. E o argumento
     contra "pedir a um chat" dito em forma: num chat cada pedido volta
     diferente; aqui a parede inteira bate. */
  (i, largura) => {
    const cols = largura < 720 ? 2 : 4;
    const col = i % cols;
    const lin = Math.floor(i / cols);
    return p({
      x: (col - (cols - 1) / 2) * (largura < 720 ? 2.35 : 2.5),
      y: (lin - 1) * -3.3,
      z: -1.5,
      s: 0.7,
    });
  },
  // 6 — o final
  (i) => (i === 0 ? p({ s: 1.35 }) : NADA),
];

/** O escudo: existe nos dois primeiros atos, depois afunda na peca. */
const ATOS_ESCUDO: Array<(largura: number) => Pose> = [
  /* Pequeno de proposito: o escudo e um ingrediente que vai DENTRO da arte,
     nao um monumento ao lado dela. Na primeira versao ele saiu do tamanho da
     peca inteira e virou o assunto da tela. */
  () => p({ x: -0.72, y: 0.82, z: 1.6, s: 0.34 }),
  () => p({ x: 0, y: 0, z: 0.1, s: 0.2 }), // afunda, pequeno, dentro da arte
  () => NADA,
  () => NADA,
  () => NADA,
  () => NADA,
  () => NADA,
];

/** A marca: barra horizontal que carimba o canto. */
const ATOS_MARCA: Array<(largura: number) => Pose> = [
  () => p({ x: -0.5, y: -1.02, z: 1.6, s: 0.42 }),
  () => p({ x: 0.6, y: -1.24, z: 0.09, s: 0.44 }), // carimba o canto inferior direito
  () => NADA,
  () => NADA,
  () => NADA,
  () => NADA,
  () => NADA,
];

const CAMERAS: Array<{ pos: [number, number, number]; alvo: [number, number, number] }> = [
  { pos: [0, 0.4, 8.2], alvo: [0, 0, 0] },   // de frente: as formas precisam ser lidas
  { pos: [0, 0.2, 6.4], alvo: [0, 0, 0] },
  { pos: [0, 0.6, 7.6], alvo: [0, 0, -1] },  // o arco abre em volta
  { pos: [0, 0, 7.0], alvo: [0, 0, 0] },
  { pos: [0, 0.9, 5.6], alvo: [0, 0, -8] },  // olhando corredor abaixo
  { pos: [0, -1.6, 9.4], alvo: [0, -1.6, 0] }, // de frente para a parede alinhada
  { pos: [0, 0, 4.3], alvo: [0, 0, 0] },     // entrando na peca
];

function misturar(a: Pose, b: Pose, t: number): Pose {
  return {
    x: mist(a.x, b.x, t), y: mist(a.y, b.y, t), z: mist(a.z, b.z, t),
    rx: mist(a.rx, b.rx, t), ry: mist(a.ry, b.ry, t), rz: mist(a.rz, b.rz, t),
    s: mist(a.s, b.s, t), razao: mist(a.razao, b.razao, t),
  };
}

/**
 * A face da arte, desenhada em canvas.
 *
 * A anatomia de uma arte esportiva — figura recortada no terco inferior, nome
 * em tipografia pesada, etiqueta acima, canto inferior direito livre para a
 * marca — sem ser nenhuma arte especifica. `corDoClube` chega no ato da fusao:
 * e o que mostra a paleta saindo do escudo.
 */
function desenharFace(indice: number, cor: string, comTexto: boolean) {
  const c = document.createElement("canvas");
  c.width = 540;
  c.height = 675;
  const g = c.getContext("2d")!;

  const fundo = g.createLinearGradient(0, 0, 0, 675);
  fundo.addColorStop(0, cor);
  fundo.addColorStop(0.55, "#0e1014");
  fundo.addColorStop(1, "#08090b");
  g.fillStyle = fundo;
  g.fillRect(0, 0, 540, 675);

  /* A silhueta do atleta: um vulto de luz, nao um desenho de pessoa. Desenhar
     uma figura seria inventar um atleta — e o produto nunca inventa atleta.
     Fraco de proposito: em 0.16 o bloom transformava isso num borrao branco. */
  const vulto = g.createRadialGradient(270, 470, 30, 270, 470, 240);
  vulto.addColorStop(0, "rgba(190,214,255,0.075)");
  vulto.addColorStop(1, "rgba(190,214,255,0)");
  g.fillStyle = vulto;
  g.fillRect(0, 240, 540, 435);

  if (comTexto) {
    // etiqueta da categoria
    g.fillStyle = cor;
    g.globalAlpha = 0.8;
    g.fillRect(52, 452, 96, 10);
    /* As barras do nome sao CINZA, nao branco. Branco puro atravessa o bloom e
       vira mancha luminosa — foi o que deixou a peca com cara de borrao. */
    g.fillStyle = "#c8ccd4";
    g.globalAlpha = 0.5;
    g.fillRect(52, 486, 230 + ((indice * 31) % 80), 20);
    g.globalAlpha = 0.3;
    g.fillRect(52, 516, 156 + ((indice * 19) % 60), 20);
    g.globalAlpha = 1;
  }

  // margem de diagramacao
  g.globalAlpha = 0.09;
  g.strokeStyle = "#a8c6ff";
  g.lineWidth = 2;
  g.strokeRect(30, 30, 480, 615);
  g.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Um escudo de verdade — a forma que qualquer torcedor reconhece de longe. */
function formaDeEscudo() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.05);
  s.lineTo(0.86, 0.66);
  s.lineTo(0.86, -0.18);
  s.quadraticCurveTo(0.86, -0.86, 0, -1.16);
  s.quadraticCurveTo(-0.86, -0.86, -0.86, -0.18);
  s.lineTo(-0.86, 0.66);
  s.closePath();
  return s;
}

export function Cena({ progresso }: { progresso: React.RefObject<number> }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fraco = window.innerWidth < 720;

    const cena = new THREE.Scene();
    cena.fog = new THREE.FogExp2(0x08090b, 0.048);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    const render = new THREE.WebGLRenderer({ antialias: !fraco, alpha: true, powerPreference: "high-performance" });
    render.setPixelRatio(Math.min(window.devicePixelRatio, fraco ? 1.5 : 2));
    render.toneMapping = THREE.ACESFilmicToneMapping;
    render.toneMappingExposure = 1.1;
    alvo.appendChild(render.domElement);

    cena.add(new THREE.AmbientLight(0xffffff, 0.42));
    const chave = new THREE.DirectionalLight(0xffffff, 1.5);
    chave.position.set(-3, 5, 7);
    cena.add(chave);
    const recorte = new THREE.PointLight(AZUL, 45, 30);
    cena.add(recorte);

    // poeira: da ar ao lugar, e o que impede a cena de parecer um vazio preto
    const poeiraGeo = new THREE.BufferGeometry();
    const qtd = fraco ? 240 : 620;
    const pos = new Float32Array(qtd * 3);
    for (let i = 0; i < qtd; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    poeiraGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const poeira = new THREE.Points(
      poeiraGeo,
      new THREE.PointsMaterial({ color: 0x7aa5ff, size: 0.04, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    cena.add(poeira);

    /**
     * O palco: tudo que e objeto entra aqui, e o grupo inteiro desliza para a
     * direita no desktop.
     *
     * Sem isto a cena nasce centrada e passa POR TRAS do texto — foi o que fez
     * o retrato colidir com "Escolha o atleta" e deixar os dois ilegiveis. A
     * poeira fica de fora: ela e ambiente e deve continuar cobrindo a tela.
     */
    const palco = new THREE.Group();
    cena.add(palco);

    const descartaveis: Array<{ dispose(): void }> = [];

    /* --- as pecas (a arte) --- */
    const geoFace = new THREE.PlaneGeometry(1, 1);
    descartaveis.push(geoFace);

    const pecas = Array.from({ length: N }, (_, i) => {
      const grupo = new THREE.Group();
      const tex = desenharFace(i, "#16243f", i < 8);
      descartaveis.push(tex);

      const face = new THREE.Mesh(
        geoFace,
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true }),
      );
      grupo.add(face);

      // contorno aceso: e o que separa a peca do fundo escuro
      const borda = new THREE.LineSegments(
        new THREE.EdgesGeometry(geoFace),
        new THREE.LineBasicMaterial({ color: AZUL, transparent: true, opacity: 0.85 }),
      );
      grupo.add(borda);

      palco.add(grupo);
      return { grupo, face, borda, mat: face.material as THREE.MeshBasicMaterial, tex };
    });

    /* --- o escudo --- */
    const geoEscudo = new THREE.ExtrudeGeometry(formaDeEscudo(), {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    descartaveis.push(geoEscudo);
    const escudo = new THREE.Mesh(
      geoEscudo,
      new THREE.MeshStandardMaterial({
        color: 0x1b3f7d,
        roughness: 0.32,
        metalness: 0.55,
        emissive: AZUL,
        emissiveIntensity: 0.35,
      }),
    );
    palco.add(escudo);

    const contornoEscudo = new THREE.LineSegments(
      new THREE.EdgesGeometry(geoEscudo),
      new THREE.LineBasicMaterial({ color: 0x9dc0ff, transparent: true, opacity: 0.9 }),
    );
    palco.add(contornoEscudo);

    /* --- a marca: a barra que carimba o canto --- */
    const grupoMarca = new THREE.Group();
    const barra = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.34, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.4, metalness: 0.3 }),
    );
    grupoMarca.add(barra);
    const barraAcesa = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.34, 0.07),
      new THREE.MeshBasicMaterial({ color: AZUL, toneMapped: false }),
    );
    barraAcesa.position.x = 0.44;
    grupoMarca.add(barraAcesa);
    palco.add(grupoMarca);

    const compositor = new EffectComposer(render);
    compositor.addPass(new RenderPass(cena, camera));
    compositor.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), fraco ? 0.45 : 0.72, 0.75, 0.25));
    compositor.addPass(new OutputPass());

    const alvoCam = new THREE.Vector3();
    /* A cor do clube inunda a arte durante a fusao. Redesenhar a textura a cada
       quadro seria caro; cinco degraus bastam para o olho ler a transicao. */
    const degraus = ["#16243f", "#18355f", "#1a4a86", "#1d5aa8", "#2064c4"];
    const cache = new Map<number, THREE.CanvasTexture>();
    let degrauAtual = -1;

    function medir() {
      const l = alvo!.clientWidth;
      const a = alvo!.clientHeight;
      if (l === 0 || a === 0) return;
      camera.aspect = l / a;
      camera.updateProjectionMatrix();
      render.setSize(l, a);
      compositor.setSize(l, a);
      /* No desktop o texto ocupa a metade esquerda: o palco sai de baixo dele.
         No celular o texto fica por cima com veu, entao a cena volta ao centro. */
      palco.position.x = l >= 1024 ? 2.6 : l >= 720 ? 1.5 : 0;
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);

    let vivo = true;
    let quadro = 0;

    function aplicar(obj: THREE.Object3D, pose: Pose, escalaBase = 1) {
      obj.position.set(pose.x, pose.y, pose.z);
      obj.rotation.set(pose.rx, pose.ry, pose.rz);
      obj.scale.setScalar(pose.s * escalaBase);
      obj.visible = pose.s > 0.001;
    }

    function laco() {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);

      const bruto = Math.min(Math.max(progresso.current ?? 0, 0), 1);
      const pr = parado ? 0.999 : bruto;
      const t = parado ? 0 : performance.now() * 0.00035;
      const largura = alvo!.clientWidth;

      const escala = pr * (ATOS_PECA.length - 1);
      const ato = Math.min(Math.floor(escala), ATOS_PECA.length - 2);
      const dentro = suave(escala - ato);

      // a cor do clube entra na arte durante o ato da fusao
      const inundacao = faixa(pr, 0.1, 0.3);
      const degrau = Math.min(degraus.length - 1, Math.floor(inundacao * degraus.length));
      if (degrau !== degrauAtual) {
        degrauAtual = degrau;
        pecas.forEach((peca, i) => {
          const chave = degrau * 100 + Math.min(i, 8);
          let tex = cache.get(chave);
          if (!tex) {
            tex = desenharFace(i, degraus[degrau], i < 8);
            cache.set(chave, tex);
          }
          peca.mat.map = tex;
          peca.mat.needsUpdate = true;
        });
      }

      pecas.forEach(({ grupo, face, borda }, i) => {
        const pose = misturar(ATOS_PECA[ato](i, largura), ATOS_PECA[ato + 1](i, largura), dentro);
        aplicar(grupo, pose);
        // a proporcao e do OBJETO, nao do grupo: e assim que 4:5 vira 9:16
        face.scale.set(2.2, 2.2 * pose.razao, 1);
        borda.scale.set(2.2, 2.2 * pose.razao, 1);
        grupo.position.y += Math.sin(t * 1.8 + i * 1.4) * 0.055 * (1 - dentro);
      });

      const poseEscudo = misturar(ATOS_ESCUDO[ato](largura), ATOS_ESCUDO[ato + 1](largura), dentro);
      aplicar(escudo, poseEscudo);
      aplicar(contornoEscudo, poseEscudo);
      escudo.rotation.y += Math.sin(t * 1.2) * 0.14;
      contornoEscudo.rotation.y = escudo.rotation.y;
      /* Emissivo baixo: com 0.35 + 1.4 o escudo virava uma chapa de luz e
         puxava toda a atencao da tela para ele. */
      (escudo.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.14 + inundacao * 0.5;

      aplicar(grupoMarca, misturar(ATOS_MARCA[ato](largura), ATOS_MARCA[ato + 1](largura), dentro));

      const ca = CAMERAS[ato];
      const cb = CAMERAS[ato + 1];
      camera.position.set(
        mist(ca.pos[0], cb.pos[0], dentro),
        mist(ca.pos[1], cb.pos[1], dentro),
        mist(ca.pos[2], cb.pos[2], dentro),
      );
      alvoCam.set(
        mist(ca.alvo[0], cb.alvo[0], dentro),
        mist(ca.alvo[1], cb.alvo[1], dentro),
        mist(ca.alvo[2], cb.alvo[2], dentro),
      );
      camera.lookAt(alvoCam);
      camera.position.x += Math.sin(t * 0.8) * 0.14;
      camera.position.y += Math.cos(t * 0.62) * 0.09;

      recorte.position.set(Math.sin(t * 1.3) * 4.5, 2.2, 4);
      recorte.intensity = 45 + faixa(pr, 0.82, 1) * 80;
      poeira.rotation.y = t * 0.35;

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
      cache.forEach((t) => t.dispose());
      descartaveis.forEach((d) => d.dispose());
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
