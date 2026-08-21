"use client";

/**
 * THESIS: uma pagina curta e direta, que existe para levar ao cadastro. Recusa
 * a LP longa de seis secoes que a versao anterior tinha — sem arte real para
 * mostrar (IMAGE_PROVIDER=mock, e o acervo veio do Pinterest), pagina comprida
 * nao fica cheia, fica vazia. Curta e direta parece escolha; longa e oca parece
 * falta.
 * OWN-WORLD: campo de luz azul escorrendo sobre quase-preto, Anton nos titulos,
 * texto revelado por mascara, nenhum objeto solido.
 * STORY: o visitante entende em uma tela o que a ferramenta faz e cria a conta.
 * FIRST VIEWPORT: titulo em Anton revelado linha a linha sobre o campo de luz,
 * subtitulo, acao primaria. Nada mais.
 * FORM: fundo em shader, escolhido pelo usuario depois de ver a narrativa 3D.
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
import { Fundo } from "@/components/lp/Fundo";

gsap.registerPlugin(ScrollTrigger);

/**
 * Uma linha de titulo que sobe por tras de uma mascara.
 *
 * O overflow-hidden no pai e o que faz a letra APARECER de dentro do papel em
 * vez de so mudar de opacidade. Sem JS a linha fica no lugar, visivel: quem
 * aplica a posicao inicial e o GSAP, em tempo de execucao.
 */
function Linha({ children }: { children: React.ReactNode }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span data-linha className="block">
        {children}
      </span>
    </span>
  );
}

function Cadastrar({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/login?criar=1"
      className={`inline-flex h-12 items-center rounded-full bg-accent px-7 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte ${className}`}
    >
      Criar conta
    </Link>
  );
}

export function Landing() {
  const pagina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const suave = new Lenis({ duration: 1.1, smoothWheel: true });
    suave.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => {
      suave.raf(t * 1000);
      ScrollTrigger.update();
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const contexto = gsap.context(() => {
      /* A abertura e o unico momento coreografado: as linhas do titulo sobem
         em cascata. Numa pagina desta altura, mais que isso seria enfeite. */
      gsap.from("[data-heroi] [data-linha]", {
        yPercent: 108,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.09,
      });
      gsap.from("[data-abre]", {
        opacity: 0,
        y: 16,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.1,
        delay: 0.4,
      });

      /* `from` aplica o estado inicial em tempo de execucao: sem JS o conteudo
         continua visivel, que e o lado certo de errar. */
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
      <Fundo />

      {/* véu de leitura: lâmina uniforme, porque texto sobre luz precisa de chão */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5]"
        style={{ background: "color-mix(in srgb, var(--color-bg) 52%, transparent)" }}
      />

      <div className="relative z-10">
        <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 lg:px-10">
          <Marca className="text-[17px]" />
          <Link
            href="/login"
            className="rounded-full border border-line bg-bg/30 px-4 py-2 text-[13px] text-muted backdrop-blur-md transition-colors hover:border-line-2 hover:text-text"
          >
            Entrar
          </Link>
        </header>

        {/* ---- abertura ---- */}
        <section className="flex min-h-dvh items-center px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1100px]">
            <h1
              data-heroi
              className="display max-w-[14ch] text-[clamp(2.7rem,8vw,6rem)] leading-[0.92] tracking-[-0.032em]"
            >
              <Linha>Escolha o atleta.</Linha>
              <Linha>O post sai pronto.</Linha>
            </h1>
            <p data-abre className="mt-7 max-w-[54ch] text-[16px] leading-relaxed text-muted">
              O MatchPost gera as artes promocionais do seu elenco no padrão da sua marca. Você
              cadastra o elenco uma vez; depois é escolher a categoria e o atleta. Não se escreve
              prompt nenhum.
            </p>
            <div data-abre className="mt-9 flex flex-wrap items-center gap-5">
              <Cadastrar />
              <span className="text-[13px] text-muted-2">Oito categorias, feed e story</span>
            </div>
          </div>
        </section>

        {/* ---- cadastro ---- */}
        <section className="flex min-h-[70vh] items-center px-6 pb-24 lg:px-10">
          {/* `w-full` importa: sem ele, dentro do flex o `mx-auto` centra a
              caixa pelo conteudo e o titulo desalinha do heroi. */}
          <div data-entra className="mx-auto w-full max-w-[1100px]">
            <h2 className="display max-w-[15ch] text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.028em]">
              Cadastre a sua agência e gere a primeira.
            </h2>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Cadastrar />
              <span className="text-[13px] text-muted-2">Leva um minuto</span>
            </div>
          </div>
        </section>

        <footer className="border-t border-line bg-bg/50 px-6 py-9 backdrop-blur-md lg:px-10">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4">
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
