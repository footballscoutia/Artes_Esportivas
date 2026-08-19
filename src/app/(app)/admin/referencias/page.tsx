import { listarReferencias } from "@/lib/dados";
import { AdminReferencias } from "@/components/app/AdminReferencias";

export default async function ReferenciasPage() {
  return <AdminReferencias referencias={await listarReferencias()} />;
}
