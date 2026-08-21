"use client";

/**
 * THESIS: uma camera so atravessa a pagina inteira e a materia se transforma
 * na frente de quem le — mesa, fusao, grade, formatos, esteira, final. Recusa
 * o 3D preso ao heroi com texto morto embaixo, que e o que esta categoria
 * sempre entrega.
 * OWN-WORLD: escuro com nevoa, aresta acesa em #2E7CFF sob bloom, Anton nos
 * titulos, placas como diagrama e nunca como foto falsa.
 * STORY: o visitante entende que escolhe categoria e atleta e recebe arte
 * pronta; acredita porque ve o mecanismo se montando durante toda a rolagem;
 * cria a conta.
 * FIRST VIEWPORT: cena ocupando a tela, tres placas separadas sobre a mesa;
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
import { Cena } from "@/components/lp/Cena";
import { TIPOS, TIPO_META } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const MATERIAIS = [
  {
    nome: "A foto do atleta",
    texto:
      "Cadastrada uma vez, no elenco. A cada post você escolhe da lista em vez de procurar o arquivo bom outra vez.",
  },
  {
    nome: "O escudo do clube",
    texto:
      "Vai junto como imagem, não como descrição. Escudo descrito em palavras sai inventado — e escudo inventado parece escudo, que é o pior tipo de erro.",
  },
  {
    nome: "A sua marca",
    texto:
      "Carimbada por cima, por código. Marca tem forma exata e modelo nenhum acerta de memória. Você escolhe o canto depois de ver a arte pronta.",
  },
];

const PASSOS = [
  { titulo: "Cadastre uma vez", texto: "Atletas, clubes e as logos que você usa. Leva uma tarde e não se repete." },
  { titulo: "Escolha categoria e atleta", texto: "Dois cliques. Em matchday, mais o adversário e a data — o resto o cadastro já sabe." },
  { titulo: "Aprove e publique", texto: "A arte volta em alta, no formato certo. Quem aprova decide antes de sair." },
];

/** Cada bloco de texto flutua sobre a cena com o seu proprio veu de leitura. */
function Ato({
  children,
  className = "",
  lado = "esquerda",
}: {
  children: React.ReactNode;
  className?: string;
  lado?: "esquerda" | "direita" | "centro";
}) {
  const alinhamento =
    lado === "direita" ? "ml-auto text-left" : lado === "centro" ? "mx-auto text-center" : "mr-auto";
  return (
    <section className={`relative z-10 flex min-h-dvh items-center px-6 lg:px-10 ${className}`}>
      <div className={`w-full max-w-[540px] ${alinhamento}`} data-ato>
        {children}
      </div>
    </section>
  );
}

export function Landing() {
  const progresso = useRef(0);
  const pagina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const suave = new Lenis({ duration: 1.15, smoothWheel: true });
    suave.on("scroll", ScrollTrigger.update);

    /**
     * O `update` tambem entra no ticker, e nao so no evento do Lenis.
     *
     * O evento cobre o que o Lenis origina — roda, toque, teclado. Nao cobre o
     * que vem de fora: restauracao de posicao ao recarregar, link com ancora,
     * `scrollTo` de extensao. Sem isto, nesses casos a cena congela num ato e o
     * texto some. A chamada sai barata quando nada mudou.
     */
    const tick = (t: number) => {
      suave.raf(t * 1000);
      ScrollTrigger.update();
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const contexto = gsap.context(() => {
      /**
       * O momento autoral: o scroll da pagina INTEIRA dirige a camera pelos
       * seis atos. Nao ha gatilho por secao — ha um so, e a cena e continua.
       */
      ScrollTrigger.create({
        trigger: pagina.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (t) => {
          progresso.current = t.progress;
        },
      });

      /**
       * Cada ato entra e sai: o texto acompanha o corte da camera em vez de
       * ficar pendurado na tela enquanto a cena ja seguiu adiante.
       *
       * `immediateRender: false` e o que impede a pagina de nascer em branco.
       * Um `fromTo` com scrub aplica o estado inicial na hora — os sete atos
       * iriam para opacidade 0 no carregamento e so voltariam se o gatilho
       * disparasse. Adiando isso ate o gatilho realmente pegar, qualquer falha
       * no ScrollTrigger deixa o texto visivel, que e o lado certo de errar.
       */
      gsap.utils.toArray<HTMLElement>("[data-ato]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            ease: "expo.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 88%", end: "top 45%", scrub: 0.6 },
          },
        );
        gsap.to(el, {
          opacity: 0,
          y: -26,
          ease: "none",
          scrollTrigger: { trigger: el, start: "bottom 40%", end: "bottom 5%", scrub: 0.6 },
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
    <div ref={pagina} className="relative bg-bg text-text">
      <Cena progresso={progresso} />

      {/* véu de leitura: a cena é luz, e texto sobre luz precisa de chão */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(130% 80% at 50% 50%, transparent 30%, color-mix(in srgb, var(--color-bg) 82%, transparent) 100%)",
        }}
      />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 lg:px-10">
        <Marca className="text-[17px]" />
        <Link
          href="/login"
          className="rounded-full border border-line bg-bg/40 px-4 py-2 text-[13px] text-muted backdrop-blur-md transition-colors hover:border-line-2 hover:text-text"
        >
          Entrar
        </Link>
      </header>

      {/* ---- ato 1: a mesa ---- */}
      <Ato>
        <h1 className="display max-w-[13ch] text-[clamp(2.6rem,7.4vw,5.6rem)] leading-[0.94] tracking-[-0.03em]">
          Escolha o atleta.
          <br />O post sai pronto.
        </h1>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted">
          O MatchPost gera as artes promocionais do seu elenco no padrão da sua marca. Você escolhe a
          categoria e o atleta — não escreve prompt nenhum.
        </p>
        <Link
          href="/login?criar=1"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-7 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
        >
          Criar conta
        </Link>
      </Ato>

      {/* ---- ato 2: a fusão ---- */}
      <Ato lado="direita">
        <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]">
          Três coisas entram. Uma arte sai.
        </h2>
        <div className="mt-9 space-y-7">
          {MATERIAIS.map((m) => (
            <div key={m.nome}>
              <div aria-hidden className="mb-3 h-px w-10 bg-accent/60" />
              <h3 className="text-[16px] font-medium tracking-tight">{m.nome}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{m.texto}</p>
            </div>
          ))}
        </div>
      </Ato>

      {/* ---- ato 3: a grade de categorias ---- */}
      <Ato>
        <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]">
          Oito categorias.
        </h2>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-muted">
          Cada uma já carrega o estilo dela. Você escolhe o que a arte anuncia, nunca como ela deve
          ser desenhada.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-2.5 gap-y-2.5">
          {TIPOS.map((t) => (
            <li
              key={t}
              className="rounded-full border border-line bg-bg/50 px-4 py-2 text-[13px] backdrop-blur-md"
            >
              {TIPO_META[t].titulo}
            </li>
          ))}
        </ul>
      </Ato>

      {/* ---- ato 4: os formatos ---- */}
      <Ato lado="direita">
        <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]">
          Feed e story, no tamanho certo.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          1080×1350 para o perfil, 1080×1920 para o story. A arte nasce na proporção final — não é
          uma imagem quadrada recortada depois, com a cabeça do atleta cortada fora.
        </p>
      </Ato>

      {/* ---- ato 5: a esteira ---- */}
      <Ato>
        <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]">
          O trabalho todo cabe numa tarde.
        </h2>
        <div className="mt-9 space-y-7">
          {PASSOS.map((p) => (
            <div key={p.titulo}>
              <div aria-hidden className="mb-3 h-px w-10 bg-accent/60" />
              <h3 className="text-[16px] font-medium tracking-tight">{p.titulo}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{p.texto}</p>
            </div>
          ))}
        </div>
      </Ato>

      {/* ---- ato 6: por que não é só um chat ---- */}
      <Ato lado="direita">
        <h2 className="display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]">
          Por que não é só pedir a um chat.
        </h2>
        <div className="mt-6 space-y-5">
          <p className="text-[15px] leading-relaxed text-muted">
            Num chat, o resultado depende de quem escreveu o pedido. Aqui, cada categoria já tem o
            estilo definido por quem entende do assunto — o mesmo pedido feito por qualquer pessoa da
            equipe volta no mesmo padrão.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">
            E o que não pode dar errado não fica por conta do modelo: o escudo vai como imagem para
            ser copiado, não descrito; a sua marca é aplicada por código, no canto que você escolher
            depois de ver a arte pronta.
          </p>
        </div>
      </Ato>

      {/* ---- fechamento ---- */}
      <Ato lado="centro">
        <h2 className="display mx-auto max-w-[15ch] text-[clamp(2.2rem,5.6vw,4rem)] leading-[1.0] tracking-[-0.028em]">
          Cadastre a sua agência e gere a primeira.
        </h2>
        <Link
          href="/login?criar=1"
          className="mt-10 inline-flex h-13 items-center rounded-full bg-accent px-9 py-3.5 text-[15px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
        >
          Criar conta
        </Link>
      </Ato>

      <footer className="relative z-10 border-t border-line bg-bg/70 px-6 py-10 backdrop-blur-md lg:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <Marca className="text-[14px]" />
          <Link href="/login" className="text-[13px] text-muted transition-colors hover:text-text">
            Já tem conta? Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}
