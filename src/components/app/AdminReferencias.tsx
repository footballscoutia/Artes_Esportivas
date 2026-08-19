"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleCheck, CircleSlash, ImagePlus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, Chip, TituloSecao } from "@/components/ui/Card";
import { Campo, Textarea } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { FORMATOS, FORMATO_META, TIPOS, TIPO_META, type Referencia } from "@/lib/types";
import { cn, formatarData } from "@/lib/utils";

export function AdminReferencias({ referencias }: { referencias: Referencia[] }) {
  const [aberta, setAberta] = useState<Referencia | null>(null);
  const [prompt, setPrompt] = useState("");
  const [salvo, setSalvo] = useState(false);

  const ativas = referencias.filter((r) => r.ativa).length;

  function abrir(r: Referencia) {
    setAberta(r);
    setPrompt(r.prompt_mae);
    setSalvo(false);
  }

  return (
    <div className="mx-auto flex max-w-[1400px] animate-fade-up gap-4">
      <div className="min-w-0 flex-1">
        <TituloSecao
          titulo="Referências"
          descricao="Cada combinação de tipo e formato tem a sua arte curada e o seu prompt-mãe. Invisível para quem gera."
          acao={
            <span className="hidden shrink-0 rounded-full border border-line bg-surface-2/60 px-4 py-2 text-[13px] sm:block">
              <span className="font-medium">{ativas}</span>
              <span className="text-muted"> de {TIPOS.length * FORMATOS.length} ativas</span>
            </span>
          }
        />

        <div className="space-y-3">
          {TIPOS.map((t) => {
            const meta = TIPO_META[t];
            return (
              <Card key={t} className="p-4 sm:p-5">
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="font-mono text-[13px] text-accent">{meta.numero}</span>
                  <h3 className="text-[15px] font-medium tracking-tight">{meta.titulo}</h3>
                  <span className="truncate text-[12px] text-muted">{meta.descricao}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {FORMATOS.map((f) => {
                    const r = referencias.find((x) => x.tipo === t && x.formato === f);
                    if (!r) return null;
                    return (
                      <button
                        key={f}
                        onClick={() => abrir(r)}
                        className={cn(
                          "lift flex items-center gap-4 rounded-field border p-3 text-left",
                          aberta?.id === r.id
                            ? "border-accent/50 bg-accent/8"
                            : "border-line bg-surface-2/40 hover:border-line-2",
                        )}
                      >
                        <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[10px] bg-bg-2">
                          {r.imagem_url ? (
                            <Image
                              src={r.imagem_url}
                              alt=""
                              fill
                              sizes="56px"
                              className={cn("object-cover", !r.ativa && "opacity-30 grayscale")}
                            />
                          ) : (
                            <span className="grid h-full place-items-center text-muted-2">
                              <ImagePlus size={16} />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium">
                            {FORMATO_META[f].titulo}
                          </span>
                          <span className="block font-mono text-[11px] text-muted-2">
                            {FORMATO_META[f].w}×{FORMATO_META[f].h}
                          </span>
                          <span className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                            {r.ativa ? (
                              <>
                                <CircleCheck size={12} className="text-ok" />
                                <span className="text-muted">ativa · v{r.versao}</span>
                              </>
                            ) : (
                              <>
                                <CircleSlash size={12} className="text-muted-2" />
                                <span className="text-muted-2">inativa</span>
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Drawer
        aberto={Boolean(aberta)}
        aoFechar={() => setAberta(null)}
        titulo={aberta ? TIPO_META[aberta.tipo].titulo : ""}
        subtitulo={
          aberta ? (
            <span>
              {FORMATO_META[aberta.formato].titulo} · versão {aberta.versao} · atualizada em{" "}
              {formatarData(aberta.atualizado_em)}
            </span>
          ) : null
        }
        className="w-[min(440px,92vw)]"
        rodape={
          <div className="space-y-2">
            <Button
              className="w-full"
              disabled={!aberta || prompt === aberta.prompt_mae}
              onClick={() => setSalvo(true)}
            >
              <Save size={15} />
              Salvar como versão {aberta ? aberta.versao + 1 : ""}
            </Button>
            {salvo && (
              <p className="text-center text-[11px] text-ok">
                Nova versão registrada — as artes antigas continuam apontando para a v
                {aberta?.versao}
              </p>
            )}
          </div>
        }
      >
        {aberta && (
          <div className="space-y-5">
            <div
              className="relative w-full overflow-hidden rounded-field bg-bg-2"
              style={{ aspectRatio: FORMATO_META[aberta.formato].ratio }}
            >
              {aberta.imagem_url && (
                <Image
                  src={aberta.imagem_url}
                  alt="Arte de referência"
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip rotulo="Chave" valor={`${aberta.tipo} + ${aberta.formato}`} />
              <Chip rotulo="Versão" valor={aberta.versao} />
              <Chip rotulo="Estado" valor={aberta.ativa ? "ativa" : "inativa"} />
            </div>

            <Campo rotulo="Prompt-mãe" dica="usado em toda arte desse tipo">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-56 font-mono text-[12px] leading-relaxed"
              />
            </Campo>

            <Button variante="sutil" className="w-full">
              <ImagePlus size={15} />
              Trocar arte de referência
            </Button>

            <p className="text-[11px] leading-relaxed text-muted-2">
              Arte aprovada pode virar referência, mas só passando por aqui. Promoção
              automática faz o estilo derivar com o tempo.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
