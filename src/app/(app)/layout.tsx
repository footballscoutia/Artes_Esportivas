import { TopNav } from "@/components/app/TopNav";
import { SecoesRodape } from "@/components/app/Secoes";
import { Rail } from "@/components/app/Rail";
import { usuarioAtual } from "@/lib/dados";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // TopNav e client component: quem fala com o banco e o layout, que e servidor
  const usuario = await usuarioAtual();

  return (
    <div className="relative z-10 min-h-dvh">
      <TopNav usuario={usuario} />
      {/* pb-24 no telefone: a barra de baixo e fixa e cobriria o fim da lista */}
      <div className="flex gap-4 px-4 pb-24 md:pb-10 lg:px-6">
        <Rail />
        {/*
          A transicao de rota mora em cada page.tsx, nao aqui. Layout persiste
          entre navegacoes, entao enter e exit nunca disparariam neste nivel —
          foi o motivo de a primeira tentativa nao animar nada.
        */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SecoesRodape />
    </div>
  );
}
