"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextoFlutua } from "@/components/lp/TextoFlutua";
import { CartoesTres } from "@/components/lp/CartoesTres";
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
 * Este arquivo nao anima nada. Ele so converte scroll em um numero de 0 a 1 e
 * entrega para a cena; quem sabe coreografar cartao e a CartoesTres.
 */

/** As quatro categorias que a vitrine mostra. */
const ROTULOS = TIPOS.slice(0, 4).map((t) => TIPO_META[t].titulo);

export function Vitrine() {
  const secao = useRef<HTMLElement>(null);
  const progresso = useRef(0);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    const palco = el.querySelector<HTMLElement>("[data-palco]");
    if (!palco) return;

    const mm = gsap.matchMedia(el);

    mm.add(
      {
        amplo: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        estreito: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        semMovimento: "(prefers-reduced-motion: reduce)",
      },
      (contexto) => {
        const { amplo, estreito } = contexto.conditions as Record<string, boolean>;

        if (!amplo && !estreito) {
          // movimento reduzido: a fileira ja nasce montada
          progresso.current = 1;
          return;
        }

        /* Estreito: nao ha para onde o cartao grande "ir para a esquerda", e
           prender a tela no celular custa caro em confianca. Os quatro so
           aparecem, no compasso de quem rola. */
        if (estreito) {
          gsap.to(progresso, {
            current: 1,
            ease: "none",
            scrollTrigger: { trigger: palco, start: "top 88%", end: "top 30%", scrub: 0.6 },
          });
          return;
        }

        /**
         * `refreshPriority` porque este pin empurra tudo que vem depois: na
         * hora de remedir ele precisa vir antes dos gatilhos de baixo, senao
         * eles se medem numa pagina que ainda nao tem o espacador. Fica abaixo
         * da prioridade do heroi, que por sua vez empurra esta secao.
         */
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "+=2100",
          pin: true,
          anticipatePin: 1,
          refreshPriority: 1,
          onUpdate: (t) => {
            progresso.current = t.progress;
          },
        });
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={secao}
      className="relative z-10 flex min-h-dvh flex-col overflow-hidden px-6 py-16 lg:px-10"
    >
      {/*
        O palco toma a altura que SOBRA, em vez de ter altura propria.
        Com uma proporcao fixa a secao ficava mais alta que a tela — e, presa no
        topo, o cartao aumentado saia cortado por baixo. Aqui o titulo pega o
        que precisa e o resto e do palco, entao a cena cabe em qualquer janela.
      */}
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center">
        {/*
          O tamanho da fonte vive AQUI, no elemento que tambem carrega o
          `max-w`. Estando so no span de dentro, o `22ch` era resolvido com a
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

        {/*
          Os rotulos das categorias viraram pixel dentro do canvas, entao aqui
          eles voltam a existir como texto: buscador nao indexa textura e leitor
          de tela nao le WebGL. A cena fica `aria-hidden` para nao duplicar.
        */}
        <ul className="sr-only">
          {ROTULOS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        {/* a proporcao do palco e o que decide o arranjo la dentro: larga vira
            fileira de quatro, estreita vira 2x2. `min-h-0` porque um filho de
            flex nao encolhe abaixo do conteudo sem isso, e o palco voltaria a
            estourar a tela. */}
        <div data-palco className="mt-8 min-h-0 w-full flex-1 md:mt-10">
          <CartoesTres rotulos={ROTULOS} progresso={progresso} />
        </div>
      </div>
    </section>
  );
}
