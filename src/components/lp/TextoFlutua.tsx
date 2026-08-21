"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Texto que sobe letra a letra — porte do "Scroll Float" do React Bits.
 *
 * Cada caractere entra de baixo, esticado na vertical e comprimido na
 * horizontal, e volta ao normal enquanto sobe. Com `scrub`, quem controla o
 * tempo e o scroll: o texto se monta na velocidade em que a pessoa rola, e nao
 * numa duracao fixa.
 *
 * O `overflow: hidden` no container e o que faz as letras aparecerem de dentro
 * do papel, e nao surgirem do nada — sem ele o efeito perde metade da graca.
 *
 * ACESSIBILIDADE: o original devolve um <h2> fixo. Aqui a tag e escolhivel,
 * porque o titulo desta secao pode nao ser o segundo nivel da pagina; e o texto
 * fica num <span> continuo para o leitor de tela ler a frase inteira, em vez de
 * soletrar as letras separadas.
 */
export function TextoFlutua({
  children,
  className = "",
  classeTexto = "",
  duracao = 1,
  ease = "back.inOut(2)",
  inicio = "center bottom+=50%",
  fim = "bottom bottom-=40%",
  escalonamento = 0.03,
  como: Tag = "h2",
}: {
  children: string;
  className?: string;
  classeTexto?: string;
  duracao?: number;
  ease?: string;
  inicio?: string;
  fim?: string;
  escalonamento?: number;
  como?: "h1" | "h2" | "h3" | "p" | "div";
}) {
  const caixa = useRef<HTMLElement>(null);

  const letras = useMemo(
    () =>
      Array.from(children).map((c, i) => (
        <span key={i} data-letra className="inline-block">
          {c === " " ? " " : c}
        </span>
      )),
    [children],
  );

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    const contexto = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-letra]"),
        {
          willChange: "opacity, transform",
          opacity: 0,
          yPercent: 120,
          scaleY: 2.3,
          scaleX: 0.7,
          transformOrigin: "50% 0%",
        },
        {
          duration: duracao,
          ease,
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: escalonamento,
          scrollTrigger: { trigger: el, start: inicio, end: fim, scrub: true },
        },
      );
    }, el);

    return () => contexto.revert();
  }, [duracao, ease, inicio, fim, escalonamento]);

  return (
    <Tag ref={caixa as React.Ref<never>} className={`overflow-hidden ${className}`.trim()}>
      {/* a frase inteira num span: o leitor de tela le o texto, nao as letras */}
      <span className={`inline-block ${classeTexto}`.trim()}>{letras}</span>
    </Tag>
  );
}
