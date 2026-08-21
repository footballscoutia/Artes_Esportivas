import { listarAcessos, usuarioAtual } from "@/lib/dados";
import { Conta } from "@/components/app/Conta";

export default async function ContaPage() {
  const usuario = await usuarioAtual();
  /* A lista so e buscada para quem administra: para os demais a funcao no
     banco recusaria de qualquer jeito, e pedir para levar um nao e round-trip
     jogado fora em toda visita a tela. */
  const acessos = usuario?.ehAdmin ? await listarAcessos() : [];
  return <Conta usuario={usuario} acessos={acessos} />;
}
