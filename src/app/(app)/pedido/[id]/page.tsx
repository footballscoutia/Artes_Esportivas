import { notFound } from "next/navigation";
import { buscarPedido, geracoesDoPedido, buscarReferencia } from "@/lib/dados";
import { DetalhePedido } from "@/components/app/DetalhePedido";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = await buscarPedido(id);
  if (!pedido) notFound();

  // independentes entre si — nao ha motivo para esperar uma antes da outra
  const [geracoes, referencia] = await Promise.all([
    geracoesDoPedido(id),
    buscarReferencia(pedido.tipo, pedido.formato),
  ]);

  return (
    <DetalhePedido
      pedido={pedido}
      geracoes={geracoes}
      promptMae={referencia?.prompt_mae ?? "Referência não encontrada."}
    />
  );
}
