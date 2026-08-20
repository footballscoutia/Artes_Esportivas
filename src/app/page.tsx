import { Landing } from "@/components/lp/Landing";

/**
 * A landing.
 *
 * Quem ja tem sessao nunca chega aqui: o proxy manda direto para /biblioteca,
 * porque quem entrou abriu o site para trabalhar, nao para ler a pagina de
 * venda. Esta rota atende so o visitante.
 */
export default function Home() {
  return <Landing />;
}
