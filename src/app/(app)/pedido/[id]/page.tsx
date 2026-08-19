import { notFound } from "next/navigation";
import { buscarPedido, geracoesDoPedido, buscarReferencia } from "@/lib/mock";
import { DetalhePedido } from "@/components/app/DetalhePedido";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = buscarPedido(id);
  if (!pedido) notFound();

  const geracoes = geracoesDoPedido(id);
  const referencia = buscarReferencia(pedido.tipo, pedido.formato);

  return (
    <DetalhePedido
      pedido={pedido}
      geracoes={geracoes}
      promptMae={referencia?.prompt_mae ?? "Referência não encontrada."}
    />
  );
}
