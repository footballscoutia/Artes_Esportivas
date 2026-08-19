import { BotaoLink } from "@/components/ui/Button";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto grid max-w-md place-items-center gap-4 py-32 text-center">
      <h1 className="display text-3xl">Pedido não encontrado</h1>
      <p className="text-sm text-muted">Esse pedido não existe ou foi removido da fila.</p>
      <BotaoLink href="/fila" variante="sutil">
        Voltar para a fila
      </BotaoLink>
    </div>
  );
}
