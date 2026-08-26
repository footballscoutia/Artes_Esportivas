"use client";

import React, { useEffect, useRef, useState } from "react";
import { FONTES } from "@/video/fontes";
import { FiltroGlitch } from "@/video/FiltroGlitch";
import {
  ENTRADAS,
  deformacaoDaTransicao,
  estiloDoIntro,
  duracaoDaTransicao,
  estiloDaDeformacao,
  estiloDaEntrada,
  progressoDaLetra,
  type Opcoes,
} from "@/video/template";

/**
 * A transição acontecendo, na fonte que a pessoa escolheu.
 *
 * Uma lista de dez nomes — "Whip", "Punch", "Estica" — não é escolha, é
 * adivinhação. E a prévia dentro do vídeo pronto só existe DEPOIS de gerar, que
 * é tarde demais: a pergunta acontece antes.
 *
 * Então a prévia mostra o que dá para mostrar sem o vídeo existir: a palavra,
 * na fonte escolhida, sofrendo a mesma deformação que o quadro inteiro vai
 * sofrer. A conta é literalmente a de `deformacaoDaTransicao`, importada — e
 * não uma imitação dela, porque imitação diverge e prévia que mente é pior que
 * prévia nenhuma.
 *
 * UM relógio para todas as prévias, no componente pai. Dez `requestAnimationFrame`
 * independentes fariam dez animações fora de fase, e comparar duas coisas que
 * não acontecem ao mesmo tempo é justamente o que a pessoa não consegue fazer.
 */

/**
 * Um ciclo completo — pausa, transicao, pausa — em milissegundos.
 *
 * Curto de proposito: a transicao ocupa uma FATIA proporcional a duracao real
 * dela, e um ciclo longo faria a versao rapida virar um piscar perdido no meio
 * de dois segundos de nada.
 */
const CICLO = 1600;

export function useRelogioDaPrevia(ligado: boolean) {
  const [t, setT] = useState(0);
  const quadro = useRef(0);

  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    const passo = () => {
      if (!vivo) return;
      setT(((Date.now() % CICLO) / CICLO));
      quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => {
      vivo = false;
      cancelAnimationFrame(quadro.current);
    };
  }, [ligado]);

  return t;
}

export function PreviaDaTransicao({
  transicao,
  fonte,
  intensidade,
  velocidade,
  texto,
  t,
}: {
  transicao: string;
  fonte: Opcoes["fonte"];
  intensidade: number;
  velocidade: number;
  texto: string;
  /** 0..1 do ciclo, vindo do relógio compartilhado. */
  t: number;
}) {
  const f = FONTES[fonte];

  /**
   * O ciclo é maior que a transição: ela ocupa uma FATIA dele e o resto é
   * repouso. Uma transição em laço contínuo vira tremeliques sem começo nem
   * fim, e não dá para ver o gesto — é a pausa que revela o movimento.
   */
  /* A fatia sai da duracao REAL da transicao em vez de um numero fixo: e o
     que faz a previa mostrar a velocidade escolhida. Com teto, senao uma
     transicao lenta ocuparia o ciclo inteiro e a pausa — que e o que deixa o
     gesto visivel — desapareceria. */
  const FATIA = Math.min(0.62, (duracaoDaTransicao(velocidade) * 1000) / CICLO);
  const inicio = (1 - FATIA) / 2;
  const dentro = t > inicio && t < inicio + FATIA;
  const u = dentro ? (t - inicio) / FATIA : t <= inicio ? 0 : 1;

  const def = deformacaoDaTransicao(transicao, u, intensidade, t * 60);
  const estilo = estiloDaDeformacao(def);

  /* O id do filtro precisa ser UNICO por previa: dez caixas na tela com o
     mesmo `id` fariam todas usarem o deslocamento da ultima montada, e nove
     delas mostrariam o glitch de outra. */
  const idFiltro = `glitch-previa-${transicao.replace(/[^a-z]/gi, "")}`;

  return (
    <span className="relative mt-1.5 block h-[40px] overflow-hidden rounded-field bg-bg-2">
      {def.rgb > 0.5 && <FiltroGlitch dx={def.rgb * 0.55} id={idFiltro} />}
      <span
        className="absolute inset-0 grid place-items-center"
        style={{
          transform: estilo.transform,
          filter: [estilo.filter, def.rgb > 0.5 ? `url(#${idFiltro})` : null]
            .filter(Boolean)
            .join(" ") || undefined,
        }}
      >
        <span
          className="truncate px-2"
          style={{
            fontFamily: f.familia,
            fontWeight: f.peso,
            fontSize: 20,
            letterSpacing: 20 * f.aperto,
            transform: f.inclinacao ? `skewX(${f.inclinacao}deg)` : undefined,
            color: "var(--text)",
            lineHeight: 1.1,
          }}
        >
          {texto}
        </span>
      </span>

      {def.clarao > 0.01 && (
        <span
          className="absolute inset-0"
          style={{
            background: def.veuCor === "clube" ? "var(--accent)" : "#fff",
            opacity: def.clarao * 0.55,
          }}
        />
      )}
      {def.escurece > 0.01 && (
        <span
          className="absolute inset-0"
          style={{ background: "#000", opacity: def.escurece * 0.9 }}
        />
      )}

      {/* As fatias tambem aparecem aqui: sem elas, "Fatias deslocadas" e
          "Cores separadas" ficariam identicas na previa, e escolher entre
          duas caixas iguais nao e escolher. */}
      {def.fatias > 0 &&
        Array.from({ length: def.fatias }).map((_, i) => {
          const altura = 100 / def.fatias;
          const desloca = Math.sin((i + t * 42) * 2.1) * 14;
          return (
            <span
              key={i}
              className="absolute inset-0 grid place-items-center"
              style={{
                clipPath: `inset(${i * altura}% 0 ${100 - (i + 1) * altura}% 0)`,
                transform: `translateX(${desloca.toFixed(1)}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: f.familia,
                  fontWeight: f.peso,
                  fontSize: 20,
                  letterSpacing: 20 * f.aperto,
                  transform: f.inclinacao ? `skewX(${f.inclinacao}deg)` : undefined,
                  color: "var(--text)",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                {texto}
              </span>
            </span>
          );
        })}
    </span>
  );
}

/**
 * A entrada do texto acontecendo, na fonte escolhida.
 *
 * Mesma logica da previa de transicao, e o mesmo calculo do video — importado,
 * nao imitado. A diferenca e que aqui o gesto ocupa a PRIMEIRA parte do ciclo e
 * o resto e repouso: entrada tem comeco e fim, e mostrar so o meio dela nao
 * diria nada.
 */
export function PreviaDaEntrada({
  entrada,
  fonte,
  texto,
  t,
}: {
  entrada: string;
  fonte: Opcoes["fonte"];
  texto: string;
  t: number;
}) {
  const f = FONTES[fonte];
  const FATIA = 0.5;
  const p = Math.max(0, Math.min(1, t / FATIA));
  const meta = ENTRADAS[entrada as keyof typeof ENTRADAS];
  const e = estiloDaEntrada(entrada, p);

  const base: React.CSSProperties = {
    fontFamily: f.familia,
    fontWeight: f.peso,
    fontSize: 19,
    letterSpacing: 19 * f.aperto,
    color: "var(--text)",
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  };

  return (
    <span className="relative mt-1.5 block h-[40px] overflow-hidden rounded-field bg-bg-2">
      <span className="absolute inset-0 grid place-items-center">
        <span
          style={{
            ...base,
            transform: f.inclinacao ? `skewX(${f.inclinacao}deg)` : undefined,
          }}
        >
          {meta?.porLetra ? (
            [...texto].map((c, i) => {
              const pl = progressoDaLetra(p, i, [...texto].length, entrada);
              if (c === " ") return <span key={i}>{" "}</span>;
              const d = entrada === "onda" ? (1 - pl) * 22 : (1 - pl) * 8;
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: pl,
                    transform: `translateY(${d.toFixed(1)}px)`,
                  }}
                >
                  {c}
                </span>
              );
            })
          ) : (
            <span
              style={{
                display: "inline-block",
                opacity: e.opacity,
                transform: e.transform,
                filter: e.filter,
                clipPath: e.clipPath,
              }}
            >
              {texto}
            </span>
          )}
        </span>
      </span>
    </span>
  );
}
/**
 * A intro acontecendo, com o escudo de verdade quando ele existe.
 *
 * Sem escudo carregado — atleta ainda nao escolhido — cai num escudo generico
 * desenhado em SVG. E melhor que nada: o gesto e o que esta sendo escolhido, e
 * ele se le igual num brasao qualquer.
 */
export function PreviaDoIntro({
  efeito,
  escudoUrl,
  t,
}: {
  efeito: string;
  escudoUrl?: string;
  t: number;
}) {
  /* O gesto ocupa a primeira metade e o resto e repouso: abertura tem comeco
     e fim, e um laco continuo nao deixa ver onde ela assenta. */
  const p = Math.max(0, Math.min(1, t / 0.55));
  const e = estiloDoIntro(efeito, p);

  return (
    <span className="relative mt-1.5 block h-[44px] overflow-hidden rounded-field bg-black/70">
      <span className="absolute inset-0 grid place-items-center">
        <span
          style={{
            opacity: e.opacity,
            transform: e.transform,
            filter: e.filter,
            clipPath: e.clipPath,
            display: "inline-flex",
          }}
        >
          {escudoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={escudoUrl} alt="" style={{ height: 30, width: "auto" }} />
          ) : (
            <svg width="24" height="29" viewBox="0 0 30 36" aria-hidden>
              <path d="M15 1 L29 6 V19 C29 27 22 33 15 35 C8 33 1 27 1 19 V6 Z" fill="currentColor" opacity="0.85" />
            </svg>
          )}
        </span>
      </span>
    </span>
  );
}