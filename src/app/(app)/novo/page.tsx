import {
  listarClubes,
  listarJogadores,
  listarMarcas,
  listarPadroes,
  listarUniformes,
} from "@/lib/dados";
import { NovaArte } from "@/components/app/NovaArte";

export default async function NovaArtePage() {
  // as duas listas vêm juntas: o passo do atleta e o do adversário são a mesma tela
  const [jogadores, clubes, marcas, uniformes, padroes] = await Promise.all([
    listarJogadores(),
    listarClubes(),
    listarMarcas(),
    listarUniformes(),
    listarPadroes(),
  ]);
  return (
    <NovaArte
      jogadores={jogadores}
      clubes={clubes}
      marcas={marcas}
      uniformes={uniformes}
      padroes={padroes}
    />
  );
}
