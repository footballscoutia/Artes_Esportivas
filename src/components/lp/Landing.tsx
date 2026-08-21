"use client";

/**
 * THESIS: duas secoes e so. O heroi mostra o mecanismo — tres materiais se
 * fundindo numa arte — e a segunda leva ao cadastro. Recusa a LP longa: sem
 * arte real para exibir (IMAGE_PROVIDER=mock, e o acervo veio do Pinterest),
 * pagina comprida nao fica cheia, fica vazia.
 * OWN-WORLD: mesa escura vista de cima com aresta acesa em #2E7CFF no heroi,
 * campo de luz escorrendo no fechamento, Chakra Petch nos titulos.
 * STORY: o visitante ve o mecanismo acontecer, entende em uma tela, cria a
 * conta.
 * FIRST VIEWPORT: cena 3D ocupando a tela, tres placas separadas sobre a mesa;
 * titulo ondulando no centro, acao primaria abaixo dele.
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
import { TextoWarp } from "@/components/lp/TextoWarp";
import { Fundo } from "@/components/lp/Fundo";
import { Painel } from "@/components/lp/Painel";
import { Vitrine } from "@/components/lp/Vitrine";

gsap.registerPlugin(ScrollTrigger);

/**
 * A acao primaria — luz correndo pela borda.
 *
 * Referencia: o "Star Border" do React Bits. Duas manchas radiais bem maiores
 * que o botao passeiam atras dele; o pai corta tudo menos a fatia que toca a
 * borda, e o brilho parece percorrer o contorno sem nenhum caminho desenhado.
 *
 * O miolo fica escuro, nao chapado de azul. Numa pagina que ja e escura com
 * luz azul, um bloco azul solido era so mais um bloco — assim o botao e o
 * unico lugar da tela onde a luz se move sozinha, e e isso que puxa o olho.
 *
 * A luz corre o tempo todo, nao so no hover: parada, ela seria decoracao que
 * ninguem descobre. Ao apontar, o miolo clareia e a borda firma.
 */
function Acao({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const mancha = "radial-gradient(circle, #7FB0FF, transparent 14%)";

  return (
    <Link
      href={href}
      className={`group relative inline-block overflow-hidden rounded-full p-[2px] ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 -right-[250%] h-1/2 w-[300%] rounded-[50%] motion-reduce:hidden"
        style={{ background: mancha, animation: "luz-borda-baixo 5s linear infinite alternate" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[250%] -top-3 h-1/2 w-[300%] rounded-[50%] motion-reduce:hidden"
        style={{ background: mancha, animation: "luz-borda-cima 5s linear infinite alternate" }}
      />
      {/*
        Miolo escuro, e nao chapado de azul.

        Um bloco azul cheio e o botao que todo produto tem, e foi o que a
        primeira tentativa reproduziu. Aqui o que chama nao e a cor: e ser o
        unico lugar da tela onde a luz se move sozinha.

        A hierarquia se resolve do outro lado — o "Entrar" do cabecalho perdeu
        a pilula e virou texto. Rebaixar o secundario custa menos que inflar o
        primario, e deixa a pagina com um objeto so.
      */}
      <span className="relative block rounded-full border border-white/10 bg-bg-2 px-9 py-4 text-[14px] font-medium text-text transition-colors duration-200 group-hover:bg-surface-2 motion-reduce:border-accent/70">
        {children}
      </span>
    </Link>
  );
}

export function Landing() {
  const progresso = useRef(0);
  const palco = useRef<HTMLDivElement>(null);
  const fechamento = useRef<HTMLElement>(null);
  const pagina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /**
     * Recarregar volta ao topo.
     *
     * O padrao do navegador e restaurar onde a pessoa estava, o que ajuda numa
     * pagina de texto. Aqui atrapalha: o heroi e preso e a cena depende do
     * progresso do scroll, entao recarregar no meio devolve as placas
     * congeladas na metade da fusao, sem o titulo e sem explicacao. Como o
     * `pin` remede a pagina ao montar, a posicao restaurada tambem cai em
     * lugar diferente do que estava antes.
     *
     * O valor anterior volta na limpeza: fora da landing, restaurar posicao e
     * o comportamento certo.
     */
    const restauracaoAnterior = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

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

      /**
       * A costura entre as duas secoes.
       *
       * O painel comeca a subir e a se endireitar ENQUANTO o heroi ainda esta
       * preso, terminando so depois que ele solta. E o que liga uma secao a
       * outra: sem essa sobreposicao, a pagina tem um corte seco no ponto em
       * que o pin acaba, e as duas parecem dois sites colados.
       *
       * `from` roda em tempo de execucao: sem JS o painel fica no lugar,
       * visivel e reto.
       */
      gsap.from("[data-painel]", {
        yPercent: 26,
        scale: 0.9,
        opacity: 0,
        rotateX: 12,
        ease: "none",
        scrollTrigger: {
          trigger: fechamento.current,
          start: "top bottom",
          end: "top 32%",
          scrub: 0.8,
        },
      });

      /* Entra pelo lado em que ele vive: o texto esta a direita, entao vem de
         la. Vindo da esquerda, ele atravessaria o painel no caminho. */
      gsap.from("[data-texto]", {
        opacity: 0,
        x: 28,
        ease: "none",
        scrollTrigger: {
          trigger: fechamento.current,
          start: "top 88%",
          end: "top 45%",
          scrub: 0.8,
        },
      });
    }, pagina);

    return () => {
      contexto.revert();
      gsap.ticker.remove(tick);
      suave.destroy();
      history.scrollRestoration = restauracaoAnterior;
    };
  }, []);

  return (
    <div ref={pagina} className="relative text-text">
      {/* o campo de luz fica atrás de tudo; o herói o cobre com fundo opaco */}
      <Fundo />

      {/* o cabeçalho é fixo e o conteúdo passa por baixo: sem degradê próprio,
          a logo se sobrepõe ao título da segunda seção durante a rolagem */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24"
        style={{ background: "linear-gradient(var(--color-bg), transparent)" }}
      />
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 lg:px-10">
        <Marca className="text-[17px]" />
        {/* texto puro, sem pílula: era ele que empatava com a ação primária e
            achatava a hierarquia da página */}
        <Link
          href="/login"
          className="px-1 py-2 text-[13px] text-muted transition-colors hover:text-text"
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

        {/* o título ondulando, sozinho — a ação vive na segunda seção */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end px-6 pb-10 lg:pb-14">
          {/*
            O <h1> de verdade, invisível.

            O título é desenhado dentro de um canvas pelo TextoWarp, então ele
            deixa de existir como texto: buscador não indexa pixel e leitor de
            tela não lê. Este h1 devolve as duas coisas, e o canvas fica
            `aria-hidden` para a frase não ser anunciada em dobro.
          */}
          <h1 className="sr-only">Escolha o atleta. O post sai pronto.</h1>

          {/*
            `pointer-events-auto` é o que faz a lente do cursor existir.

            O wrapper deste bloco é `pointer-events-none` para o clique passar
            até a cena 3D atrás. Só que isso engolia o `pointermove` do canvas
            também: o shader estava certo, o mouse é que nunca chegava nele, e
            o efeito ficava só na ondulação de repouso. É preciso devolver o
            ponteiro AQUI, e nada além daqui.
          */}
          {/*
            Uma linha só, sem `\n`: a quebra agora é do componente, por largura
            disponível. Em tela estreita ele reparte em mais linhas e todas
            curvam — melhor que encolher a fonte até o título virar um fio.
          */}
          <TextoWarp
            texto="Escolha o atleta. O post sai pronto."
            cor="#EDEEF0"
            className="pointer-events-auto h-[34vh] w-full max-w-[1400px]"
            tamanho="clamp(2.4rem, 6.6vw, 5.4rem)"
            peso={700}
            familia="var(--fonte-display), sans-serif"
            espacamento="-0.02em"
            entrelinha={1}
            curvatura={0.028}
          />
        </div>
      </section>

      {/* ---- vitrine: o que sai do outro lado ---- */}
      <div className="relative z-10">
        {/* mesma emenda do fechamento: o herói é opaco, e sem degradê o campo
            de luz apareceria numa linha reta cortando a tela */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-52"
          style={{ background: "linear-gradient(var(--color-bg), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "color-mix(in srgb, var(--color-bg) 52%, transparent)" }}
        />
        <Vitrine />
      </div>

      {/* ---- cadastro ---- */}
      <div className="relative z-10">
        {/* véu de leitura: aqui o campo de luz aparece, e texto sobre luz precisa de chão */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "color-mix(in srgb, var(--color-bg) 52%, transparent)" }}
        />

        {/* Sem degradê de emenda aqui: quem faz a passagem do herói opaco para
            o campo de luz agora é a vitrine, logo acima. Manter os dois punha
            uma segunda faixa escura no meio da página, sem nada para separar. */}
        <section
          ref={fechamento}
          className="relative flex min-h-[86vh] items-center px-6 pb-24 pt-10 lg:px-10"
        >
          {/* separa em duas colunas ja no `md`: em `lg` a maioria das telas de
              trabalho ainda caia na versao empilhada, com o painel gigante */}
          {/*
            O painel fica à esquerda e o texto à direita, mas a ORDEM no HTML é
            a inversa — título primeiro, painel depois.

            Quem lê por leitor de tela ou navega por teclado recebe o cabeçalho
            antes da ilustração, que é a ordem que faz sentido; empilhado no
            celular, o texto também vem primeiro. Só a posição visual troca, e
            ela troca por `order`.
          */}
          <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 md:grid-cols-[1.2fr_0.8fr] md:gap-12 lg:gap-16">
            <div data-texto className="md:order-2">
              <h2 className="display max-w-[15ch] text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.02] tracking-[-0.028em]">
                Cadastre a sua agência e gere a primeira.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Acao href="/login?criar=1">Criar conta</Acao>
                <span className="text-[13px] text-muted-2">Leva um minuto</span>
              </div>
            </div>

            {/* a interface do produto, encenada — é a prova que a página não tinha */}
            {/* teto de largura: empilhado, sem ele o painel vira um cartaz e a
                tipografia miuda dele fica desproporcional */}
            <div data-painel className="mx-auto w-full min-w-0 max-w-[620px] md:mx-0 md:max-w-none md:order-1">
              <Painel />
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
