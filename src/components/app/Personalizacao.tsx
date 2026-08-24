"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import {
  ESCUDO_MODOS,
  ESCUDO_ROTULO,
  PALETAS,
  PALETA_ROTULO,
  ZONAS_TEXTO,
  ZONA_ROTULO,
  type Opcoes,
  type PadraoSalvo,
} from "@/lib/padroes";
import type { Tipo } from "@/lib/types";

/**
 * As escolhas de composicao da arte, e os padroes que as guardam.
 *
 * Componente separado do NovaArte de proposito: aquele arquivo ja passa de mil
 * linhas, e esta secao tem estado proprio (o nome do padrao sendo digitado) que
 * nao interessa a mais ninguem.
 *
 * O que NAO aparece aqui e deliberado. Nao ha controle de cor exata, de fonte
 * nem de posicao livre — cada opcao e uma ZONA, uma FONTE ou um TETO, e a forma
 * continua saindo da referencia de estilo. Instrucao especifica demais produz
 * clone da referencia; vaga demais produz legenda. O meio-termo que funciona e
 * nomear a alavanca e calar sobre o desenho.
 */

type Props = {
  opcoes: Opcoes;
  aoMudar: (o: Opcoes) => void;
  padroes: PadraoSalvo[];
  padraoId: string | null;
  aoEscolherPadrao: (p: PadraoSalvo | null) => void;
  tipo: Tipo | null;
  /** Sem adversario na arte, "so o do adversario" nao e escolha possivel. */
  temAdversario: boolean;
  aoSalvarPadrao: (nome: string) => Promise<void>;
  aoApagarPadrao: (id: string) => Promise<void>;
};

function Grupo<T extends string>({
  titulo,
  ajuda,
  valores,
  rotulos,
  atual,
  aoEscolher,
  desabilitados = [],
}: {
  titulo: string;
  ajuda: string;
  valores: readonly T[];
  rotulos: Record<T, string>;
  atual: T;
  aoEscolher: (v: T) => void;
  desabilitados?: T[];
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">
        {titulo} <span className="text-muted-2">{ajuda}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {valores.map((v) => {
          const bloqueado = desabilitados.includes(v);
          return (
            <button
              key={v}
              type="button"
              disabled={bloqueado}
              onClick={() => aoEscolher(v)}
              className={cn(
                "rounded-card border px-3 py-1.5 text-[12px] transition-colors",
                bloqueado && "cursor-not-allowed opacity-40",
                !bloqueado && atual === v
                  ? "border-accent bg-accent/10 font-medium ring-1 ring-accent/40"
                  : !bloqueado && "border-line hover:border-line-2",
              )}
            >
              {rotulos[v]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Personalizacao({
  opcoes,
  aoMudar,
  padroes,
  padraoId,
  aoEscolherPadrao,
  tipo,
  temAdversario,
  aoSalvarPadrao,
  aoApagarPadrao,
}: Props) {
  const [nomeNovo, setNomeNovo] = useState("");
  const [salvando, iniciarSalvar] = useTransition();

  /* Padrao sem tipo serve para qualquer arte; com tipo, so para o dele. */
  const disponiveis = padroes.filter((p) => !p.tipo || p.tipo === tipo);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-1 text-[13px] font-medium">
          Personalizar <span className="text-muted-2">o que entra nesta arte</span>
        </p>
        <p className="max-w-[60ch] text-[12px] leading-relaxed text-muted">
          Elemento que você tira sai do pedido ao modelo, e o lugar dele fica limpo — não vira
          espaço para ele preencher por conta própria. Para não escrever o nome do clube, é só
          deixar o campo em branco no passo anterior.
        </p>
      </div>

      {disponiveis.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium">
            Padrões salvos <span className="text-muted-2">para repetir o mesmo arranjo</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {disponiveis.map((p) => (
              <span
                key={p.id}
                className={cn(
                  "flex items-center gap-1 rounded-card border pl-3 text-[12px] transition-colors",
                  padraoId === p.id
                    ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                    : "border-line hover:border-line-2",
                )}
              >
                <button
                  type="button"
                  onClick={() => aoEscolherPadrao(padraoId === p.id ? null : p)}
                  className="flex items-center gap-1.5 py-1.5"
                >
                  {padraoId === p.id && <Check className="size-3 shrink-0 text-accent" />}
                  {p.nome}
                </button>
                <button
                  type="button"
                  aria-label={`Apagar padrão ${p.nome}`}
                  onClick={() => void aoApagarPadrao(p.id)}
                  className="px-2 py-1.5 text-muted-2 transition-colors hover:text-danger"
                >
                  <Trash2 className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <Grupo
        titulo="Escudo"
        ajuda="quais entram na arte"
        valores={ESCUDO_MODOS}
        rotulos={ESCUDO_ROTULO}
        atual={opcoes.escudo}
        aoEscolher={(escudo) => aoMudar({ ...opcoes, escudo })}
        desabilitados={temAdversario ? [] : ["adversario"]}
      />

      <Grupo
        titulo="Texto"
        ajuda="em que faixa do quadro"
        valores={ZONAS_TEXTO}
        rotulos={ZONA_ROTULO}
        atual={opcoes.zonaTexto}
        aoEscolher={(zonaTexto) => aoMudar({ ...opcoes, zonaTexto })}
      />

      <Grupo
        titulo="Paleta"
        ajuda="de onde saem as cores"
        valores={PALETAS}
        rotulos={PALETA_ROTULO}
        atual={opcoes.paleta}
        aoEscolher={(paleta) => aoMudar({ ...opcoes, paleta })}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Input
          value={nomeNovo}
          onChange={(e) => setNomeNovo(e.target.value)}
          placeholder="Nome do padrão, ex.: Matchday limpo"
          className="max-w-[280px] flex-1"
        />
        <Button
          type="button"
          variante="sutil"
          tamanho="sm"
          disabled={nomeNovo.trim().length < 2 || salvando}
          onClick={() =>
            iniciarSalvar(async () => {
              await aoSalvarPadrao(nomeNovo.trim());
              setNomeNovo("");
            })
          }
        >
          <Plus className="size-3.5" />
          {salvando ? "Salvando…" : "Salvar padrão"}
        </Button>
      </div>
    </div>
  );
}
