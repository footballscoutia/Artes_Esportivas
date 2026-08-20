import { notFound } from "next/navigation";
import { buscarPedido, geracoesDoPedido, buscarReferenciaPorId, listarMarcas } from "@/lib/dados";
import { DetalhePedido } from "@/components/app/DetalhePedido";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pedido = await buscarPedido(id);
  if (!pedido) notFound();

  // a referencia que ESTA arte usou, guardada no pedido — nao um sorteio novo
  const [geracoes, referencia, marcas] = await Promise.all([
    geracoesDoPedido(id),
    buscarReferenciaPorId(pedido.referencia_id),
    listarMarcas(),
  ]);

  return (
    <DetalhePedido
      pedido={pedido}
      geracoes={geracoes}
      marcas={marcas}
      promptMae={referencia?.prompt_mae ?? "Referência não encontrada."}
    />
  );
}
