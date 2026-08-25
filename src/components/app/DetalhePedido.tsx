"use client";

import { useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
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
import {
  FORMATO_META,
  POSICAO_LOGO_ROTULO,
  POSICOES_LOGO,
  TIPO_META,
  type Geracao,
  type Marca,
  type Pedido,
  type PosicaoLogo,
} from "@/lib/types";
import { cn, formatarData, tempoRelativo } from "@/lib/utils";
import { gerarOutra, recompor } from "@/lib/acoes";
import { PerguntasDoVideo } from "@/components/app/PerguntasDoVideo";
import type { Opcoes as OpcoesDeVideo } from "@/video/template";

type Aba = "detalhes" | "camadas" | "historico";

/** Mini-moldura mostrando em qual canto a logo vai cair. Só enfeite, mas é o
    tipo de enfeite que poupa a pessoa de ler quatro rótulos parecidos. */
function Cantinho({ posicao }: { posicao: PosicaoLogo }) {
  const emCima = posicao.startsWith("superior");
  const naEsquerda = posicao.endsWith("esquerdo");
  return (
    <span className="relative block size-8 shrink-0 rounded-[6px] border border-line-2 bg-surface-2">
      <span
        className="absolute size-2 rounded-[2px] bg-current"
        style={{
          top: emCima ? 3 : undefined,
          bottom: emCima ? undefined : 3,
          left: naEsquerda ? 3 : undefined,
          right: naEsquerda ? undefined : 3,
        }}
      />
    </span>
  );
}

export function DetalhePedido({
  pedido,
  geracoes,
  marcas,
  promptMae,
}: {
  pedido: Pedido;
  geracoes: Geracao[];
  marcas: Marca[];
  promptMae: string;
}) {
  const tipo = TIPO_META[pedido.tipo];
  const formato = FORMATO_META[pedido.formato];

  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  /**
   * "Fazer video" nao renderiza nada: ele so produz e guarda as CAMADAS caras,
   * e leva a pessoa para o editor. A montagem acontece no navegador, de graca.
   */
  const [fazendoVideo, setFazendoVideo] = useState(false);
  const [perguntando, setPerguntando] = useState(false);

  async function virarVideo(opcoes: OpcoesDeVideo) {
    setFazendoVideo(true);
    try {
      const r = await fetch("/api/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedido_id: pedido.id, opcoes }),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo?.erro ?? "Falha ao gerar as camadas.");
      router.push(`/video/${corpo.video_id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar as camadas.");
      setFazendoVideo(false);
    }
  }
  const [aba, setAba] = useState<Aba>("detalhes");
  /**
   * Guarda o ID, nao o objeto. Guardando o objeto, um router.refresh() troca as
   * props mas o estado continua apontando para a geracao velha — foi o que fez
   * "regravar camadas" mudar o titulo e nao mudar a imagem.
   */
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const selecionada = geracoes.find((g) => g.id === selecionadaId) ?? geracoes[0] ?? null;
  /* a geração exibida teve a logo integrada pelo modelo? decide a aba inteira */
  const logoDaIa = selecionada?.logo_modo === "ia";
  const [baixando, setBaixando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recompondo, comTransicao] = useTransition();
  const [canto, setCanto] = useState<PosicaoLogo | "nenhuma">(
    (selecionadaId && geracoes.find((g) => g.id === selecionadaId)?.posicao_logo) ||
      geracoes[0]?.posicao_logo ||
      "inferior-direito",
  );
  const [marcaId, setMarcaId] = useState<string | null>(
    geracoes[0]?.marca_id ?? marcas[0]?.id ?? null,
  );

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
      a.download = `${limpo}-${pedido.tipo}-${pedido.formato}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não consegui baixar. O link da imagem pode ter expirado. Recarregue a página.");
    } finally {
      setBaixando(false);
    }
  }

  /**
   * Troca canto ou logo sem gastar geração nova — recompõe o `fundo_url` já
   * guardado. Vira uma linha nova no histórico, com custo zero.
   */
  function aplicarCamada() {
    if (!selecionada) return;
    setErro(null);
    setAviso(null);
    comTransicao(async () => {
      const r = await recompor({
        pedido_id: pedido.id,
        geracao_id: selecionada.id,
        marca_id: canto === "nenhuma" ? null : marcaId,
        posicao_logo: canto === "nenhuma" ? null : canto,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAviso("Camada aplicada. A versão anterior continua no histórico.");
      router.refresh();
    });
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
            className="-ml-2 flex h-10 items-center gap-2 rounded-full px-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
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
              <ViewTransition name={`arte-${pedido.id}`} share="morph" default="none">
                <Image
                  src={selecionada.imagem_url}
                  alt={`Arte de ${tipo.titulo.toLowerCase()} de ${pedido.nome_jogador}`}
                  fill
                  sizes="520px"
                  className="object-cover"
                  priority
                />
              </ViewTransition>
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

          <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
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
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] transition-colors",
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
                    Ver as instruções enviadas ao modelo
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap rounded-field border border-line bg-bg-2 p-4 font-mono text-[11px] leading-relaxed text-muted">
                    {promptMae}
                  </pre>
                </details>
              </div>
            )}

            {aba === "camadas" && (
              <div className="space-y-5">
                {/*
                  Com a logo posta pela IA não há o que reposicionar: ela está
                  nos pixels da arte, não numa camada por cima. O controle sai
                  da tela em vez de ficar ali para dar erro quando clicado — um
                  botão que só serve para recusar é pior que botão nenhum.
                */}
                {logoDaIa ? (
                  <p className="text-[12px] leading-relaxed text-muted">
                    Nesta arte quem posicionou a logo foi a IA, então ela faz parte da imagem e
                    não há como movê-la daqui. Para escolher o canto você mesmo, gere outra
                    usando <span className="text-text">Canto fixo</span>.
                  </p>
                ) : (
                  <p className="text-[12px] leading-relaxed text-muted">
                    O texto vem do modelo, dentro da arte — se o nome sair errado, o caminho é
                    gerar outra. A logo é diferente: é carimbada por cima, então trocar de canto
                    não custa uma geração nova.
                  </p>
                )}

                <div className={logoDaIa ? "hidden" : undefined}>
                  <p className="mb-2 text-[12px] font-medium">Onde a logo entra</p>
                  <div className="grid grid-cols-2 gap-2">
                    {POSICOES_LOGO.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCanto(p)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-field border p-2.5 text-left transition-colors",
                          canto === p
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-line bg-surface-2/40 text-text hover:border-line-2",
                        )}
                      >
                        <Cantinho posicao={p} />
                        <span className="text-[12px] leading-tight">{POSICAO_LOGO_ROTULO[p]}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCanto("nenhuma")}
                    className={cn(
                      "mt-2 w-full rounded-field border p-2.5 text-[12px] transition-colors",
                      canto === "nenhuma"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-surface-2/40 text-muted hover:border-line-2",
                    )}
                  >
                    Sem logo nesta arte
                  </button>
                </div>

                {canto !== "nenhuma" && marcas.length > 1 && (
                  <div>
                    <p className="mb-2 text-[12px] font-medium">Qual logo</p>
                    <div className="flex flex-wrap gap-2">
                      {marcas.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMarcaId(m.id)}
                          className={cn(
                            "rounded-field border px-3 py-2 text-[12px] transition-colors",
                            marcaId === m.id
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-line bg-surface-2/40 text-muted hover:border-line-2",
                          )}
                        >
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {canto !== "nenhuma" && marcas.length === 0 && (
                  <p className="rounded-field border border-warn/40 bg-warn/10 p-3 text-[12px] leading-relaxed">
                    Nenhuma marca cadastrada ainda. Sem ela a arte sai sem logo.
                  </p>
                )}

                <Button
                  variante="sutil"
                  className="w-full"
                  disabled={recompondo || (canto !== "nenhuma" && !marcaId)}
                  onClick={aplicarCamada}
                >
                  {recompondo ? "Aplicando…" : "Aplicar"}
                </Button>
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
            <Button
              variante="sutil"
              className="w-full"
              disabled={fazendoVideo}
              onClick={() => setPerguntando(true)}
            >
              <Clapperboard size={15} />
              {fazendoVideo ? "Gerando camadas…" : "Fazer vídeo"}
            </Button>
          </footer>
        </Card>
      </div>

      <PerguntasDoVideo
        aberto={perguntando}
        aoFechar={() => setPerguntando(false)}
        gerando={fazendoVideo}
        aoGerar={(o) => {
          setPerguntando(false);
          void virarVideo(o);
        }}
      />
    </div>
  );
}
