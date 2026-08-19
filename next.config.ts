import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * As fontes de `assets/fontes/` nao sao importadas por nenhum modulo — o
   * compose.ts as le por caminho, em tempo de execucao. O rastreador do Next
   * so inclui no bundle o que ve nos imports, entao sem esta lista os .ttf nao
   * chegariam ao servidor e a composicao quebraria com ENOENT.
   *
   * `/api/gerar` e quem compoe hoje. Se outra rota passar a compor, entra aqui.
   */
  outputFileTracingIncludes: {
    "/api/gerar": ["assets/fontes/**/*", "public/brand/**/*"],
  },
};

export default nextConfig;
