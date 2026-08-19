import { TopNav } from "@/components/app/TopNav";
import { Rail } from "@/components/app/Rail";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-dvh">
      <TopNav />
      <div className="flex gap-4 px-4 pb-10 lg:px-6">
        <Rail />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
