"use client";

/**
 * THESIS: duas secoes e so. O heroi mostra o mecanismo — tres materiais se
 * fundindo numa arte — e a segunda leva ao cadastro. Recusa a LP longa: sem
 * arte real para exibir (IMAGE_PROVIDER=mock, e o acervo veio do Pinterest),
 * pagina comprida nao fica cheia, fica vazia.
 * OWN-WORLD: mesa escura vista de cima com aresta acesa em #2E7CFF no heroi,
 * campo de luz escorrendo no fechamento, Anton nos titulos.
 * STORY: o visitante ve o mecanismo acontecer, entende em uma tela, cria a
 * conta.
 * FIRST VIEWPORT: cena 3D ocupando a tela, tres placas separadas sobre a mesa;
 * titulo em Anton no terco inferior esquerdo, acao primaria abaixo dele.
 * FORM: mesa do analista, indice 7 da lista ordenada, seed 73b72703.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, DESIGN.md, and every shipping raster carrying its
 * provenance.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Marca } from "@/components/app/Marca";
import { Mesa } from "@/components/lp/Mesa";
import { Fundo } from "@/components/lp/Fundo";

gsap.registerPlugin(ScrollTrigger);

export function Landing() {
  const progresso = useRef(0);
  const palco = useRef<HTMLDivElement>(null);
  const pagina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const suave = new Lenis({ duration: 1.05, smoothWheel: true });
    suave.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => {
      suave.raf(t * 1000);
      ScrollTrigger.update();
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const contexto = gsap.context(() => {
      /**
       * O momento autoral da pagina: a fusao das tres placas, dirigida pelo
       * scroll enquanto o palco fica preso. E o unico efeito com escala aqui.
       */
      ScrollTrigger.create({
        trigger: palco.current,
        start: "top top",
        end: "+=140%",
        pin: true,
        scrub: 0.6,
        onUpdate: (t) => {
          progresso.current = t.progress;
        },
      });

      /* `from` roda em tempo de execucao, entao sem JS o conteudo continua
         visivel. Nunca esconder texto esperando animacao. */
      gsap.utils.toArray<HTMLElement>("[data-entra]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 24,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    }, pagina);

    return () => {
      contexto.revert();
      gsap.ticker.remove(tick);
      suave.destroy();
    };
  }, []);

  return (
    <div ref={pagina} className="relative text-text">
      {/* o campo de luz fica atrás de tudo; o herói o cobre com fundo opaco */}
      <Fundo />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 lg:px-10">
        <Marca className="text-[17px]" />
        <Link
          href="/login"
          className="rounded-full border border-line bg-bg/30 px-4 py-2 text-[13px] text-muted backdrop-blur-md transition-colors hover:border-line-2 hover:text-text"
        >
          Entrar
        </Link>
      </header>

      {/* ---- palco: a cena 3D e o primeiro viewport ---- */}
      <section ref={palco} className="relative z-10 h-dvh overflow-hidden bg-bg">
        <Mesa progresso={progresso} />

        {/* a luz cai de cima e morre antes da borda, como refletor sobre mesa */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(120% 70% at 50% 0%, transparent 40%, var(--color-bg) 92%)",
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-14 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-[1400px]">
            <h1 className="display max-w-[13ch] text-[clamp(2.6rem,7.4vw,5.6rem)] leading-[0.94] tracking-[-0.03em]">
              Escolha o atleta.
              <br />O post sai pronto.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted">
              O MatchPost gera as artes promocionais do seu elenco no padrão da sua marca. Você
              escolhe a categoria e o atleta — não escreve prompt nenhum.
            </p>
            <Link
              href="/login?criar=1"
              className="pointer-events-auto mt-8 inline-flex h-12 items-center rounded-full bg-accent px-7 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </section>

      {/* ---- cadastro ---- */}
      <div className="relative z-10">
        {/* véu de leitura: aqui o campo de luz aparece, e texto sobre luz precisa de chão */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "color-mix(in srgb, var(--color-bg) 52%, transparent)" }}
        />

        <section className="relative flex min-h-[78vh] items-center px-6 pb-24 lg:px-10">
          <div data-entra className="mx-auto w-full max-w-[1400px]">
            <h2 className="display max-w-[15ch] text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.028em]">
              Cadastre a sua agência e gere a primeira.
            </h2>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                href="/login?criar=1"
                className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
              >
                Criar conta
              </Link>
              <span className="text-[13px] text-muted-2">Leva um minuto</span>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-line bg-bg/50 px-6 py-9 backdrop-blur-md lg:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
            <Marca className="text-[14px]" />
            <Link href="/login" className="text-[13px] text-muted transition-colors hover:text-text">
              Já tem conta? Entrar
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
