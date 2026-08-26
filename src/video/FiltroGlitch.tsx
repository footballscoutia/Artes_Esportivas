import React from "react";

/**
 * Separação de canais de cor — a aberração cromática que se lê como glitch.
 *
 * A PRIMEIRA VERSÃO ESTAVA ERRADA de dois jeitos, e vale registrar os dois.
 *
 * Na composição, eu duplicava a imagem de fundo, tingia cada cópia e somava com
 * `mixBlendMode: screen`. Funcionava a meias: só o FUNDO glitchava, então o
 * atleta e o texto continuavam nítidos por cima — e um glitch que não pega o
 * quadro inteiro não lê como falha de sinal, lê como uma imagem estranha atrás
 * de uma imagem normal.
 *
 * E na prévia do seletor eu simplesmente não implementei: o `rgb` da deformação
 * era ignorado, e a caixa mostrava um texto parado. A pessoa escolhia "Cores
 * separadas" olhando para nada.
 *
 * Um filtro SVG resolve os dois. Ele desloca o VERMELHO para um lado, o AZUL
 * para o outro, mantém o VERDE no lugar e soma os três — que é literalmente o
 * que uma TV analógica fazia quando perdia sincronia. Aplicado ao elemento pai,
 * pega tudo que está dentro dele de uma vez, sem duplicar camada nenhuma.
 *
 * `dx` vem animado a cada quadro: como o React redesenha o filtro junto, não é
 * preciso animação declarativa em SMIL — que, aliás, o renderizador não
 * garantiria quadro a quadro.
 */

export const ID_GLITCH = "glitch-canais";

export function FiltroGlitch({ dx, id = ID_GLITCH }: { dx: number; id?: string }) {
  const d = Math.max(0, dx);
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx={-d} dy={0} result="deslocadoR" />
          <feColorMatrix
            in="deslocadoR"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="canalR"
          />
          <feOffset in="SourceGraphic" dx={d} dy={0} result="deslocadoB" />
          <feColorMatrix
            in="deslocadoB"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="canalB"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="canalG"
          />
          {/* Soma aritmética em vez de `screen`: `screen` clareia o conjunto e
              lava a imagem; a soma direta mantém o preto preto e deixa a franja
              colorida só onde há borda, que é onde a aberração de verdade
              aparece. */}
          <feComposite in="canalR" in2="canalG" operator="arithmetic" k2="1" k3="1" result="rg" />
          <feComposite in="rg" in2="canalB" operator="arithmetic" k2="1" k3="1" />
        </filter>
      </defs>
    </svg>
  );
}
