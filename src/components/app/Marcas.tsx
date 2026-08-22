"use client";

import { useRef, useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Archive, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { Campo, Input } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { arquivarMarca, salvarMarca } from "@/lib/acoes";
import { encolherCampo } from "@/lib/encolher";
import type { Marca } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Cadastro das logos.
 *
 * Ate esta tela existir, a unica logo do sistema tinha entrado por script: nao
 * havia porta de entrada nenhuma, e "cadastrar a logo do cliente" queria dizer
 * abrir o terminal. Tarefa assim ou nao acontece, ou acontece errado.
 *
 * Uma agencia cadastra varias: a dela e a de cada cliente. Qual entra em cada
 * arte e escolha da geracao, na tela de Nova arte — nao um ajuste da conta.
 */
/**
 * A logo entra na arte com 30% da largura do formato — 324px no feed de 1080.
 * O confortável é o dobro: dá margem para o recorte, para telas densas e para
 * um dia a logo aparecer maior sem precisar recadastrar nada.
 */
const LARGURA_NA_ARTE = Math.round(1080 * 0.3);
const LARGURA_CONFORTAVEL = LARGURA_NA_ARTE * 2;

export function Marcas({ marcas }: { marcas: Marca[] }) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [aberto, setAberto] = useState<"nova" | Marca | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [largura, setLargura] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const editando = aberto && aberto !== "nova" ? aberto : null;

  function fechar() {
    setAberto(null);
    setPrevia(null);
    setLargura(null);
    setErro(null);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    if (editando) dados.set("id", editando.id);

    setErro(null);
    comTransicao(async () => {
      /* mesma razao dos escudos: acima do teto de corpo a requisição morre
         durante a leitura e a tela mostra "server error", não uma frase */
      await encolherCampo(dados, "imagem", "escudo");
      const r = await salvarMarca(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  function arquivar(m: Marca) {
    setErro(null);
    comTransicao(async () => {
      const r = await arquivarMarca(m.id);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[1400px]">
        <TituloSecao
          titulo="Logos"
          descricao={
            marcas.length === 0
              ? "Nenhuma logo cadastrada"
              : `${marcas.length} ${marcas.length === 1 ? "logo" : "logos"}`
          }
          acao={
            <Button onClick={() => setAberto("nova")}>
              <Plus size={16} />
              Nova logo
            </Button>
          }
        />

        {erro && (
          <p className="mb-4 rounded-field border border-erro/40 bg-erro/10 px-4 py-3 text-[13px] text-erro">
            {erro}
          </p>
        )}

        {marcas.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-6 py-10 text-center text-[13px] text-muted">
            A logo cadastrada aqui é a que assina as artes. Vale a da agência e a de cada cliente —
            qual entra em cada arte você escolhe na hora de gerar.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {marcas.map((m) => (
              <li
                key={m.id}
                className="group relative overflow-hidden rounded-card border border-line bg-surface-2"
              >
                {/* xadrez por baixo: sem ele não dá para ver se o PNG tem fundo
                    transparente, que é justamente o que faz a logo colar bem */}
                <div
                  className="relative grid aspect-[3/2] place-items-center p-6"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {m.imagem_url && (
                    <Image
                      src={m.imagem_url}
                      alt={m.nome}
                      fill
                      sizes="320px"
                      className="object-contain p-6"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                  <button
                    onClick={() => setAberto(m)}
                    className="truncate text-left text-[13px] font-medium hover:text-accent"
                  >
                    {m.nome}
                  </button>
                  <button
                    onClick={() => arquivar(m)}
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
        )}

        <Drawer
          aberto={Boolean(aberto)}
          aoFechar={fechar}
          titulo={editando ? "Editar logo" : "Nova logo"}
        >
          <form ref={formulario} onSubmit={enviar} className="grid gap-5">
            <div>
              <label
                className={cn(
                  "relative grid aspect-[3/2] w-full cursor-pointer place-items-center overflow-hidden",
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
                    className="object-contain p-8"
                  />
                )}
                <span className="relative z-10 grid place-items-center gap-2 rounded-field bg-bg/70 px-4 py-3 backdrop-blur-sm">
                  <ImagePlus size={18} className="text-muted" />
                  <span className="text-[12px] text-muted">
                    {previa || editando?.imagem_url ? "Trocar imagem" : "Escolher imagem"}
                  </span>
                </span>
                <input
                  type="file"
                  name="imagem"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    const url = f ? URL.createObjectURL(f) : null;
                    setPrevia(url);
                    setLargura(null);
                    /* Mede a largura real do arquivo para poder avisar antes de
                       salvar. Depois de salvo, descobrir que a logo era pequena
                       custa uma arte gerada com a assinatura borrada. */
                    if (url) {
                      const img = new window.Image();
                      img.onload = () => setLargura(img.naturalWidth);
                      img.src = url;
                    }
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                PNG com fundo transparente. Fundo branco vira um retângulo branco sobre a arte — e
                quando a IA posiciona a logo, ela copia o retângulo junto.
              </p>
              {/*
                O aviso é sobre MARGEM, não sobre erro: no feed a logo é
                desenhada com 324px de largura, então um arquivo de 400px passa
                — mas sem folga nenhuma. Quem souber disso na hora do upload
                troca o arquivo; quem descobrir depois, descobre numa arte
                pronta com a assinatura mole.
              */}
              {largura !== null && largura < LARGURA_CONFORTAVEL && (
                <p className="mt-2 rounded-field border border-warn/40 bg-warn/10 px-3 py-2 text-[11px] leading-relaxed text-warn">
                  Esta imagem tem {largura}px de largura. Na arte a logo é desenhada com {LARGURA_NA_ARTE}px,
                  então sobra pouca ou nenhuma margem e as bordas podem ficar moles. Se tiver um
                  arquivo maior — de {LARGURA_CONFORTAVEL}px para cima —, ele vai render melhor.
                </p>
              )}
            </div>

            <Campo rotulo="Nome" dica="para você achar na hora de gerar">
              <Input
                name="nome"
                required
                defaultValue={editando?.nome ?? ""}
                placeholder="Marcio Bittencourt Sports"
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
