import { notFound } from "next/navigation";
import { listarReferencias, usuarioAtual } from "@/lib/dados";
import { AdminReferencias } from "@/components/app/AdminReferencias";

/**
 * Curadoria do acervo. Invisivel para quem so gera arte.
 *
 * A RLS ja impede que um perfil `submete` altere referencia, mas ele ainda
 * conseguiria LER — e o acervo e o ativo da agencia, nao algo para o cliente
 * folhear. Aqui a rota some por inteiro para quem nao aprova.
 */
export default async function ReferenciasPage() {
  const usuario = await usuarioAtual();
  if (usuario?.papel !== "aprova") notFound();

  return <AdminReferencias referencias={await listarReferencias()} />;
}
