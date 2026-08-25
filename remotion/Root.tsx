/**
 * Entrada do CLI do Remotion. A composicao NAO mora aqui — ela vive em
 * src/video/, de onde o app tambem a importa para o <Player>.
 *
 * Um lugar so: o que a pessoa ve no editor e literalmente o mesmo componente
 * que o servidor renderiza em mp4. Duplicar a composicao seria garantir que um
 * dia os dois divergem, e o preview passaria a mentir.
 */
import React from "react";
import { Composition, staticFile } from "remotion";
import { Matchday, type PropsMatchday } from "@/video/Matchday";
import { EsquemaMatchday, OPCOES_PADRAO } from "@/video/template";

/**
 * O catalogo de composicoes. `calculateMetadata` deixa a DURACAO vir das props,
 * que e o que torna "duracao" uma opcao de verdade em vez de uma constante —
 * o Player e o render leem o mesmo numero, da mesma fonte.
 */

const padrao: PropsMatchday = {
  dados: {
    rotulo: "MATCHDAY",
    nome: "Philippe Coutinho",
    clube: "Vasco",
    adversario: "Cabofriense",
    data: "QUINTA 30.07",
    hora: "20H30",
    estadio: "São Januário",
    campeonato: "Brasileirão",
  },
  camadas: {
    fundo: staticFile("video/fundo.png"),
    atleta: staticFile("video/atleta.png"),
    logo: staticFile("video/logo.png"),
    escudo: staticFile("video/escudo.png"),
  },
  opcoes: OPCOES_PADRAO,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="matchday"
    component={Matchday}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={240}
    /* O esquema vira o formulario do painel de props no Studio: seletor para o
       template, campo com limite para os numeros, seletor de cor para as
       cores. E o editor na forma mais crua que existe, sem tela escrita. */
    schema={EsquemaMatchday}
    defaultProps={padrao}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.round((props.opcoes?.duracao ?? 8) * 30),
    })}
  />
);
