"use client";

/**
 * THESIS: o movimento vem da LUZ e do TEXTO, nunca de objetos voando. Recusa a
 * narrativa em 3D que a versao anterior tentou — placas encenando o produto
 * ficaram literais e duras — e recusa tambem o hero de screenshot em moldura,
 * que aqui seria mentira: nao ha arte real para mostrar.
 * OWN-WORLD: campo de luz azul escorrendo sobre quase-preto, ondas de choque
 * ao toque, Anton nos titulos, texto revelado por mascara.
 * STORY: o visitante entende que escolhe categoria e atleta e recebe arte
 * pronta; acredita porque o texto e concreto; cria a conta.
 * FIRST VIEWPORT: titulo em Anton revelado linha a linha sobre o campo de luz,
 * subtitulo, acao primaria. Layout comum e legivel, sem palco.
 * FORM: fundo em shader, fora da lista sorteada — o usuario pediu esta
 * estrategia depois de ver a anterior. Seed 73b72703 aposentado.
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
      "Vai junto como imagem, não como descrição. Escudo descrito em palavras sai inventado — e escudo inventado parece escudo.",
  },
  {
    nome: "A sua marca",
    texto:
      "Carimbada por cima, por código. Marca tem forma exata e modelo nenhum acerta de memória. Você escolhe o canto depois de ver a arte.",
  },
];

const PASSOS = [
  { titulo: "Cadastre uma vez", texto: "Atletas, clubes e as logos que você usa. Leva uma tarde e não se repete." },
  { titulo: "Escolha categoria e atleta", texto: "Dois cliques. Em matchday, mais o adversário e a data — o resto o cadastro já sabe." },
  { titulo: "Aprove e publique", texto: "A arte volta em alta, no formato certo. Quem aprova decide antes de sair." },
];

/**
 * Uma linha de titulo que sobe por tras de uma mascara.
 *
 * O `overflow-hidden` no pai e o que faz a letra APARECER de dentro do papel em
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
      /* Abertura: as linhas do titulo sobem em cascata. E o unico momento
         coreografado da pagina — o resto responde ao scroll. */
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
        delay: 0.42,
      });

      /* Entradas de secao: `from` aplica o estado inicial em tempo de
         execucao, entao sem JS o conteudo continua visivel. */
      gsap.utils.toArray<HTMLElement>("[data-entra]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 26,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 86%" },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-lista] > *").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 22,
          duration: 0.7,
          ease: "expo.out",
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: el, start: "top 90%" },
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

      {/*
        Véu de leitura: uma lâmina uniforme, não um radial.

        O radial deixava o centro descoberto — justo onde o texto mora — então
        um núcleo de luz que passasse por ali derrubava o contraste do
        parágrafo. Uma lâmina constante rebaixa o campo inteiro de forma
        previsível, e a vinheta que fecha as bordas já vive no shader.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5]"
        style={{ background: "color-mix(in srgb, var(--color-bg) 52%, transparent)" }}
      />

      <div className="relative z-10">
        {/* O cabeçalho é fixo e o conteúdo passa por baixo: sem um degradê
            próprio, a logo se sobrepõe ao texto da seção durante a rolagem. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24"
          style={{ background: "linear-gradient(var(--color-bg), transparent)" }}
        />
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
          <div className="mx-auto w-full max-w-[1240px]">
            <h1
              data-heroi
              className="display max-w-[14ch] text-[clamp(2.7rem,8vw,6rem)] leading-[0.92] tracking-[-0.032em]"
            >
              <Linha>Escolha o atleta.</Linha>
              <Linha>O post sai pronto.</Linha>
            </h1>
            <p data-abre className="mt-7 max-w-[52ch] text-[16px] leading-relaxed text-muted">
              O MatchPost gera as artes promocionais do seu elenco no padrão da sua marca. Você
              escolhe a categoria e o atleta — não escreve prompt nenhum.
            </p>
            <div data-abre className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login?criar=1"
                className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-[14px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
              >
                Criar conta
              </Link>
              <span className="text-[13px] text-muted-2">Oito categorias, feed e story</span>
            </div>
          </div>
        </section>

        {/* ---- os três materiais ---- */}
        <section className="px-6 py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1240px]">
            <h2
              data-entra
              className="display max-w-[20ch] text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.04] tracking-[-0.025em]"
            >
              Três coisas entram. Uma arte sai.
            </h2>
            <div data-lista className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
              {MATERIAIS.map((m) => (
                <div key={m.nome}>
                  <div aria-hidden className="mb-5 h-px w-full bg-accent/40" />
                  <h3 className="text-[17px] font-medium tracking-tight">{m.nome}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{m.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- categorias ---- */}
        <section className="px-6 py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1240px]">
            <h2
              data-entra
              className="display max-w-[20ch] text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.04] tracking-[-0.025em]"
            >
              Oito categorias, dois formatos.
            </h2>
            <p data-entra className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-muted">
              Cada combinação já carrega o estilo dela. Feed em 1080×1350, story em 1080×1920 — a
              arte nasce na proporção final, não é um quadrado recortado depois.
            </p>
            <ul
              data-lista
              className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
            >
              {TIPOS.map((t) => (
                <li key={t} className="bg-bg/70 p-6 backdrop-blur-sm">
                  <span className="display block text-[19px] tracking-[-0.01em]">
                    {TIPO_META[t].titulo}
                  </span>
                  <span className="mt-2 block text-[13px] leading-relaxed text-muted">
                    {TIPO_META[t].descricao}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- como funciona ---- */}
        <section className="px-6 py-28 lg:px-10 lg:py-36">
          <div className="mx-auto max-w-[1240px]">
            <h2
              data-entra
              className="display max-w-[18ch] text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.04] tracking-[-0.025em]"
            >
              O trabalho todo cabe numa tarde.
            </h2>
            <div data-lista className="mt-14 grid gap-10 md:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.titulo}>
                  <div aria-hidden className="mb-5 h-px w-full bg-accent/40" />
                  <h3 className="text-[17px] font-medium tracking-tight">{p.titulo}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- consistência ---- */}
        <section className="px-6 py-28 lg:px-10 lg:py-36">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1fr_1fr]">
            <h2
              data-entra
              className="display max-w-[16ch] text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.04] tracking-[-0.025em]"
            >
              Cem posts, um padrão só.
            </h2>
            <div data-entra className="space-y-5 lg:pt-2">
              <p className="max-w-[64ch] text-[15px] leading-relaxed text-muted">
                Num chat, o resultado depende de quem escreveu o pedido — e no mês seguinte o mesmo
                pedido volta diferente. Aqui o estilo de cada categoria já está definido, então o
                post que a sua equipe gera hoje conversa com o que ela gerou em março.
              </p>
              <p className="max-w-[64ch] text-[15px] leading-relaxed text-muted">
                O que não pode dar errado também não fica por conta do modelo: o escudo vai como
                imagem para ser copiado, não descrito; a sua marca é aplicada por código, no canto
                que você escolher depois de ver a arte pronta.
              </p>
            </div>
          </div>
        </section>

        {/* ---- fechamento ---- */}
        <section className="px-6 pb-36 pt-16 lg:px-10">
          <div data-entra className="mx-auto max-w-[1240px] text-center">
            <h2 className="display mx-auto max-w-[16ch] text-[clamp(2.1rem,5.4vw,3.8rem)] leading-[1.02] tracking-[-0.028em]">
              Cadastre a sua agência e gere a primeira.
            </h2>
            <Link
              href="/login?criar=1"
              className="mt-10 inline-flex h-12 items-center rounded-full bg-accent px-8 text-[15px] font-medium text-accent-texto transition-colors hover:bg-accent-forte"
            >
              Criar conta
            </Link>
          </div>
        </section>

        <footer className="border-t border-line bg-bg/50 px-6 py-10 backdrop-blur-md lg:px-10">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4">
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
