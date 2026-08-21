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
 * A coreografia conta o argumento: UM post chega da direita, grande e sozinho
 * no meio da tela; ele encolhe e recua para o primeiro lugar da fileira; e
 * entao os outros tres surgem ao lado dele. E a passagem de "fiz um post" para
 * "tenho a semana inteira pronta", que e o que muda a vida de quem cuida da
 * conta de um atleta.
 *
 * A secao FICA PRESA enquanto isso acontece. Sem prender, a coreografia inteira
 * cabia num tranco de scroll: a pessoa chegava e ja via o quadro montado. O pin
 * troca "rolar a pagina" por "avancar a cena" pelo tempo que a cena precisa.
 *
 * As artes sao ESQUEMATICAS de proposito: campo de cor, barra de etiqueta e
 * blocos no lugar do nome. Nao ha arte real enquanto IMAGE_PROVIDER=mock, e o
 * acervo atual veio do Pinterest — desenhar aqui uma arte plausivel seria
 * prometer um resultado especifico que ninguem viu.
 */

/** As quatro categorias que a vitrine mostra, com o tom de cada uma. */
const CARTOES = [
  { tipo: TIPOS[0], cor: "#1d4ed8" },
  { tipo: TIPOS[1], cor: "#0f766e" },
  { tipo: TIPOS[2], cor: "#b91c1c" },
  { tipo: TIPOS[3], cor: "#6d28d9" },
] as const;

function Arte({ cor, rotulo }: { cor: string; rotulo: string }) {
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
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span className="mb-2 block h-1 w-[52px] rounded-full" style={{ background: cor }} />
        <span className="block text-[11px] font-medium text-white/85">{rotulo}</span>
        <span className="mt-2 block h-1.5 w-[70%] rounded-[2px] bg-white/35" />
        <span className="mt-1.5 block h-1 w-[48%] rounded-[2px] bg-white/[0.18]" />
      </div>
    </div>
  );
}

export function Vitrine() {
  const secao = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;

    const grade = el.querySelector<HTMLElement>("[data-grade]");
    const heroi = el.querySelector<HTMLElement>("[data-heroi]");
    if (!grade || !heroi) return;

    /**
     * Onde o primeiro cartao precisa ir para ficar no MEIO da fileira.
     *
     * Medido por `offsetLeft`/`offsetWidth`, e nao por `getBoundingClientRect`:
     * o rect ja vem com a transformacao aplicada, entao durante a animacao ele
     * devolveria a posicao do frame anterior e a conta se realimentaria. As
     * medidas de layout ignoram transform, que e exatamente o que se quer aqui.
     * `[data-grade]` e `relative` para que `offsetLeft` do cartao seja medido a
     * partir dela.
     */
    const centro = () => grade.offsetWidth / 2 - (heroi.offsetLeft + heroi.offsetWidth / 2);
    /* o cartao solitario ocupa ~34% da fileira. Os dois tetos existem porque a
       secao esta presa e tem `overflow: hidden`: o que passar da tela nao rola
       para aparecer depois, e cortado. O segundo mede pela ALTURA da janela —
       em monitor largo e baixo e ela, nao a largura, que manda. */
    const aumento = () =>
      Math.min(
        1.55,
        (grade.offsetWidth * 0.34) / heroi.offsetWidth,
        (window.innerHeight * 0.55) / heroi.offsetHeight,
      );

    const mm = gsap.matchMedia(el);

    mm.add(
      {
        amplo: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        simples: "(max-width: 767px), (prefers-reduced-motion: reduce)",
      },
      (contexto) => {
        const { amplo } = contexto.conditions as { amplo: boolean };

        /* estreito ou com movimento reduzido: a coreografia lateral nao cabe e
           nao faz sentido empilhada. Os cartoes so aparecem, em ordem. */
        if (!amplo) {
          gsap.from("[data-cartao]", {
            opacity: 0,
            y: 24,
            duration: 0.5,
            stagger: 0.09,
            scrollTrigger: { trigger: grade, start: "top 85%" },
          });
          return;
        }

        /**
         * Uma linha do tempo unica sobre a secao presa.
         *
         * Unica porque as tres etapas — chegar, recuar, os outros aparecerem —
         * precisam acontecer NA ORDEM e no compasso de quem rola; tres gatilhos
         * separados comecariam cada um por conta propria.
         *
         * `invalidateOnRefresh` faz as funcoes de medida rodarem de novo quando
         * a janela muda de tamanho: os valores dependem da largura da fileira.
         */
        const linha = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=2100",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            /* este pin tambem empurra tudo que vem depois; remedir antes deles.
               Fica abaixo da prioridade do heroi, que empurra esta secao. */
            refreshPriority: 1,
          },
        });

        // 1. o primeiro chega da direita, grande, e para no meio da tela
        linha.fromTo(
          "[data-heroi]",
          {
            x: () => centro() + grade.offsetWidth * 0.6,
            scale: () => aumento(),
            rotateY: -26,
            opacity: 0,
          },
          {
            x: () => centro(),
            scale: () => aumento(),
            rotateY: 0,
            opacity: 1,
            ease: "power3.out",
            duration: 1.1,
          },
        );

        // 2. respira: sem esta pausa ele chega e ja sai, e ninguem o ve inteiro
        linha.to({}, { duration: 0.45 });

        // 3. encolhe e recua para o primeiro lugar da fileira
        linha.to("[data-heroi]", { x: 0, scale: 1, ease: "power2.inOut", duration: 1.1 });

        // 4. os outros tres entram, um atras do outro, ja com o lugar livre
        linha.fromTo(
          "[data-extra]",
          { opacity: 0, x: () => grade.offsetWidth * 0.2, scale: 0.9 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            ease: "power2.out",
            duration: 0.9,
            stagger: 0.24,
          },
          "<0.3",
        );

        // 5. um fim de curso parado, para o quadro montado ficar na tela
        linha.to({}, { duration: 0.5 });
      },
    );

    return () => mm.revert();
  }, []);

  /**
   * Inclinacao que segue o cursor.
   *
   * Mira em `[data-inclina]`, o filho — e nao no cartao que a linha do tempo
   * anima. Os dois mexem em transform, e no mesmo elemento eles brigariam: ou o
   * cursor sobrescreveria a coreografia presa ao scroll, ou o `overwrite`
   * mataria uma das duas no meio. Em elementos aninhados, as duas
   * transformacoes simplesmente se compoem.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvos = Array.from(secao.current?.querySelectorAll<HTMLElement>("[data-inclina]") ?? []);

    const limpezas = alvos.map((el) => {
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
    <section
      ref={secao}
      className="relative z-10 flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-24 lg:px-10"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        {/*
          O tamanho da fonte vive AQUI, no elemento que tambem carrega o
          `max-w`. Estando so no span de dentro, o `26ch` era resolvido com a
          fonte herdada de 16px — dava 271px de caixa para um titulo desenhado a
          ~49px, e ele se espremia em quatro linhas. `ch` so mede certo se o
          elemento que o usa ja estiver no tamanho final.
        */}
        <TextoFlutua
          className="display mx-auto max-w-[22ch] text-center text-[clamp(1.9rem,5.2vw,3.6rem)] leading-[1.06] tracking-[-0.03em]"
          escalonamento={0.022}
        >
          Um post vira a semana inteira.
        </TextoFlutua>

        <p className="mx-auto mt-6 max-w-[54ch] text-center text-[15px] leading-relaxed text-muted">
          Cada categoria já sai no formato certo e no padrão da sua marca. O que era uma tarde de
          trabalho por post vira uma tarde por mês.
        </p>

        {/* uma fileira só, quatro colunas iguais: o cartão grande é o MESMO
            elemento, aumentado por transform, então ao encolher ele pousa exato
            no lugar que o layout já reservou — sem buraco e sem desalinhar */}
        {/* `relative` também para `offsetLeft` dos cartões ser medido daqui */}
        <div
          data-grade
          className="relative mt-14 grid grid-cols-2 gap-4 md:mt-16 md:grid-cols-4 md:gap-6"
          style={{ perspective: "1400px" }}
        >
          {CARTOES.map((c, i) => {
            const primeiro = i === 0;
            return (
              <div
                key={c.tipo}
                data-cartao
                {...(primeiro ? { "data-heroi": "" } : { "data-extra": "" })}
                /* o solitário passa por cima dos outros enquanto está grande */
                className={`relative ${primeiro ? "z-20" : "z-10"}`}
                style={{ aspectRatio: "4 / 5", transformStyle: "preserve-3d" }}
              >
                <div
                  data-inclina
                  className="h-full w-full"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Arte cor={c.cor} rotulo={TIPO_META[c.tipo].titulo} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
