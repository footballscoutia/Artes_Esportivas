"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextoWarp } from "@/components/lp/TextoWarp";
import { CartoesTres, FATIA_ENTRADA } from "@/components/lp/CartoesTres";
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
 * entrega para quem desenha; quem sabe coreografar cartao e a CartoesTres, e
 * quem sabe revelar o titulo e o TextoWarp.
 */

const FRASE = "Um post vira a semana inteira.";

/** As quatro categorias que a vitrine mostra. */
const ROTULOS = TIPOS.slice(0, 4).map((t) => TIPO_META[t].titulo);

/**
 * Em que trecho do progresso o titulo surge.
 *
 * Comeca depois de a secao ja ter entrado — antes ele se montava com a secao
 * ainda no pe da tela, e quando chegava a vez de olhar ja estava tudo escrito.
 * E termina com a secao PRESA, entao o texto acaba de se formar parado no meio
 * da tela, que e onde a pessoa esta olhando.
 */
const REVELA_DE = 0.06;
const REVELA_ATE = 0.42;

function fatia(p: number, a: number, b: number) {
  return Math.min(Math.max((p - a) / (b - a), 0), 1);
}

export function Vitrine() {
  const secao = useRef<HTMLElement>(null);
  const progresso = useRef(0);
  const revelacao = useRef(0);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    const palco = el.querySelector<HTMLElement>("[data-palco]");
    if (!palco) return;

    /* Um so lugar escreve os dois numeros: a revelacao do titulo e uma fatia do
       mesmo progresso que move os cartoes, e nao um gatilho a parte. Assim as
       duas animacoes nao tem como sair de sincronia. */
    const aplicar = (p: number) => {
      progresso.current = p;
      revelacao.current = fatia(p, REVELA_DE, REVELA_ATE);
    };

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
          // movimento reduzido: a fileira ja nasce montada e o titulo inteiro
          aplicar(1);
          return;
        }

        /* Estreito: nao ha para onde o cartao grande "ir para a esquerda", e
           prender a tela no celular custa caro em confianca. Os quatro so
           aparecem, no compasso de quem rola. */
        if (estreito) {
          const passo = { valor: 0 };
          gsap.to(passo, {
            valor: 1,
            ease: "none",
            onUpdate: () => aplicar(passo.valor),
            scrollTrigger: { trigger: palco, start: "top 88%", end: "top 30%", scrub: 0.6 },
          });
          return;
        }

        /**
         * Dois gatilhos alimentam UM progresso.
         *
         * O primeiro roda enquanto a secao ainda sobe pela tela; o segundo,
         * enquanto ela esta presa. Emendados, a coreografia atravessa o momento
         * em que a pagina prende sem nenhuma juncao: quando o scroll para, o
         * cartao ja esta em voo ha um tempo.
         *
         * Com um gatilho so — comecando exatamente no pin — chegar na secao era
         * ver a rolagem travar diante de um palco vazio, e o movimento comecar
         * depois. Duas coisas erradas ao mesmo tempo: a pagina parava e a cena
         * nao tinha comecado.
         */
        let entrada = 0;
        let presa = 0;
        const juntar = () => aplicar(entrada * FATIA_ENTRADA + presa * (1 - FATIA_ENTRADA));

        ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "top top",
          onUpdate: (t) => {
            entrada = t.progress;
            juntar();
          },
          onRefresh: (t) => {
            entrada = t.progress;
            juntar();
          },
        });

        /**
         * `refreshPriority` porque este pin empurra tudo que vem depois: na
         * hora de remedir ele precisa vir antes dos gatilhos de baixo, senao
         * eles se medem numa pagina que ainda nao tem o espacador. Fica abaixo
         * da prioridade do heroi, que por sua vez empurra esta secao.
         *
         * Sem `anticipatePin`: com a rolagem suave do Lenis ele adiantava o pin
         * por conta propria e produzia justamente o solavanco que esta secao
         * inteira existe para evitar.
         */
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "+=1700",
          pin: true,
          refreshPriority: 1,
          onUpdate: (t) => {
            presa = t.progress;
            juntar();
          },
          onRefresh: (t) => {
            presa = t.progress;
            juntar();
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
        O grupo inteiro fica centrado, e o palco tem TETO de altura.
        Com o palco livre para crescer, ele engolia toda a folga da tela e
        empurrava o titulo para longe dos cartoes. Limitado, a sobra se reparte
        em volta do grupo e o titulo desce para perto do que ele nomeia.
      */}
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center">
        {/*
          O titulo e desenhado dentro de um canvas, entao ele deixa de existir
          como texto: buscador nao indexa pixel e leitor de tela nao le WebGL.
          Estes dois blocos invisiveis devolvem o cabecalho e os nomes das
          categorias; as duas cenas ficam `aria-hidden` para nao duplicar.
        */}
        <h2 className="sr-only">{FRASE}</h2>
        <ul className="sr-only">
          {ROTULOS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <TextoWarp
          texto={FRASE}
          cor="#EDEEF0"
          className="h-[clamp(88px,14vh,152px)] w-full shrink-0"
          tamanho="clamp(1.7rem, 4.4vw, 3.2rem)"
          peso={700}
          familia="var(--fonte-display), sans-serif"
          espacamento="-0.02em"
          entrelinha={1}
          /* reto, ao contrario do heroi: o arco e a assinatura da abertura, e
             repetido aqui viraria maneirismo em vez de gesto */
          curvatura={0}
          revelacao={revelacao}
        />

        {/* a proporcao do palco e o que decide o arranjo la dentro: larga vira
            fileira de quatro, estreita vira 2x2. `min-h-0` porque um filho de
            flex nao encolhe abaixo do conteudo sem isso, e o palco voltaria a
            estourar a tela. */}
        <div data-palco className="mt-2 max-h-[58vh] min-h-0 w-full flex-1 md:mt-3">
          <CartoesTres rotulos={ROTULOS} progresso={progresso} />
        </div>
      </div>
    </section>
  );
}
