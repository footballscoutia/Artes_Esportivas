/**
 * Config do Remotion. Nao afeta o build do Next — sao dois pipelines no mesmo
 * repositorio, e o unico ponto de contato e a pasta `public/`, de onde o
 * `staticFile()` le as camadas.
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(18);
