"use client";

import { useRef, useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Archive, ImagePlus, Plus, UserRound } from "lucide-react";
import { Button, BotaoLink } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { Campo, Input, Select } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Drawer";
import { arquivarJogador, salvarJogador } from "@/lib/acoes";
import type { Clube, Jogador } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A carteira de atletas da agencia.
 *
 * Cadastrar uma vez e escolher a cada post, em vez de digitar o nome e subir a
 * mesma foto toda semana. A foto e o que mais pesa aqui: e ela que o modelo usa
 * para preservar o rosto, e trocar por uma ruim estraga toda arte seguinte.
 */
export function Elenco({ jogadores, clubes }: { jogadores: Jogador[]; clubes: Clube[] }) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [aberto, setAberto] = useState<Jogador | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const editando = aberto && aberto !== "novo" ? aberto : null;

  function abrir(alvo: Jogador | "novo") {
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
      const r = await salvarJogador(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(null);
      setPrevia(null);
      router.refresh();
    });
  }

  function arquivar(j: Jogador) {
    setErro(null);
    comTransicao(async () => {
      const r = await arquivarJogador(j.id);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(null);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[1400px]">
        <TituloSecao
          titulo="Elenco"
          descricao={
            jogadores.length
              ? `${jogadores.length} ${jogadores.length === 1 ? "atleta cadastrado" : "atletas cadastrados"}`
              : "Nenhum atleta cadastrado"
          }
          acao={
            <Button onClick={() => abrir("novo")}>
              <Plus size={15} strokeWidth={2.2} />
              Cadastrar atleta
            </Button>
          }
        />

        {jogadores.length === 0 ? (
          <div className="surface grid place-items-center gap-4 rounded-card py-24 text-center">
            <UserRound size={26} className="text-muted-2" strokeWidth={1.5} />
            <div>
              <p className="font-medium">Cadastre o primeiro atleta</p>
              <p className="mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted">
                Nome, clube e uma boa foto. Depois disso, gerar um post é escolher o atleta da
                lista e responder o resto.
              </p>
            </div>
            <Button variante="sutil" tamanho="sm" onClick={() => abrir("novo")}>
              Cadastrar atleta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
            {jogadores.map((j) => (
              <button
                key={j.id}
                onClick={() => abrir(j)}
                className="lift holofote surface group overflow-hidden rounded-card text-left"
              >
                <span className="relative block aspect-[4/5] w-full bg-surface-2">
                  {j.foto_url ? (
                    <Image
                      src={j.foto_url}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 220px"
                      className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-muted-2">
                      <UserRound size={22} strokeWidth={1.5} />
                    </span>
                  )}
                </span>
                <span className="block p-3.5">
                  <span className="block truncate text-[15px] font-medium">{j.nome}</span>
                  <span className="mt-1 block truncate text-[12px] text-muted">
                    {[j.clube, j.posicao].filter(Boolean).join(", ") || "Sem clube"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        <Drawer
          aberto={Boolean(aberto)}
          aoFechar={() => setAberto(null)}
          titulo={editando ? editando.nome : "Cadastrar atleta"}
          subtitulo={
            editando ? (
              <span>A foto só muda se você enviar outra</span>
            ) : (
              <span>Uma boa foto vale mais que o resto do formulário</span>
            )
          }
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
                  onClick={() => arquivar(editando)}
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
              <p className="mb-2 text-[13px] font-medium">Foto</p>
              <label
                className={cn(
                  "relative grid aspect-[4/5] w-full cursor-pointer place-items-center overflow-hidden",
                  "rounded-card border border-dashed border-line bg-surface-2 text-center",
                  "transition-colors hover:border-accent/50",
                )}
              >
                {(previa ?? editando?.foto_url) && (
                  <Image
                    src={previa ?? editando?.foto_url ?? ""}
                    alt=""
                    fill
                    sizes="380px"
                    className="object-cover"
                  />
                )}
                <span className="relative z-10 grid place-items-center gap-2 rounded-field bg-bg/70 px-4 py-3 backdrop-blur-sm">
                  <ImagePlus size={18} className="text-muted" />
                  <span className="text-[12px] text-muted">
                    {previa || editando?.foto_url ? "Trocar foto" : "Escolher foto"}
                  </span>
                </span>
                <input
                  type="file"
                  name="foto"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPrevia(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                O atleta inteiro e nítido. É essa foto que o modelo usa para preservar o rosto em
                todas as artes dele.
              </p>
            </div>

            <Campo rotulo="Nome" dica="como deve aparecer na arte">
              <Input
                name="nome"
                required
                defaultValue={editando?.nome ?? ""}
                placeholder="Rafael Nunes"
              />
            </Campo>
            <Campo rotulo="Clube" dica="define as cores da arte">
              <Select name="clube_id" defaultValue={editando?.clube_id ?? ""}>
                <option value="">Sem clube</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
              {clubes.length === 0 && (
                <p className="mt-2 text-[11px] text-muted-2">
                  Nenhum clube cadastrado ainda. Sem escudo, a arte sai com cores genéricas —
                  cadastre em Clubes.
                </p>
              )}
            </Campo>
            <Campo rotulo="Posição" dica="opcional">
              <Input name="posicao" defaultValue={editando?.posicao ?? ""} placeholder="Atacante" />
            </Campo>
          </form>
        </Drawer>

        {jogadores.length > 0 && (
          <p className="mt-6 text-[12px] text-muted-2">
            Precisa gerar um post? <BotaoLink href="/novo" variante="fantasma" tamanho="sm">Nova arte</BotaoLink>
          </p>
        )}
      </div>
    </ViewTransition>
  );
}
