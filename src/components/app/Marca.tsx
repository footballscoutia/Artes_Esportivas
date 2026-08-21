import { cn } from "@/lib/utils";

/**
 * A marca do MatchPost — "Placar", escolhida entre dez direções propostas.
 *
 * Sem arquivo de imagem: e tipografia (Anton, a mesma do h1 em toda tela) e
 * uma cor de marca fixa, entao escala em qualquer tamanho so trocando o
 * tamanho da fonte via `className` — sem exportar PNG de novo a cada ajuste.
 *
 * "MATCH" segue o tema (`text-text`); o bloco do "POST" e a cor da marca,
 * fixa nos dois temas — do jeito que uma marca nao muda com claro/escuro.
 *
 * A logo do Marcio (e a de qualquer outro cliente) NAO mora aqui: mora na
 * tabela `marcas`, e e so o que entra carimbado na arte gerada. Isto aqui e a
 * marca do produto em si.
 */
export function Marca({ className }: { className?: string }) {
  return (
    <span
      style={{ fontFamily: "var(--fonte-display)" }}
      className={cn("inline-flex items-center leading-none tracking-[0.01em]", className)}
    >
      <span className="text-text">MATCH</span>
      <span className="-skew-x-[9deg] bg-[#2E7CFF] pl-[0.16em] pr-[0.14em] pt-[0.04em] text-[#050608]">
        <span className="inline-block skew-x-[9deg]">POST</span>
      </span>
    </span>
  );
}
