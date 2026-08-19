import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * A logo e lida por caminho em tempo de execucao, nao por import — o
   * rastreador do Next so inclui no bundle o que ve nos imports. Sem esta
   * linha, a composicao pode quebrar com ENOENT no servidor.
   */
  outputFileTracingIncludes: {
    "/api/gerar": ["public/brand/**/*"],
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
