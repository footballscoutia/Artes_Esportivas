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
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
