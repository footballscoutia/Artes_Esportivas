"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { TIPOS, TIPO_META } from "@/lib/types";

/**
 * A previa do painel — a interface do produto, encenada.
 *
 * Nao e captura de tela: e a propria interface reconstruida em HTML, o que
 * deixa ela nitida em qualquer resolucao, animavel, e viva quando o app mudar.
 * E e a prova honesta que faltava na pagina: nao ha arte real para exibir
 * enquanto IMAGE_PROVIDER=mock, mas a INTERFACE e nossa e existe de verdade.
 *
 * O laco mostra o caminho completo de um post: escolher a categoria, escolher
 * o atleta, gerar. A arte que aparece no fim e esquematica de proposito —
 * blocos de cor no lugar do retrato e do nome — porque desenhar uma arte
 * plausivel aqui seria prometer um resultado especifico que ninguem viu.
 */

/** As quatro primeiras categorias cabem na grade da previa. */
const CATEGORIAS = TIPOS.slice(0, 4);

const ETAPAS = ["Buscando o estilo", "Enviando ao modelo", "Desenhando em alta", "Corte e logo"];

export function Painel() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const contexto = gsap.context(() => {
      const linha = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power2.out" } });

      // 1. a categoria acende
      linha.to("[data-cat='0']", { borderColor: "var(--color-accent)", backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)", duration: 0.4 }, 0.3);
      linha.to("[data-passo='0']", { color: "var(--color-muted)", duration: 0.3 }, 0.5);
      linha.to("[data-passo='1']", { color: "var(--color-text)", duration: 0.3 }, 0.5);

      // 2. o atleta acende
      linha.to("[data-atleta='2']", { borderColor: "var(--color-accent)", duration: 0.4 }, 1.1);
      linha.to("[data-passo='1']", { color: "var(--color-muted)", duration: 0.3 }, 1.5);
      linha.to("[data-passo='2']", { color: "var(--color-text)", duration: 0.3 }, 1.5);

      // 3. o botao e pressionado
      linha.to("[data-gerar]", { scale: 0.96, duration: 0.12 }, 2.0);
      linha.to("[data-gerar]", { scale: 1, duration: 0.22 }, 2.12);

      // 4. a geracao corre, etapa por etapa
      linha.set("[data-vazio]", { display: "none" }, 2.3);
      linha.set("[data-gerando]", { display: "flex" }, 2.3);
      linha.fromTo("[data-barra]", { scaleX: 0 }, { scaleX: 1, duration: 2.6, ease: "none" }, 2.3);
      ETAPAS.forEach((_, i) => {
        linha.set("[data-etapa]", { textContent: ETAPAS[i] }, 2.3 + i * 0.65);
      });

      // 5. a arte aparece
      linha.set("[data-gerando]", { display: "none" }, 5.0);
      linha.set("[data-pronto]", { display: "flex" }, 5.0);
      linha.fromTo("[data-pronto]", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 5.0);

      // 6. tudo volta ao comeco
      linha.to("[data-cat='0']", { borderColor: "var(--color-line)", backgroundColor: "transparent", duration: 0.4 }, 7.4);
      linha.to("[data-atleta='2']", { borderColor: "var(--color-line)", duration: 0.4 }, 7.4);
      linha.to("[data-passo='2']", { color: "var(--color-muted)", duration: 0.3 }, 7.4);
      linha.to("[data-passo='0']", { color: "var(--color-text)", duration: 0.3 }, 7.4);
      linha.set("[data-pronto]", { display: "none" }, 7.9);
      linha.set("[data-vazio]", { display: "flex" }, 7.9);
    }, raiz);

    return () => contexto.revert();
  }, []);

  return (
    <div
      ref={raiz}
      aria-hidden
      className="surface overflow-hidden rounded-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
    >
      {/* barra do app */}
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className="display text-[11px] leading-none tracking-[0.01em]">
          MATCH<span className="ml-px inline-block -skew-x-[9deg] bg-accent px-1 pt-px text-[#050608]">
            <span className="inline-block skew-x-[9deg]">POST</span>
          </span>
        </span>
        <span className="ml-3 flex gap-1">
          <span className="rounded-full px-2 py-1 text-[9px] text-muted-2">Biblioteca</span>
          <span className="rounded-full bg-surface-3 px-2 py-1 text-[9px]">Nova arte</span>
          <span className="rounded-full px-2 py-1 text-[9px] text-muted-2">Elenco</span>
        </span>
        <span className="ml-auto size-4 rounded-full border border-line bg-surface-2" />
      </div>

      <div className="grid gap-3 p-3.5 sm:grid-cols-[1.35fr_1fr]">
        {/* coluna do formulário */}
        <div className="min-w-0">
          <div className="mb-2.5 flex gap-3 text-[9px]">
            {["Tipo do post", "Formato e atleta", "Textos"].map((p, i) => (
              <span key={p} data-passo={i} className={i === 0 ? "text-text" : "text-muted"}>
                {p}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIAS.map((t, i) => (
              <div
                key={t}
                data-cat={i}
                className="rounded-[7px] border border-line px-2 py-1.5"
              >
                <span className="block text-[10px] font-medium leading-tight">{TIPO_META[t].titulo}</span>
                <span className="mt-0.5 block truncate text-[8px] leading-tight text-muted-2">
                  {TIPO_META[t].descricao}
                </span>
              </div>
            ))}
          </div>

          <p className="mb-1.5 mt-3 text-[9px] text-muted">Atleta</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} data-atleta={i} className="overflow-hidden rounded-[6px] border border-line">
                {/* vulto no lugar do retrato: o produto nunca inventa atleta */}
                <div
                  className="aspect-[4/5] w-full"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 50% 118%, color-mix(in srgb, var(--color-accent) 22%, transparent), var(--color-surface-2) 68%)",
                  }}
                />
              </div>
            ))}
          </div>

          <div
            data-gerar
            className="mt-3 grid h-7 place-items-center rounded-full bg-accent text-[10px] font-medium text-accent-texto"
          >
            Gerar arte
          </div>
        </div>

        {/* painel do resultado */}
        <div className="flex min-h-0 flex-col justify-center rounded-[9px] border border-line bg-bg-2/60 p-2.5">
          <span className="mb-2 text-[9px] text-muted">Resultado</span>

          {/*
            `flex-1` e proporcao 4:5 juntos brigavam: o `flex-1` mandava a caixa
            crescer, a proporcao mandava ela ficar alta na mesma medida, e o
            resultado esticava o painel inteiro — sobrava um vazio embaixo da
            coluna da esquerda e nada centralizava. Agora a proporcao manda, com
            teto de altura: 4:5 continua verdadeiro (e o formato feed real) e a
            caixa para de puxar o layout.
          */}
          <div
            className="relative mx-auto grid aspect-[4/5] max-h-[260px] w-full place-items-center overflow-hidden rounded-[6px] bg-bg-2"
          >
            <div data-vazio className="flex flex-col items-center gap-1 px-3 text-center">
              <span className="text-[9px] text-muted-2">Escolha a categoria</span>
            </div>

            <div data-gerando className="hidden w-full flex-col items-center gap-2 px-3">
              <span className="size-6 rounded-full border-2 border-accent/30 border-t-accent" />
              <span data-etapa className="text-[8px] text-muted">
                Buscando o estilo
              </span>
              <span className="h-0.5 w-full overflow-hidden rounded-full bg-surface-3">
                <span data-barra className="block h-full w-full origin-left bg-accent" />
              </span>
            </div>

            {/* a arte pronta, esquemática: blocos no lugar do retrato e do nome */}
            <div data-pronto className="hidden h-full w-full flex-col justify-end p-2.5"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 34%, #0b0d10) 0%, #0b0d10 62%)",
              }}
            >
              <span className="mb-1 block h-1 w-6 rounded-full bg-accent" />
              <span className="mb-1 block h-2 w-4/5 rounded-[2px] bg-white/55" />
              <span className="block h-1.5 w-1/2 rounded-[2px] bg-white/30" />
              <span className="mt-2 flex justify-end">
                <span className="display text-[7px] leading-none opacity-80">
                  MATCH<span className="ml-px inline-block -skew-x-[9deg] bg-accent px-0.5 text-[#050608]">
                    <span className="inline-block skew-x-[9deg]">POST</span>
                  </span>
                </span>
              </span>
            </div>
          </div>

          <div className="mt-2 flex gap-1">
            <span className="rounded-full border border-line px-1.5 py-0.5 text-[8px] text-muted-2">Feed 4:5</span>
            <span className="rounded-full border border-line px-1.5 py-0.5 text-[8px] text-muted-2">Story</span>
          </div>
        </div>
      </div>
    </div>
  );
}
