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

  images: {
    /**
     * As artes vem do Storage por URL assinada, que e host externo — sem esta
     * permissao o next/image recusa e a capa da fila fica vazia.
     *
     * O caminho e sempre /storage/v1/object/sign/..., nunca /public/: os tres
     * buckets sao privados e assim continuam.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
