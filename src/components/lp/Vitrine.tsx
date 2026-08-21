"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextoFlutua } from "@/components/lp/TextoFlutua";
import { TIPOS, TIPO_META } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

/**
 * A vitrine — o que sai do outro lado.
 *
 * A coreografia conta o argumento: UM post aparece grande, vindo da direita;
 * ele encolhe e vai para a esquerda; e entao mais tres surgem ao lado dele. E
 * a passagem de "fiz um post" para "tenho a semana inteira pronta", que e o
 * que muda a vida de quem cuida da conta de um atleta.
 *
 * As artes sao ESQUEMATICAS de proposito: campo de cor, barra de etiqueta e
 * blocos no lugar do nome. Nao ha arte real enquanto IMAGE_PROVIDER=mock, e o
 * acervo atual veio do Pinterest — desenhar aqui uma arte plausivel seria
 * prometer um resultado especifico que ninguem viu.
 */

/** As quatro categorias que a vitrine mostra, com o tom de cada uma. */
const CARTOES = [
  { tipo: TIPOS[0], cor: "#1d4ed8", inclina: -4 },
  { tipo: TIPOS[1], cor: "#0f766e", inclina: 3 },
  { tipo: TIPOS[2], cor: "#b91c1c", inclina: -3 },
  { tipo: TIPOS[3], cor: "#6d28d9", inclina: 4 },
] as const;

function Arte({ cor, rotulo, largo }: { cor: string; rotulo: string; largo?: boolean }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[14px] border border-white/10"
      style={{ background: `linear-gradient(165deg, ${cor} 0%, #0b0d10 58%, #08090b 100%)` }}
    >
      {/* vulto no lugar do atleta: o produto nunca inventa um rosto */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/4"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 108%, rgba(255,255,255,0.16), transparent 70%)",
        }}
      />
      <div className={`absolute inset-x-0 bottom-0 ${largo ? "p-6" : "p-4"}`}>
        <span
          className="mb-2 block rounded-full"
          style={{ background: cor, height: largo ? 5 : 4, width: largo ? 74 : 52 }}
        />
        <span className={`block font-medium text-white/85 ${largo ? "text-[15px]" : "text-[11px]"}`}>
          {rotulo}
        </span>
        <span
          className="mt-2 block rounded-[2px] bg-white/35"
          style={{ height: largo ? 9 : 6, width: largo ? "62%" : "70%" }}
        />
        <span
          className="mt-1.5 block rounded-[2px] bg-white/18"
          style={{ height: largo ? 7 : 5, width: largo ? "40%" : "48%" }}
        />
      </div>
    </div>
  );
}

export function Vitrine() {
  const secao = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const contexto = gsap.context(() => {
      if (parado) {
        // sem movimento: tudo já no lugar final, nada entra nem sai
        gsap.set("[data-tres] > *", { opacity: 1, xPercent: 0, scale: 1 });
        return;
      }

      /**
       * Uma linha do tempo unica, presa a GRADE dos cartoes.
       *
       * Unica porque as tres etapas — chegar, encolher e ceder o lugar, os
       * outros aparecerem — precisam acontecer NA ORDEM e no compasso de quem
       * rola; tres gatilhos separados comecariam cada um por conta propria.
       *
       * Presa a grade e nao a secao porque o gatilho no topo da secao disparava
       * quando o TITULO entrava, e terminava antes de os cartoes chegarem a
       * tela — eles ficam centenas de pixels abaixo. A coreografia inteira
       * corria fora do campo de visao, e quando os cartoes surgiam ja estava
       * tudo no lugar final: parecia que nada tinha animado.
       */
      const linha = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-grade]",
          start: "top 92%",
          end: "top 28%",
          scrub: 0.9,
        },
      });

      // 1. o primeiro chega da direita, grande e sozinho
      linha.fromTo(
        "[data-heroi-card]",
        { xPercent: 78, opacity: 0, rotateY: -22, scale: 1.16 },
        { xPercent: 0, opacity: 1, rotateY: 0, scale: 1.16, ease: "power2.out", duration: 1 },
      );

      // 2. ele encolhe e cede o lugar
      linha.to("[data-heroi-card]", { scale: 1, ease: "power2.inOut", duration: 0.7 }, ">-0.1");

      // 3. os outros tres entram, um atrás do outro
      linha.fromTo(
        "[data-tres] > *",
        { opacity: 0, xPercent: 30, scale: 0.9 },
        {
          opacity: 1,
          xPercent: 0,
          scale: 1,
          ease: "power2.out",
          duration: 0.8,
          stagger: 0.18,
        },
        ">-0.35",
      );
    }, el);

    return () => contexto.revert();
  }, []);

  /**
   * Inclinacao que segue o cursor.
   *
   * Vive num efeito proprio, e nao num `ref` callback: o callback roda a cada
   * render, obrigava um `dataset` de guarda para nao empilhar listener, e nao
   * tinha limpeza. Aqui um efeito so liga tudo e desliga tudo.
   *
   * O cartao inclina para longe do cursor e sobe um pouco — a leitura de placa
   * fisica sob a mao. `overwrite: "auto"` importa: a linha do tempo do scroll
   * mexe em `scale` e `x` nos mesmos elementos, e sem isso as duas animacoes
   * disputariam a mesma propriedade.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cartoes = Array.from(
      secao.current?.querySelectorAll<HTMLElement>("[data-cartao]") ?? [],
    );

    const limpezas = cartoes.map((el) => {
      const mover = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, {
          rotationY: px * 18,
          rotationX: -py * 18,
          y: -10,
          duration: 0.5,
          ease: "power3",
          overwrite: "auto",
        });
      };
      const sair = () => {
        gsap.to(el, {
          rotationX: 0,
          rotationY: 0,
          y: 0,
          duration: 0.6,
          ease: "power3",
          overwrite: "auto",
        });
      };

      el.addEventListener("pointermove", mover);
      el.addEventListener("pointerleave", sair);
      return () => {
        el.removeEventListener("pointermove", mover);
        el.removeEventListener("pointerleave", sair);
      };
    });

    return () => limpezas.forEach((f) => f());
  }, []);

  return (
    <section ref={secao} className="relative z-10 px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-[1400px]">
        <TextoFlutua
          className="display mx-auto max-w-[26ch] text-center tracking-[-0.03em]"
          classeTexto="text-[clamp(1.9rem,5.2vw,3.6rem)] leading-[1.06]"
          escalonamento={0.022}
        >
          Um post vira a semana inteira.
        </TextoFlutua>

        <p className="mx-auto mt-6 max-w-[54ch] text-center text-[15px] leading-relaxed text-muted">
          Cada categoria já sai no formato certo e no padrão da sua marca. O que era uma tarde de
          trabalho por post vira uma tarde por mês.
        </p>

        {/* perspectiva no pai: sem ela o rotateY dos cartões vira só um achatamento */}
        {/* separa em duas colunas ja no `md`: em `lg`, telas de trabalho comuns
            caiam na versao empilhada e a coreografia perdia o sentido — o card
            grande nao tem para onde "ir para a esquerda" numa coluna so */}
        <div
          data-grade
          className="mt-16 grid items-center gap-6 md:grid-cols-[1.15fr_1.6fr] md:gap-8 lg:gap-10"
          style={{ perspective: "1400px" }}
        >
          <div
            data-heroi-card
            data-cartao

            className="mx-auto w-full max-w-[290px] md:mx-0"
            style={{ aspectRatio: "4 / 5", transformStyle: "preserve-3d" }}
          >
            <Arte cor={CARTOES[0].cor} rotulo={TIPO_META[CARTOES[0].tipo].titulo} largo />
          </div>

          <div data-tres className="grid grid-cols-3 gap-4 lg:gap-6">
            {CARTOES.slice(1).map((c) => (
              <div
                key={c.tipo}
                data-cartao

                style={{ aspectRatio: "4 / 5", transformStyle: "preserve-3d" }}
              >
                <Arte cor={c.cor} rotulo={TIPO_META[c.tipo].titulo} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
