import { listarMarcas } from "@/lib/dados";
import { Marcas } from "@/components/app/Marcas";

export default async function MarcasPage() {
  return <Marcas marcas={await listarMarcas()} />;
}
