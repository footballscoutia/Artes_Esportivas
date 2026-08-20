"use client";

/**
 * THESIS: o produto se explica sendo executado — tres materiais viram um post
 * na frente do visitante. Recusa o hero de screenshot em moldura de notebook,
 * que e o que esta categoria sempre entrega e que aqui seria mentira: nao ha
 * arte real para mostrar ainda.
 * OWN-WORLD: mesa escura vista de cima, aresta acesa em #2E7CFF, Anton nos
 * titulos, grade de diagramacao como unica textura. Reconhecivel sem uma
 * palavra na tela.
 * STORY: o visitante entende que escolhe categoria e atleta e recebe arte
 * pronta; acredita porque ve o mecanismo montando; cria a conta.
 * FIRST VIEWPORT: cena 3D ocupando a tela, tres placas separadas sobre a mesa;
 * titulo em Anton alinhado a esquerda no terco inferior, acao primaria logo
 * abaixo dele, nada mais.
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
import { TIPOS, TIPO_META } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

/**
 * Os tres materiais que entram na arte, na ordem em que a cena os funde.
 *
 * Cada um responde "por que isso importa?" com o motivo tecnico real — e o que
 * separa o produto de pedir a mesma coisa a um chat qualquer.
 */
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
      "Carimbada por cima, por código. Marca tem forma exata e modelo nenhum acerta de memória. Você escolhe o canto depois de ver a arte.",
  },
];

const PASSOS = [
  {
    titulo: "Cadastre uma vez",
    texto: "Atletas, clubes e as logos que você usa. Leva uma tarde e não se repete.",
  },
  {
    titulo: "Escolha categoria e atleta",
    texto: "Dois cliques. Em matchday, mais o adversário e a data — o resto o cadastro já sabe.",
  },
  {
    titulo: "Aprove e publique",
    texto: "A arte volta em alta, no formato certo. Quem aprova decide antes de sair.",
  },
];

export function Landing() {
  const progresso = useRef(0);
  const palco = useRef<HTMLDivElement>(null);
  const pagina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /**
     * Scroll suave por Lenis, dirigindo o ScrollTrigger.
     *
     * Os dois precisam concordar sobre onde a pagina esta: sem o `scrollerProxy`
     * implicito desta ligacao, o gatilho le a posicao nativa e a cena 3D fica um
     * quadro atras do que o olho ve.
     */
    const suave = new Lenis({ duration: 1.05, smoothWheel: true });
    suave.on("scroll", ScrollTrigger.update);

    const tick = (t: number) => suave.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const contexto = gsap.context(() => {
      /**
       * O momento autoral da pagina: a fusao das tres placas, dirigida pelo
       * scroll enquanto o palco fica preso. E o unico efeito com escala aqui —
       * o resto e entrada discreta, para nao competir com ele.
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

      /* Entradas: `from` roda em tempo de execucao, entao sem JS o conteudo
         continua visivel. Nunca esconder texto esperando animacao. */
      gsap.utils.toArray<HTMLElement>("[data-entra]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 22,
          duration: 0.85,
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
    <div ref={pagina} className="bg-bg text-text">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 lg:px-10">
        <Marca className="text-[17px]" />
        <Link
          href="/login"
          className="rounded-full border border-line px-4 py-2 text-[13px] text-muted transition-colors hover:border-line-2 hover:text-text"
        >
          Entrar
        </Link>
      </header>

      {/* ---- palco: a cena 3D e o primeiro viewport ---- */}
      <section ref={palco} className="relative h-dvh overflow-hidden">
        <Mesa progresso={progresso} />

        {/* a luz cai de cima e morre antes da borda, como refletor sobre mesa */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 0%, transparent 40%, var(--color-bg) 92%)",
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-14 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-[1400px]">
            <h1 className="display max-w-[13ch] text-[clamp(2.6rem,7.4vw,5.6rem)] leading-[0.94] tracking-[-0.03em]">
              Escolha o atleta.
              <br />O post sai pronto.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted">
              O MatchPost gera as artes promocionais do seu elenco no padrão da sua marca.
              Você escolhe a categoria e o atleta — não escreve prompt nenhum.
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

      {/* ---- os tres materiais ---- */}
      <section className="px-6 py-28 lg:px-10 lg:py-40">
        <div className="mx-auto max-w-[1400px]">
          <h2
            data-entra
            className="display max-w-[18ch] text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]"
          >
            Três coisas entram. Uma arte sai.
          </h2>
          <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {MATERIAIS.map((m) => (
              <div key={m.nome} data-entra>
                <div aria-hidden className="mb-5 h-px w-full bg-accent/45" />
                <h3 className="text-[17px] font-medium tracking-tight">{m.nome}</h3>
                <p className="mt-2.5 max-w-[38ch] text-[14px] leading-relaxed text-muted">
                  {m.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- categorias: o catalogo real, sem inventar nenhuma ---- */}
      <section className="border-y border-line bg-surface/40 px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-[1400px]">
          <h2
            data-entra
            className="display max-w-[20ch] text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]"
          >
            Oito categorias, dois formatos.
          </h2>
          <p data-entra className="mt-5 max-w-[66ch] text-[15px] leading-relaxed text-muted">
            Cada combinação já carrega o estilo dela. Feed em 1080×1350, story em 1080×1920 —
            no tamanho certo, sem recorte depois.
          </p>

          <ul className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {TIPOS.map((t) => (
              <li key={t} data-entra className="bg-bg p-6">
                <span className="display block text-[19px] tracking-[-0.01em]">
                  {TIPO_META[t].titulo}
                </span>
                <span className="mt-2 block max-w-[26ch] text-[13px] leading-relaxed text-muted">
                  {TIPO_META[t].descricao}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- como funciona ---- */}
      <section className="px-6 py-28 lg:px-10 lg:py-40">
        <div className="mx-auto max-w-[1400px]">
          <h2
            data-entra
            className="display max-w-[16ch] text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]"
          >
            O trabalho todo cabe numa tarde.
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {PASSOS.map((p) => (
              <div key={p.titulo} data-entra>
                <h3 className="text-[17px] font-medium tracking-tight">{p.titulo}</h3>
                <p className="mt-2.5 max-w-[36ch] text-[14px] leading-relaxed text-muted">
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- o diferencial, dito sem rodeio ---- */}
      <section className="border-t border-line px-6 py-28 lg:px-10 lg:py-40">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.1fr_1fr]">
          <h2
            data-entra
            className="display max-w-[16ch] text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02] tracking-[-0.025em]"
          >
            Por que não é só pedir a um chat.
          </h2>
          <div data-entra className="space-y-6 lg:pt-2">
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-muted">
              Num chat, o resultado depende de quem escreveu o pedido. Aqui, cada categoria já
              tem o estilo definido por quem entende do assunto — o mesmo pedido feito por
              qualquer pessoa da equipe volta no mesmo padrão.
            </p>
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-muted">
              E o que não pode dar errado não é deixado por conta do modelo: o escudo vai como
              imagem para ser copiado, não descrito; a sua marca é aplicada por código, no canto
              que você escolher depois de ver a arte pronta.
            </p>
          </div>
        </div>
      </section>

      {/* ---- fechamento ---- */}
      <section className="px-6 pb-32 pt-10 lg:px-10 lg:pb-40">
        <div className="mx-auto max-w-[1400px]">
          <div
            data-entra
            className="relative overflow-hidden rounded-panel border border-line bg-surface px-8 py-20 text-center lg:py-28"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 120% at 50% 0%, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 68%)",
              }}
            />
            <div className="relative">
              <h2 className="display mx-auto max-w-[16ch] text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.0] tracking-[-0.028em]">
                Cadastre a sua agência e gere a primeira.
              </h2>
              <Link
                href="/login?criar=1"
                className="mt-9 inline-flex h-12 items-center rounded-full bg-accent px-8 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 lg:px-10">
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
