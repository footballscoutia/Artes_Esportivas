"use client";

import { useMemo, useRef, useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Archive, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { Campo, Input, Select } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { arquivarUniforme, salvarUniforme } from "@/lib/acoes";
import { encolherCampo } from "@/lib/encolher";
import type { Clube, Uniforme } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Cadastro dos uniformes.
 *
 * Mesma licao do escudo: o que o modelo nao recebe como imagem, ele desenha de
 * memoria — e camisa de memoria e o pior tipo de erro nestas artes, porque
 * parece certa. As cores batem, as faixas quase batem, e ninguem confere o
 * patrocinio nem o padrao da temporada.
 *
 * A foto e de ALGUEM VESTINDO, e nao mockup da camisa esticada: o modelo
 * precisa ver como o tecido cai no corpo, onde a manga termina, como a gola se
 * comporta. Mockup chapado produz camisa chapada.
 */
export function Uniformes({ uniformes, clubes }: { uniformes: Uniforme[]; clubes: Clube[] }) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [aberto, setAberto] = useState<"novo" | Uniforme | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const editando = aberto && aberto !== "novo" ? aberto : null;
  const nomeDoClube = useMemo(
    () => new Map(clubes.map((c) => [c.id, c.nome_curto ?? c.nome] as const)),
    [clubes],
  );

  /* Agrupado por clube: uniforme e do Flamengo, nao da agencia, e uma lista
     corrida de vinte camisas sem separacao nao se le. */
  const porClube = useMemo(() => {
    const mapa = new Map<string, Uniforme[]>();
    for (const u of uniformes) {
      const lista = mapa.get(u.clube_id) ?? [];
      lista.push(u);
      mapa.set(u.clube_id, lista);
    }
    return [...mapa.entries()];
  }, [uniformes]);

  function fechar() {
    setAberto(null);
    setPrevia(null);
    setErro(null);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    if (editando) dados.set("id", editando.id);

    setErro(null);
    comTransicao(async () => {
      await encolherCampo(dados, "imagem", "foto");
      const r = await salvarUniforme(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  function arquivar(u: Uniforme) {
    setErro(null);
    comTransicao(async () => {
      const r = await arquivarUniforme(u.id);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[1400px]">
        <TituloSecao
          titulo="Uniformes"
          descricao={
            uniformes.length === 0
              ? "Nenhum uniforme cadastrado"
              : `${uniformes.length} ${uniformes.length === 1 ? "uniforme" : "uniformes"}`
          }
          acao={
            <Button onClick={() => setAberto("novo")} disabled={clubes.length === 0}>
              <Plus size={16} />
              Novo uniforme
            </Button>
          }
        />

        {erro && (
          <p className="mb-4 rounded-field border border-erro/40 bg-erro/10 px-4 py-3 text-[13px] text-erro">
            {erro}
          </p>
        )}

        {clubes.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-6 py-10 text-center text-[13px] text-muted">
            Cadastre um clube primeiro. Todo uniforme pertence a um — é assim que a tela de gerar
            sabe quais mantos oferecer quando você escolhe o atleta.
          </p>
        ) : uniformes.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-6 py-10 text-center text-[13px] text-muted">
            Sem uniforme cadastrado, a camisa da arte sai da foto do atleta — que foi tirada uma vez
            e não acompanha a temporada. Suba uma foto de alguém vestindo o manto e o modelo passa a
            copiar dela.
          </p>
        ) : (
          <div className="space-y-8">
            {porClube.map(([clubeId, lista]) => (
              <section key={clubeId}>
                <h2 className="mb-3 text-[13px] font-medium text-muted">
                  {nomeDoClube.get(clubeId) ?? "Clube arquivado"}
                </h2>
                <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                  {lista.map((u) => (
                    <li
                      key={u.id}
                      className="overflow-hidden rounded-card border border-line bg-surface-2"
                    >
                      <div className="relative aspect-[3/4]">
                        {u.imagem_url && (
                          <Image
                            src={u.imagem_url}
                            alt={u.nome}
                            fill
                            sizes="240px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                        <button
                          onClick={() => setAberto(u)}
                          className="truncate text-left text-[13px] font-medium hover:text-accent"
                        >
                          {u.nome}
                        </button>
                        <button
                          onClick={() => arquivar(u)}
                          disabled={pendente}
                          title="Arquivar"
                          className="shrink-0 rounded-field p-1.5 text-muted-2 transition-colors hover:bg-surface-3 hover:text-text"
                        >
                          <Archive size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <Drawer
          aberto={Boolean(aberto)}
          aoFechar={fechar}
          titulo={editando ? "Editar uniforme" : "Novo uniforme"}
        >
          <form ref={formulario} onSubmit={enviar} className="grid gap-5">
            <div>
              <label
                /*
                  Altura fixa, e nao proporcao.
                  Com `aspect-[3/4]` num drawer de ~480px o box virava 640px de
                  altura: sozinho ele ocupava mais que a tela util e empurrava o
                  botao de salvar para fora da vista. A proporcao 3:4 e da FOTO,
                  nao do lugar onde ela e escolhida.
                */
                className={cn(
                  "relative grid h-[240px] w-full cursor-pointer place-items-center overflow-hidden",
                  "rounded-card border border-dashed border-line bg-surface-2 text-center",
                  "transition-colors hover:border-accent/50",
                )}
              >
                {(previa ?? editando?.imagem_url) && (
                  <Image
                    src={previa ?? editando?.imagem_url ?? ""}
                    alt=""
                    fill
                    sizes="380px"
                    className="object-contain p-2"
                  />
                )}
                <span className="relative z-10 grid place-items-center gap-2 rounded-field bg-bg/70 px-4 py-3 backdrop-blur-sm">
                  <ImagePlus size={18} className="text-muted" />
                  <span className="text-[12px] text-muted">
                    {previa || editando?.imagem_url ? "Trocar foto" : "Escolher foto"}
                  </span>
                </span>
                <input
                  type="file"
                  name="imagem"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPrevia(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                Foto de alguém <span className="text-muted">vestindo</span> a camisa, de frente e
                com boa luz — não o mockup esticado. O modelo precisa ver como o tecido cai no
                corpo; mockup chapado produz camisa chapada.
              </p>
            </div>

            <Campo rotulo="Clube" dica="de quem é este manto">
              <Select name="clube_id" required defaultValue={editando?.clube_id ?? ""}>
                <option value="" disabled>
                  Escolha o clube
                </option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>

            <Campo rotulo="Nome" dica="como você o chama">
              <Input
                name="nome"
                required
                defaultValue={editando?.nome ?? ""}
                placeholder="Titular 2026"
              />
            </Campo>

            <div className="flex justify-end gap-2">
              <Button type="button" variante="fantasma" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </ViewTransition>
  );
}
