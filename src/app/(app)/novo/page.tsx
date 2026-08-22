import { listarClubes, listarJogadores, listarMarcas } from "@/lib/dados";
import { NovaArte } from "@/components/app/NovaArte";

export default async function NovaArtePage() {
  // as duas listas vêm juntas: o passo do atleta e o do adversário são a mesma tela
  const [jogadores, clubes, marcas] = await Promise.all([
    listarJogadores(),
    listarClubes(),
    listarMarcas(),
  ]);
  return <NovaArte jogadores={jogadores} clubes={clubes} marcas={marcas} />;
}
