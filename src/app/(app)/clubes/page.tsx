import { listarClubes } from "@/lib/dados";
import { Clubes } from "@/components/app/Clubes";

export default async function ClubesPage() {
  return <Clubes clubes={await listarClubes()} />;
}
