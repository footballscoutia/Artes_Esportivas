"use client";

import { useRef, useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Archive, ImagePlus, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { Campo, Input } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { arquivarClube, salvarClube } from "@/lib/acoes";
import { encolherCampo } from "@/lib/encolher";
import type { Clube } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Cadastro de clubes.
 *
 * O escudo vai para o modelo como IMAGEM de referencia, e as cores entram no
 * prompt como texto. Nas 78 artes do acervo a paleta inteira sai do clube, e
 * escudo descrito em palavras sai inventado.
 */
/**
 * Uma cor como quadrado clicavel, nao como campo de texto.
 *
 * O seletor nativo faz o trabalho: o valor certo ja vem do escudo, e corrigir e
 * apontar para a cor, nunca digitar um hex — que era o que o formulario pedia
 * antes, e ninguem sabe de cor.
 */
function Amostra({ nome, rotulo, valor }: { nome: string; rotulo: string; valor: string }) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-field border border-line bg-surface-2/60 p-2.5 transition-colors hover:border-line-2">
      <input
        type="color"
        name={nome}
        defaultValue={valor}
        className="size-8 shrink-0 cursor-pointer rounded-[6px] border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-[4px] [&::-webkit-color-swatch]:border-0"
      />
      <span className="text-[12px] text-muted">{rotulo}</span>
    </label>
  );
}

export function Clubes({ clubes }: { clubes: Clube[] }) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [aberto, setAberto] = useState<Clube | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const editando = aberto && aberto !== "novo" ? aberto : null;

  function abrir(alvo: Clube | "novo") {
    setAberto(alvo);
    setErro(null);
    setPrevia(null);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    if (editando) dados.set("id", editando.id);

    setErro(null);
    comTransicao(async () => {
      /* encolhe antes de enviar: acima do teto de corpo a requisição morre
         durante a leitura e a pessoa vê "server error", não uma mensagem */
      await encolherCampo(dados, "escudo", "escudo");
      const r = await salvarClube(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(null);
      setPrevia(null);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[1400px]">
        <TituloSecao
          titulo="Clubes"
          descricao={
            clubes.length
              ? `${clubes.length} ${clubes.length === 1 ? "clube cadastrado" : "clubes cadastrados"}`
              : "Nenhum clube cadastrado"
          }
          acao={
            <Button onClick={() => abrir("novo")}>
              <Plus size={15} strokeWidth={2.2} />
              Cadastrar clube
            </Button>
          }
        />

        {clubes.length === 0 ? (
          <div className="surface grid place-items-center gap-4 rounded-card py-24 text-center">
            <Shield size={26} className="text-muted-2" strokeWidth={1.5} />
            <div>
              <p className="font-medium">Cadastre o primeiro clube</p>
              <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-muted">
                O escudo vai junto com o pedido e a arte sai com as cores certas. Sem ele, o modelo
                inventa um brasão, e brasão inventado parece brasão.
              </p>
            </div>
            <Button variante="sutil" tamanho="sm" onClick={() => abrir("novo")}>
              Cadastrar clube
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
            {clubes.map((c) => (
              <button
                key={c.id}
                onClick={() => abrir(c)}
                className="lift holofote surface group overflow-hidden rounded-card p-4 text-left"
              >
                <span className="relative mx-auto block size-20 shrink-0">
                  {c.escudo_url ? (
                    <Image
                      src={c.escudo_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain transition-transform duration-[400ms] group-hover:scale-[1.06]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-muted-2">
                      <Shield size={22} strokeWidth={1.5} />
                    </span>
                  )}
                </span>
                <span className="mt-3.5 line-clamp-2 block text-center text-[14px] font-medium leading-snug">
                  {c.nome}
                </span>
                <span className="mt-2 flex items-center justify-center gap-1.5">
                  {[c.cor_primaria, c.cor_secundaria].filter(Boolean).map((cor) => (
                    <span
                      key={cor}
                      className="size-3 rounded-full border border-line"
                      style={{ background: cor as string }}
                    />
                  ))}
                  {!c.cor_primaria && (
                    <span className="text-[11px] text-muted-2">sem cores</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        <Drawer
          aberto={Boolean(aberto)}
          aoFechar={() => setAberto(null)}
          titulo={editando ? editando.nome : "Cadastrar clube"}
          subtitulo={<span>Escudo e cores. É o que dá identidade à arte</span>}
          className="w-[min(420px,92vw)]"
          rodape={
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={pendente}
                onClick={() => formulario.current?.requestSubmit()}
              >
                {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
              </Button>
              {editando && (
                <Button
                  variante="fantasma"
                  className="w-full"
                  disabled={pendente}
                  onClick={() =>
                    comTransicao(async () => {
                      const r = await arquivarClube(editando.id);
                      if (!r.ok) return setErro(r.erro);
                      setAberto(null);
                      router.refresh();
                    })
                  }
                >
                  <Archive size={15} />
                  Arquivar
                </Button>
              )}
              {erro && (
                <p className="rounded-field border border-erro/40 bg-erro/10 p-3 text-center text-[12px]">
                  {erro}
                </p>
              )}
            </div>
          }
        >
          <form ref={formulario} onSubmit={enviar} className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium">Escudo</p>
              <label
                className={cn(
                  "relative grid aspect-square w-full cursor-pointer place-items-center overflow-hidden",
                  "rounded-card border border-dashed border-line bg-surface-2 text-center",
                  "transition-colors hover:border-accent/50",
                )}
              >
                {(previa ?? editando?.escudo_url) && (
                  <Image
                    src={previa ?? editando?.escudo_url ?? ""}
                    alt=""
                    fill
                    sizes="380px"
                    className="object-contain p-8"
                  />
                )}
                <span className="relative z-10 grid place-items-center gap-2 rounded-field bg-bg/70 px-4 py-3 backdrop-blur-sm">
                  <ImagePlus size={18} className="text-muted" />
                  <span className="text-[12px] text-muted">
                    {previa || editando?.escudo_url ? "Trocar escudo" : "Escolher escudo"}
                  </span>
                </span>
                <input
                  type="file"
                  name="escudo"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPrevia(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                PNG com fundo transparente funciona melhor. O modelo recebe essa imagem e copia o
                escudo em vez de desenhar um parecido.
              </p>
            </div>

            <Campo rotulo="Nome" dica="como está no cadastro">
              <Input name="nome" required defaultValue={editando?.nome ?? ""} placeholder="Estoril Praia" />
            </Campo>
            <Campo rotulo="Nome na arte" dica="opcional, quando o cadastro é longo">
              <Input name="nome_curto" defaultValue={editando?.nome_curto ?? ""} placeholder="Estoril" />
            </Campo>

            {previa ? (
              <p className="text-[11px] leading-relaxed text-muted-2">
                As cores do clube serão lidas do novo escudo ao salvar.
              </p>
            ) : editando?.cor_primaria ? (
              <div>
                <p className="mb-2 text-[13px] font-medium">Cores da arte</p>
                <div className="flex gap-3">
                  <Amostra nome="cor_primaria" rotulo="Primária" valor={editando.cor_primaria} />
                  <Amostra
                    nome="cor_secundaria"
                    rotulo="Secundária"
                    valor={editando.cor_secundaria ?? "#FFFFFF"}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                  Lidas do escudo. Elas mandam na paleta da arte inteira, não só no brasão —
                  clique para corrigir se alguma saiu errada.
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted-2">
                As cores do clube saem do escudo enviado e mandam na paleta da arte inteira, não
                só no brasão. É assim que as referências do acervo funcionam.
              </p>
            )}
          </form>
        </Drawer>
      </div>
    </ViewTransition>
  );
}
