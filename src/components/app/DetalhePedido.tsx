"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  History,
  Layers,
  Maximize2,
  RefreshCw,
  Share2,
  X,
} from "lucide-react";
import { Button, BotaoIcone } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Campo, Input, Textarea } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { Orb } from "@/components/art/Orb";
import { FORMATO_META, TIPO_META, type Geracao, type Pedido } from "@/lib/types";
import { cn, formatarData, tempoRelativo } from "@/lib/utils";

type Aba = "detalhes" | "camadas" | "historico";

export function DetalhePedido({
  pedido,
  geracoes,
  promptMae,
}: {
  pedido: Pedido;
  geracoes: Geracao[];
  promptMae: string;
}) {
  const tipo = TIPO_META[pedido.tipo];
  const formato = FORMATO_META[pedido.formato];

  const [aba, setAba] = useState<Aba>("detalhes");
  const [selecionada, setSelecionada] = useState<Geracao | null>(geracoes[0] ?? null);
  const [status, setStatus] = useState(pedido.status);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [nome, setNome] = useState(pedido.nome_jogador);
  const [frase, setFrase] = useState(pedido.frase ?? "");
  const [aviso, setAviso] = useState<string | null>(null);

  async function gerarOutra() {
    setGerando(true);
    setAviso(null);
    // fase 3: POST /api/gerar com o mesmo pedido e grava nova linha em `geracoes`
    await new Promise((r) => setTimeout(r, 2800));
    setGerando(false);
    setAviso("Nova geração pronta. A anterior fica no histórico com o motivo da recusa.");
  }

  return (
    <div className="mx-auto grid max-w-[1400px] animate-fade-up gap-4 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/fila"
            className="flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={15} />
            Fila
          </Link>
          <span className="text-muted-2">/</span>
          <span className="text-[13px]">{pedido.nome_jogador}</span>
        </div>

        <Card className="relative overflow-hidden p-4 sm:p-6">
          <div className="absolute right-7 top-7 z-10 flex gap-2">
            <BotaoIcone titulo="Ver em tamanho real">
              <Maximize2 size={16} />
            </BotaoIcone>
            <BotaoIcone titulo="Copiar link">
              <Share2 size={16} />
            </BotaoIcone>
            <BotaoIcone titulo="Baixar arte">
              <Download size={16} />
            </BotaoIcone>
          </div>

          <div
            className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-field bg-bg-2"
            style={{ aspectRatio: formato.ratio }}
          >
            {gerando ? (
              <div className="grid h-full place-items-center gap-6">
                <Orb tamanho={200} />
              </div>
            ) : selecionada?.imagem_url ? (
              <Image
                src={selecionada.imagem_url}
                alt={`Arte de ${tipo.titulo.toLowerCase()} de ${pedido.nome_jogador}`}
                fill
                sizes="520px"
                className="animate-fade-up object-cover"
                priority
              />
            ) : null}
          </div>

          <p className="mt-4 text-center text-[12px] text-muted-2">
            {formato.w}×{formato.h} px · o arquivo aprovado é exatamente este
          </p>
        </Card>
      </div>

      {/* painel-gaveta da direita */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <header className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[12px] text-accent">{tipo.numero}</span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {tipo.titulo}
                  </span>
                </div>
                <h1 className="display mt-1 truncate text-[26px]">{pedido.nome_jogador}</h1>
              </div>
              <StatusPill status={status} />
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Enviado por {pedido.criado_por} · {formatarData(pedido.criado_em)}
            </p>
          </header>

          <nav className="flex gap-1 border-b border-line px-3 py-2">
            {(
              [
                ["detalhes", "Detalhes", null],
                ["camadas", "Camadas", <Layers key="l" size={13} />],
                ["historico", "Histórico", <History key="h" size={13} />],
              ] as const
            ).map(([id, rotulo, icone]) => (
              <button
                key={id}
                onClick={() => setAba(id as Aba)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] transition-colors",
                  aba === id ? "bg-surface-3 text-text" : "text-muted hover:text-text",
                )}
              >
                {icone}
                {rotulo}
              </button>
            ))}
          </nav>

          <div className="max-h-[46vh] overflow-y-auto p-5">
            {aba === "detalhes" && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Chip rotulo="Formato" valor={formato.titulo} />
                  <Chip rotulo="Clube" valor={pedido.clube ?? "—"} />
                  <Chip rotulo="Referência" valor={`v${pedido.referencia_versao ?? 1}`} />
                  <Chip rotulo="Modelo" valor={selecionada?.modelo ?? "—"} />
                  <Chip
                    rotulo="Custo"
                    valor={`US$ ${(geracoes.reduce((s, g) => s + g.custo_usd, 0)).toFixed(2)}`}
                  />
                  <Chip rotulo="Gerações" valor={geracoes.length} />
                </div>

                {pedido.frase && (
                  <p className="rounded-field border border-line bg-surface-2/50 p-4 text-[13px] italic leading-relaxed text-muted">
                    “{pedido.frase}”
                  </p>
                )}

                <details className="group">
                  <summary className="cursor-pointer list-none text-[12px] text-muted transition-colors hover:text-text">
                    Prompt-mãe usado (somente leitura)
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap rounded-field border border-line bg-bg-2 p-4 font-mono text-[11px] leading-relaxed text-muted">
                    {promptMae}
                  </pre>
                </details>
              </div>
            )}

            {aba === "camadas" && (
              <div className="space-y-4">
                <p className="text-[12px] leading-relaxed text-muted">
                  Nome e logo são camadas por cima do fundo gerado. Corrigir um texto aqui
                  regrava só as camadas — não gasta outra geração.
                </p>
                <ol className="space-y-1.5 text-[12px]">
                  {["Fundo gerado pela IA", "Nome do jogador", "Recorte do jogador", "Logo da agência"].map(
                    (c, i) => (
                      <li
                        key={c}
                        className="flex items-center gap-3 rounded-field border border-line bg-surface-2/40 px-3.5 py-2.5"
                      >
                        <span className="font-mono text-[11px] text-muted-2">{i + 1}</span>
                        <span className={i === 0 ? "text-muted" : ""}>{c}</span>
                        {i === 0 && (
                          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-2">
                            IA
                          </span>
                        )}
                      </li>
                    ),
                  )}
                </ol>
                <Campo rotulo="Nome do jogador">
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </Campo>
                {pedido.tipo === "frase" && (
                  <Campo rotulo="Frase">
                    <Textarea value={frase} onChange={(e) => setFrase(e.target.value)} />
                  </Campo>
                )}
                <Button
                  variante="sutil"
                  className="w-full"
                  onClick={() => setAviso("Camadas regravadas sobre o mesmo fundo.")}
                >
                  <Layers size={15} />
                  Regravar camadas
                </Button>
              </div>
            )}

            {aba === "historico" && (
              <ul className="space-y-2">
                {geracoes.map((g, i) => (
                  <li key={g.id}>
                    <button
                      onClick={() => setSelecionada(g)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-field border p-2.5 text-left transition-colors",
                        selecionada?.id === g.id
                          ? "border-line-2 bg-surface-3"
                          : "border-line bg-surface-2/40 hover:border-line-2",
                      )}
                    >
                      {g.imagem_url && (
                        <Image
                          src={g.imagem_url}
                          alt=""
                          width={44}
                          height={55}
                          className="size-11 rounded-[10px] object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px]">
                          {i === 0 ? "Geração atual" : `Geração ${geracoes.length - i}`}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {g.motivo_recusa ? `Recusada — ${g.motivo_recusa}` : tempoRelativo(g.criado_em)}
                        </span>
                      </span>
                      {g.aprovada && <Check size={14} className="shrink-0 text-ok" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="space-y-2 border-t border-line p-5">
            {aviso && (
              <p className="mb-1 rounded-field border border-ok/30 bg-ok/10 p-3 text-[12px] text-ok">
                {aviso}
              </p>
            )}

            {recusando ? (
              <div className="space-y-2">
                <Campo rotulo="Por que essa arte não serve?" dica="vira diagnóstico da referência">
                  <Textarea
                    autoFocus
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Mão direita com seis dedos, escudo do clube deformado…"
                    className="min-h-20"
                  />
                </Campo>
                <div className="flex gap-2">
                  <Button
                    variante="perigo"
                    className="flex-1"
                    disabled={motivo.trim().length < 4}
                    onClick={() => {
                      setRecusando(false);
                      setMotivo("");
                      setAviso("Recusa registrada. Cinco recusas do mesmo tipo apontam para a referência, não para a IA.");
                    }}
                  >
                    Registrar recusa
                  </Button>
                  <Button variante="fantasma" onClick={() => setRecusando(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : status === "aprovado" || status === "publicado" ? (
              <Button className="w-full">
                <Download size={15} />
                Baixar arte aprovada
              </Button>
            ) : (
              <>
                <Button className="w-full" onClick={() => setStatus("aprovado")}>
                  <Check size={16} />
                  Aprovar arte
                </Button>
                <div className="flex gap-2">
                  <Button variante="sutil" className="flex-1" disabled={gerando} onClick={gerarOutra}>
                    <RefreshCw size={15} className={gerando ? "animate-spin" : ""} />
                    {gerando ? "Gerando…" : "Gerar outra"}
                  </Button>
                  <Button variante="perigo" onClick={() => setRecusando(true)}>
                    <X size={15} />
                    Recusar
                  </Button>
                </div>
              </>
            )}
          </footer>
        </Card>
      </div>
    </div>
  );
}
