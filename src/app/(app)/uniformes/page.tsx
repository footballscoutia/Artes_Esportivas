import { listarClubes, listarUniformes } from "@/lib/dados";
import { Uniformes } from "@/components/app/Uniformes";

export default async function UniformesPage() {
  // as duas juntas: todo uniforme pertence a um clube, e a tela agrupa por ele
  const [uniformes, clubes] = await Promise.all([listarUniformes(), listarClubes()]);
  return <Uniformes uniformes={uniformes} clubes={clubes} />;
}
