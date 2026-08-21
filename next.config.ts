import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Rede de seguranca, nao a correcao.
       *
       * O padrao e 1MB, e estourar nao devolve erro tratavel: a requisicao
       * morre durante a leitura, antes de a acao rodar, e a tela mostra "server
       * error" em vez de uma frase. Quem resolve de verdade e o `encolher.ts`,
       * que reduz a imagem no navegador; este teto cobre o que ele nao alcanca
       * — SVG e formatos que o `createImageBitmap` recusa passam intactos.
       *
       * 4MB e nao mais: o teto de corpo de uma funcao na Vercel e 4,5MB, entao
       * qualquer valor acima disso seria mentira — o 413 viria de la, com uma
       * mensagem que nao e nossa.
       */
      bodySizeLimit: "4mb",
    },
  },

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
