/**
 * Config do Remotion. Nao afeta o build do Next — sao dois pipelines no mesmo
 * repositorio, e o unico ponto de contato e a composicao em src/video/.
 */
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(23);

/**
 * O bundler do Remotion tem webpack proprio e nao le o `paths` do tsconfig.
 *
 * Sem este alias a composicao so seria importavel por caminho relativo, e a
 * alternativa — manter uma copia dela dentro de remotion/ — significaria duas
 * versoes do mesmo video divergindo com o tempo, com o preview mentindo sobre
 * o que o render produz.
 */
Config.overrideWebpackConfig((atual) => ({
  ...atual,
  resolve: {
    ...atual.resolve,
    alias: {
      ...atual.resolve?.alias,
      "@": path.resolve(process.cwd(), "src"),
    },
  },
}));
