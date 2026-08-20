import { ViewTransition } from "react";
import { TopNav } from "@/components/app/TopNav";
import { Rail } from "@/components/app/Rail";
import { usuarioAtual } from "@/lib/dados";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // TopNav e client component: quem fala com o banco e o layout, que e servidor
  const usuario = await usuarioAtual();

  return (
    <div className="relative z-10 min-h-dvh">
      <TopNav usuario={usuario} />
      <div className="flex gap-4 px-4 pb-10 lg:px-6">
        <Rail />
        {/*
          Trocar de rota trocava a tela de uma vez, sem nada ligando as duas.
          Aqui o conteudo antigo sai rapido e o novo chega depois que ele
          terminou. A barra e o rail ficam parados de proposito: o que nao
          mudou nao deve se mexer.
        */}
        <main className="min-w-0 flex-1">
          <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
            {children}
          </ViewTransition>
        </main>
      </div>
    </div>
  );
}
