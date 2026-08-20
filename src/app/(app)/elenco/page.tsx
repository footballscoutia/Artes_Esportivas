import { listarJogadores } from "@/lib/dados";
import { Elenco } from "@/components/app/Elenco";

export default async function ElencoPage() {
  return <Elenco jogadores={await listarJogadores()} />;
}
