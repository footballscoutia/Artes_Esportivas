"use client";

import { useEffect, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Button, BotaoIcone } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Campo, Input, Textarea } from "@/components/ui/Field";
import { Stepper } from "@/components/app/Stepper";
import { criarPedido } from "@/lib/acoes";
import { Uploader } from "@/components/app/Uploader";
import { Orb, OrbMini } from "@/components/art/Orb";
import { FORMATOS, FORMATO_META, TIPOS, TIPO_META, type Formato, type Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Resultado = {
  imagem: string;
  arte_path: string;
  fundo_path: string;
  foto_path: string | null;
  modelo: string;
  provider: string;
  custo_usd: number;
  duracao_ms: number;
  referencia_id: string;
  referencia_versao: number;
};

const ETAPAS_GERACAO = [
  "Carregando a referência curada",
  "Enviando referência e foto ao modelo",
  "Desenhando o fundo em alta resolução",
  "Compondo nome, recorte e logo",
];

export default function NovoPedidoPage() {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [formato, setFormato] = useState<Formato>("feed_4x5");
  const [foto, setFoto] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [clube, setClube] = useState("");
  const [frase, setFrase] = useState("");
  const [jogo, setJogo] = useState({
    adversario: "",
    data_jogo: "",
    hora_jogo: "",
    campeonato: "",
    estadio: "",
  });

  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const painel = useRef<HTMLDivElement>(null);

  const meta = tipo ? TIPO_META[tipo] : null;
  // matchday sem adversario e data faria o modelo inventar a partida
  const jogoOk = !meta?.exigeJogo || Boolean(jogo.adversario.trim() && jogo.data_jogo);
  /**
   * A foto e obrigatoria. O produto inteiro e "sobe a foto do atleta e recebe o
   * post" — sem ela o modelo inventa um jogador generico, e arte com rosto
   * errado no perfil da agencia e pior que arte nenhuma.
   */
  const podeGerar = Boolean(
    tipo && foto && nome.trim().length > 1 && (!meta?.exigeFrase || frase.trim()) && jogoOk,
  );

  useEffect(() => {
    if (!gerando) return;
    const t = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS_GERACAO.length - 1)), 1600);
    return () => clearInterval(t);
  }, [gerando]);

  async function gerar() {
    if (!tipo || !podeGerar) return;
    setErro(null);
    setResultado(null);
    setEtapa(0);
    setGerando(true);
    painel.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const body = new FormData();
    body.set("tipo", tipo);
    body.set("formato", formato);
    body.set("nome", nome.trim());
    body.set("clube", clube.trim());
    body.set("frase", frase.trim());
    for (const [k, v] of Object.entries(jogo)) if (v.trim()) body.set(k, v.trim());
    if (foto) body.set("foto", foto);

    try {
      const r = await fetch("/api/gerar", { method: "POST", body });
      const json = await r.json();
      if (!r.ok) throw new Error(json.erro ?? "Falha na geração");
      setResultado(json as Resultado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na geração");
    } finally {
      setGerando(false);
    }
  }

  /** So aqui o pedido passa a existir no banco. Gerar sozinho nao grava nada. */
  async function salvarNaBiblioteca() {
    if (!resultado || !tipo) return;
    setErro(null);
    setSalvando(true);

    const r = await criarPedido({
      tipo,
      formato,
      nome: nome.trim(),
      clube: clube.trim() || null,
      frase: frase.trim() || null,
      adversario: jogo.adversario.trim() || null,
      data_jogo: jogo.data_jogo || null,
      hora_jogo: jogo.hora_jogo.trim() || null,
      campeonato: jogo.campeonato.trim() || null,
      estadio: jogo.estadio.trim() || null,
      referencia_id: resultado.referencia_id,
      referencia_versao: resultado.referencia_versao,
      arte_path: resultado.arte_path,
      fundo_path: resultado.fundo_path,
      foto_path: resultado.foto_path,
      modelo: resultado.modelo,
      provider: resultado.provider,
      custo_usd: resultado.custo_usd,
      duracao_ms: Math.round(resultado.duracao_ms),
    });

    if (!r.ok) {
      setErro(r.erro);
      setSalvando(false);
      return;
    }
    router.push(`/pedido/${r.dados.id}`);
  }

  function baixar() {
    if (!resultado) return;
    const a = document.createElement("a");
    a.href = resultado.imagem;
    a.download = `${nome.trim().toLowerCase().replace(/\s+/g, "-")}-${tipo}-${formato}.png`;
    a.click();
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[1fr_380px]">
      {/* coluna do formulário */}
      <div className="min-w-0">
        <div className="mb-6">
          <h1 className="display text-[34px]">Gerar arte</h1>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Três perguntas. A referência e o prompt saem do banco, já testados. Não há nada para
            escrever aqui.
          </p>
        </div>

        <Stepper passos={["Tipo do post", "Formato e foto", "Textos"]} atual={passo} aoIr={setPasso} />

        {passo === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TIPOS.map((t) => {
              const m = TIPO_META[t];
              const ativo = tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTipo(t);
                    setPasso(1);
                  }}
                  className={cn(
                    "lift group relative overflow-hidden rounded-card border p-5 text-left",
                    ativo
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface hover:border-line-2 hover:bg-surface-2",
                  )}
                >
                  {/* sem numero: a ordem das categorias nao carrega informacao */}
                  <p className="text-[16px] font-medium tracking-tight">{m.titulo}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{m.descricao}</p>
                </button>
              );
            })}
          </div>
        )}

        {passo === 1 && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-[13px] font-medium">Onde essa arte vai ser publicada</p>
              <div className="grid grid-cols-2 gap-3">
                {FORMATOS.map((f) => {
                  const m = FORMATO_META[f];
                  const ativo = formato === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormato(f)}
                      className={cn(
                        "lift flex items-center gap-4 rounded-card border p-4 text-left",
                        ativo
                          ? "border-accent bg-accent/10"
                          : "border-line bg-surface/70 hover:border-line-2",
                      )}
                    >
                      <span
                        className={cn(
                          "w-10 shrink-0 rounded-[8px] border",
                          ativo ? "border-accent/60 bg-accent/20" : "border-line-2 bg-surface-2",
                        )}
                        style={{ aspectRatio: m.ratio }}
                      />
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium">{m.titulo}</span>
                        <span className="block text-[12px] text-muted">{m.descricao}</span>
                        <span className="mt-1 block text-[11px] tabular-nums text-muted-2">
                          {m.w}×{m.h}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-medium">
                Foto do jogador <span className="text-muted-2">obrigatória</span>
              </p>
              <Uploader arquivo={foto} aoEscolher={setFoto} />
            </div>

            <Navegacao
              voltar={() => setPasso(0)}
              avancar={() => setPasso(2)}
              podeAvancar
              rotuloAvancar="Continuar"
            />
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo rotulo="Nome do jogador" dica="sai como camada de texto">
                <Input
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Lucas Ferreira"
                />
              </Campo>
              <Campo rotulo="Clube" dica="opcional">
                <Input
                  value={clube}
                  onChange={(e) => setClube(e.target.value)}
                  placeholder="Vitória Guimarães"
                />
              </Campo>
            </div>

            {meta?.exigeJogo && (
              <div className="space-y-5 rounded-card border border-line bg-surface-2/30 p-5">
                <p className="text-[12px] leading-relaxed text-muted">
                  Dados da partida. Sem eles o modelo inventa data e adversário, e data
                  inventada parece certa, ninguém confere.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo rotulo="Adversário" dica="obrigatório">
                    <Input
                      value={jogo.adversario}
                      onChange={(e) => setJogo({ ...jogo, adversario: e.target.value })}
                      placeholder="Famalicão"
                    />
                  </Campo>
                  <Campo rotulo="Campeonato" dica="opcional">
                    <Input
                      value={jogo.campeonato}
                      onChange={(e) => setJogo({ ...jogo, campeonato: e.target.value })}
                      placeholder="Primeira Liga"
                    />
                  </Campo>
                  <Campo rotulo="Data do jogo" dica="obrigatório">
                    <Input
                      type="date"
                      value={jogo.data_jogo}
                      onChange={(e) => setJogo({ ...jogo, data_jogo: e.target.value })}
                    />
                  </Campo>
                  <Campo rotulo="Horário" dica="como deve aparecer na arte">
                    <Input
                      value={jogo.hora_jogo}
                      onChange={(e) => setJogo({ ...jogo, hora_jogo: e.target.value })}
                      placeholder="20h30"
                    />
                  </Campo>
                </div>
                <Campo rotulo="Estádio" dica="opcional">
                  <Input
                    value={jogo.estadio}
                    onChange={(e) => setJogo({ ...jogo, estadio: e.target.value })}
                    placeholder="Estádio António Coimbra da Mota"
                  />
                </Campo>
              </div>
            )}

            {meta?.exigeFrase && (
              <Campo rotulo="Frase do atleta" dica="máx. 180 caracteres">
                <Textarea
                  value={frase}
                  onChange={(e) => setFrase(e.target.value.slice(0, 180))}
                  placeholder="Vim aqui para escrever a minha história."
                />
              </Campo>
            )}

            <p className="text-[12px] leading-relaxed text-muted-2">
              O texto vem do modelo, dentro da arte. Confira o nome antes de salvar. A logo da
              agência é a única camada aplicada por cima.
            </p>

            {!foto && (
              <p className="rounded-field border border-warn/40 bg-warn/10 p-3 text-[12px]">
                Falta a foto do atleta. Volte ao passo 2: sem ela o modelo inventa um jogador.
              </p>
            )}

            <Navegacao
              voltar={() => setPasso(1)}
              avancar={gerar}
              podeAvancar={podeGerar}
              rotuloAvancar="Gerar arte"
              icone={<Sparkles size={16} />}
            />
          </div>
        )}
      </div>

      {/* painel da direita: resumo, geração e resultado */}
      <div ref={painel} className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[13px] font-medium">
              {resultado ? "Arte gerada" : gerando ? "Gerando" : "Resumo do pedido"}
            </h2>
            {resultado && <OrbMini tamanho={14} />}
          </div>

          <div className="p-5">
            <div
              className="relative mb-5 grid w-full place-items-center overflow-hidden rounded-field bg-bg-2"
              style={{ aspectRatio: FORMATO_META[formato].ratio }}
            >
              {gerando && (
                <div className="grid place-items-center gap-6 px-6 text-center">
                  <Orb tamanho={168} />
                  <p className="text-[13px] text-muted">{ETAPAS_GERACAO[etapa]}…</p>
                </div>
              )}

              {!gerando && resultado && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resultado.imagem}
                  alt={`Arte gerada para ${nome}`}
                  className="h-full w-full animate-fade-up object-cover"
                />
              )}

              {/*
                A referência NAO aparece aqui. Ela é o acervo curado da agência —
                o cliente escolhe a categoria, não o estilo, e mostrar a arte que
                serviu de base entregaria de graça o que diferencia o trabalho.
              */}
              {!gerando && !resultado && tipo && meta && (
                <div className="grid place-items-center gap-3 px-8 text-center">
                  <p className="text-[15px] font-medium">{meta.titulo}</p>
                  <p className="text-[12px] leading-relaxed text-muted-2">{meta.descricao}</p>
                </div>
              )}

              {!gerando && !resultado && !tipo && (
                <p className="px-8 text-center text-[13px] text-muted-2">
                  Escolha o tipo do post para começar
                </p>
              )}
            </div>

            {erro && (
              <div className="mb-4 flex gap-3 rounded-field border border-accent/40 bg-accent/10 p-4 text-[13px]">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-accent" />
                <p>{erro}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Chip rotulo="Tipo" valor={meta?.titulo ?? "—"} />
              <Chip rotulo="Formato" valor={FORMATO_META[formato].titulo} />
              <Chip
                rotulo="Referência"
                valor={resultado ? `v${resultado.referencia_versao}` : tipo ? "curada" : "—"}
              />
              {resultado && (
                <>
                  <Chip rotulo="Modelo" valor={resultado.modelo} />
                  <Chip rotulo="Custo" valor={`US$ ${resultado.custo_usd.toFixed(3)}`} />
                  <Chip rotulo="Tempo" valor={`${(resultado.duracao_ms / 1000).toFixed(1)} s`} />
                </>
              )}
            </div>

            {resultado ? (
              <div className="mt-5 space-y-2">
                <Button className="w-full" disabled={salvando} onClick={salvarNaBiblioteca}>
                  <Send size={15} />
                  {salvando ? "Salvando…" : "Salvar na biblioteca"}
                </Button>
                <div className="flex gap-2">
                  <Button variante="sutil" className="flex-1" onClick={gerar}>
                    <RefreshCw size={15} />
                    Gerar outra
                  </Button>
                  <BotaoIcone titulo="Baixar arte" onClick={baixar}>
                    <Download size={16} />
                  </BotaoIcone>
                </div>
                <p className="pt-1 text-center text-[11px] text-muted-2">
                  O arquivo salvo é exatamente este, nada é regerado depois
                </p>
              </div>
            ) : (
              <Button className="mt-5 w-full" disabled={!podeGerar || gerando} onClick={gerar} tamanho="lg">
                <Sparkles size={16} />
                {gerando ? "Gerando…" : "Gerar arte"}
              </Button>
            )}
          </div>
        </Card>
        </div>
      </div>
    </ViewTransition>
  );
}

function Navegacao({
  voltar,
  avancar,
  podeAvancar,
  rotuloAvancar,
  icone,
}: {
  voltar: () => void;
  avancar: () => void;
  podeAvancar: boolean;
  rotuloAvancar: string;
  icone?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button variante="fantasma" onClick={voltar}>
        <ArrowLeft size={15} />
        Voltar
      </Button>
      <Button onClick={avancar} disabled={!podeAvancar}>
        {icone ?? null}
        {rotuloAvancar}
        {!icone && <ArrowRight size={15} />}
      </Button>
    </div>
  );
}
