import { cn } from "@/lib/utils";

export function Campo({
  rotulo,
  dica,
  children,
  className,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-text">{rotulo}</span>
        {dica && <span className="text-[12px] text-muted-2">{dica}</span>}
      </span>
      {children}
    </label>
  );
}

const base =
  "w-full rounded-field border border-line bg-surface-2/60 px-4 text-sm text-text placeholder:text-muted-2 " +
  "transition-colors focus:border-accent/50 focus:bg-surface-2 focus:outline-none";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-12", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-28 py-3.5 leading-relaxed", className)} {...props} />;
}
