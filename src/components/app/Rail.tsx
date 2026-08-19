"use client";

import { useRouter } from "next/navigation";
import { Plus, Search, Bell, Clock, Download, CircleHelp } from "lucide-react";
import { BotaoIcone } from "@/components/ui/Button";

/**
 * Rail vertical de acoes rapidas, no lugar onde o Healix poe as ferramentas
 * do documento aberto. Navegacao por secao fica no nav de cima.
 */
export function Rail() {
  const router = useRouter();

  return (
    <div className="sticky top-24 hidden w-14 shrink-0 flex-col items-center gap-2 lg:flex">
      <BotaoIcone titulo="Gerar arte" ativo onClick={() => router.push("/novo")}>
        <Plus size={18} strokeWidth={2} />
      </BotaoIcone>
      <BotaoIcone titulo="Buscar pedido" onClick={() => router.push("/fila")}>
        <Search size={17} strokeWidth={1.75} />
      </BotaoIcone>
      <BotaoIcone titulo="Aguardando aprovação" onClick={() => router.push("/fila?f=em_revisao")}>
        <Clock size={17} strokeWidth={1.75} />
      </BotaoIcone>
      <BotaoIcone titulo="Aprovadas" onClick={() => router.push("/fila?f=aprovado")}>
        <Download size={17} strokeWidth={1.75} />
      </BotaoIcone>

      <span className="my-2 h-px w-6 bg-line" />

      <BotaoIcone titulo="Notificações">
        <Bell size={17} strokeWidth={1.75} />
      </BotaoIcone>
      <BotaoIcone titulo="Como funciona">
        <CircleHelp size={17} strokeWidth={1.75} />
      </BotaoIcone>
    </div>
  );
}
