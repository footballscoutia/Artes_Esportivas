import { listarClubes, listarJogadores } from "@/lib/dados";
import { Elenco } from "@/components/app/Elenco";

export default async function ElencoPage() {
  const [jogadores, clubes] = await Promise.all([listarJogadores(), listarClubes()]);
  return <Elenco jogadores={jogadores} clubes={clubes} />;
}
