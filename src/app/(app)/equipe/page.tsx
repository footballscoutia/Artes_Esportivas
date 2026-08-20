import { listarEquipe, usuarioAtual } from "@/lib/dados";
import { Equipe } from "@/components/app/Equipe";

export default async function EquipePage() {
  const [{ contas, convites }, usuario] = await Promise.all([listarEquipe(), usuarioAtual()]);
  return <Equipe contas={contas} convites={convites} usuario={usuario} />;
}
