"use client";

import { useRouter } from "next/navigation";
import { Images, Layers } from "lucide-react";
import { BotaoIcone } from "@/components/ui/Button";

/**
 * Rail vertical de acoes rapidas, no lugar onde o Healix poe as ferramentas
 * do documento aberto. Navegacao por secao fica no nav de cima.
 */
export function Rail() {
  const router = useRouter();

  return (
    <div className="sticky top-24 hidden w-14 shrink-0 flex-col items-center gap-2 lg:flex">
      <BotaoIcone titulo="Biblioteca" onClick={() => router.push("/biblioteca")}>
        <Images size={17} strokeWidth={1.75} />
      </BotaoIcone>
      <BotaoIcone titulo="Referências" onClick={() => router.push("/admin/referencias")}>
        <Layers size={17} strokeWidth={1.75} />
      </BotaoIcone>

    </div>
  );
}
