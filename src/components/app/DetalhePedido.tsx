"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  History,
  Layers,
  Check,
  Maximize2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Button, BotaoIcone } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Orb } from "@/components/art/Orb";
import { FORMATO_META, TIPO_META, type Geracao, type Pedido } from "@/lib/types";
import { cn, formatarData, tempoRelativo } from "@/lib/utils";
import { gerarOutra } from "@/lib/acoes";

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

  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("detalhes");
  /**
   * Guarda o ID, nao o objeto. Guardando o objeto, um router.refresh() troca as
   * props mas o estado continua apontando para a geracao velha — foi o que fez
   * "regravar camadas" mudar o titulo e nao mudar a imagem.
   */
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const selecionada = geracoes.find((g) => g.id === selecionadaId) ?? geracoes[0] ?? null;
  const [baixando, setBaixando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  /**
   * A imagem vem por URL assinada, que e outro dominio. Nesse caso o atributo
   * `download` do <a> e ignorado e o navegador so navega ate o arquivo em vez
   * de salvar. Buscar o blob e criar um object URL local e o que faz o download
   * acontecer de verdade — e e o unico ponto da biblioteca que o cliente usa.
   */
  async function baixar() {
    if (!selecionada?.imagem_url) return;
    setBaixando(true);
    setErro(null);
    try {
      const r = await fetch(selecionada.imagem_url);
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const limpo = pedido.nome_jogador.trim().toLowerCase().replace(/\s+/g, "-");
      a.download = `${limpo}-${pedido.tipo}-${pedido.formato}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não consegui baixar. O link da imagem pode ter expirado. Recarregue a página.");
    } finally {
      setBaixando(false);
    }
  }

  async function novaGeracao() {
    setGerando(true);
    setErro(null);
    setAviso(null);
    const r = await gerarOutra(pedido.id);
    setGerando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setAviso("Nova geração pronta. A anterior continua no histórico.");
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[1fr_400px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/biblioteca"
            className="flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={15} />
            Biblioteca
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
            <BotaoIcone titulo="Baixar arte" onClick={baixar}>
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
            {formato.w}×{formato.h} px, pronto para publicar
          </p>
        </Card>
      </div>

      {/* painel-gaveta da direita */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <header className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* sem eyebrow: o titulo carrega o proprio peso */}
                <h1 className="display truncate text-[26px]">{pedido.nome_jogador}</h1>
                <p className="mt-1 text-[12px] text-muted">{tipo.titulo}</p>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              Gerada por {pedido.criado_por_nome} em {formatarData(pedido.criado_em)}
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
                  O texto vem do modelo, dentro da arte. Se o nome sair errado, o caminho é
                  gerar outra, e vale ajustar o prompt-mãe em Referências, porque o erro
                  tende a se repetir.
                </p>
                <ol className="space-y-1.5 text-[12px]">
                  {["Arte gerada pela IA, texto incluso", "Recorte do jogador", "Logo da agência"].map(
                    (c, i) => (
                      <li
                        key={c}
                        className="flex items-center gap-3 rounded-field border border-line bg-surface-2/40 px-3.5 py-2.5"
                      >
                        <span className="text-[11px] tabular-nums text-muted-2">{i + 1}</span>
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
              </div>
            )}

            {aba === "historico" && (
              <ul className="space-y-2">
                {geracoes.map((g, i) => (
                  <li key={g.id}>
                    <button
                      onClick={() => setSelecionadaId(g.id)}
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
                          {g.motivo_recusa ? `Recusada: ${g.motivo_recusa}` : tempoRelativo(g.criado_em)}
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
            {erro && (
              <p className="mb-1 rounded-field border border-accent/40 bg-accent/10 p-3 text-[12px]">
                {erro}
              </p>
            )}
            {aviso && (
              <p className="mb-1 rounded-field border border-ok/30 bg-ok/10 p-3 text-[12px] text-ok">
                {aviso}
              </p>
            )}

            <Button className="w-full" disabled={baixando || !selecionada} onClick={baixar}>
              <Download size={15} />
              {baixando ? "Preparando…" : "Baixar arte"}
            </Button>
            <Button
              variante="sutil"
              className="w-full"
              disabled={gerando}
              onClick={novaGeracao}
            >
              <RefreshCw size={15} className={gerando ? "animate-spin" : ""} />
              {gerando ? "Gerando…" : "Gerar outra"}
            </Button>
          </footer>
        </Card>
      </div>
    </div>
  );
}
