"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Uploader({
  arquivo,
  aoEscolher,
}: {
  arquivo: File | null;
  aoEscolher: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  function receber(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    aoEscolher(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        const f = e.dataTransfer.files?.[0];
        if (f?.type.startsWith("image/")) receber(f);
      }}
      className={cn(
        "relative grid min-h-56 place-items-center rounded-card border border-dashed p-6 text-center transition-colors",
        arrastando ? "border-accent/60 bg-accent/5" : "border-line-2 bg-surface-2/40",
      )}
    >
      {arquivo && preview ? (
        <div className="flex w-full items-center gap-4 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Pré-visualização da foto do jogador"
            className="size-28 rounded-field object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{arquivo.name}</p>
            <p className="mt-1 text-[12px] text-muted">
              {(arquivo.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-3 text-[12px] text-accent hover:underline"
            >
              Trocar foto
            </button>
          </div>
          <button
            type="button"
            onClick={() => receber(null)}
            aria-label="Remover foto"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="grid gap-3 justify-items-center">
          <span className="grid size-12 place-items-center rounded-full border border-line bg-surface-2 text-muted">
            <ImagePlus size={20} strokeWidth={1.6} />
          </span>
          <span className="text-sm font-medium">Arraste a foto do jogador ou clique para escolher</span>
          <span className="text-[12px] text-muted">
            JPG ou PNG, de preferência o atleta inteiro e nítido — quanto melhor a
            foto, menos erro de rosto e de mão na arte
          </span>
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => receber(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
