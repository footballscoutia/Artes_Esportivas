import { STATUS_META, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-bg/60 px-3 py-1 text-[12px] font-medium",
        className,
      )}
      style={{ color: meta.cor }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.cor }} />
      {meta.titulo}
    </span>
  );
}
