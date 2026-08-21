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
 * porque o nivel do titulo depende de onde a secao entra na pagina.
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

  /**
   * Divide por PALAVRA e, dentro dela, por letra.
   *
   * O original manda cada caractere num `inline-block` solto, e assim o
   * navegador pode quebrar a linha entre duas letras quaisquer — foi o que
   * produziu "Um p / ost vi / ra a s". Cada palavra vira um `inline-block`
   * com `whitespace-nowrap`: as letras de dentro nao se separam, e a quebra
   * volta a acontecer so entre palavras, como em qualquer texto.
   */
  const palavras = useMemo(() => {
    const partes = children.split(" ");
    return partes.map((palavra, i) => (
      <span key={i} className="inline-block whitespace-nowrap">
        {Array.from(palavra).map((c, j) => (
          <span key={j} data-letra className="inline-block">
            {c}
          </span>
        ))}
        {/* o espaco fica fora do bloco da palavra: e ali que a linha quebra */}
        {i < partes.length - 1 ? " " : null}
      </span>
    ));
  }, [children]);

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
      <span className={`inline-block ${classeTexto}`.trim()}>{palavras}</span>
    </Tag>
  );
}
