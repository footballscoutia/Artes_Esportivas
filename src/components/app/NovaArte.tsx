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
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { Button, BotaoIcone, BotaoLink } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Campo, Input, Select, Textarea } from "@/components/ui/Field";
import { Stepper } from "@/components/app/Stepper";
import { criarPedido } from "@/lib/acoes";
import {
  LOGO_CORES,
  LOGO_COR_META,
  LOGO_MODOS,
  LOGO_MODO_META,
  POSICOES_LOGO,
  POSICAO_LOGO_ROTULO,
  type LogoCorPreset,
  type LogoModo,
  type Marca,
  type Uniforme,
  type PosicaoLogo,
} from "@/lib/types";
import { Orb, OrbMini } from "@/components/art/Orb";
import {
  FORMATOS,
  FORMATO_META,
  TIPOS,
  TIPO_META,
  type Clube,
  type Formato,
  type Jogador,
  type Tipo,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Resultado = {
  imagem: string;
  arte_path: string;
  fundo_path: string;
  modelo: string;
  provider: string;
  custo_usd: number;
  duracao_ms: number;
  referencia_id: string;
  referencia_versao: number;
  marca_id: string | null;
  posicao_logo: string;
  /* o que a geracao REALMENTE fez com a logo — pode diferir do pedido, porque
     sem marca cadastrada o servidor rebaixa o modo para "nenhuma" */
  logo_modo: LogoModo;
  logo_cor: string | null;
  uniforme_id: string | null;
};

/* O que o usuario ve enquanto espera. Sao as etapas reais, na ordem real: uma
   barra que anda sozinha sem dizer o que faz e a mesma coisa que nao ter. */
const ETAPAS_GERACAO = [
  "Buscando o estilo da categoria",
  "Enviando a foto e os escudos ao modelo",
  "Desenhando a arte em alta resolução",
  "Aplicando o corte e a logo",
];

export function NovaArte({
  jogadores,
  clubes,
  marcas,
  uniformes,
}: {
  jogadores: Jogador[];
  clubes: Clube[];
  marcas: Marca[];
  uniformes: Uniforme[];
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [jogadorId, setJogadorId] = useState<string | null>(null);
  const [adversarioId, setAdversarioId] = useState<string | null>(null);
  const [formato, setFormato] = useState<Formato>("feed_4x5");
  /**
   * A logo, escolhida por geracao.
   *
   * Comeca na primeira marca cadastrada porque quase toda agencia tem uma so, e
   * o modo comeca em `ia`: quem sabe onde sobra espaco e quem compos a imagem.
   * Sem marca nenhuma, o modo cai para "nenhuma" e o bloco some da tela — nao
   * ha o que escolher.
   */
  const [marcaId, setMarcaId] = useState<string | null>(marcas[0]?.id ?? null);
  const [logoModo, setLogoModo] = useState<LogoModo>(marcas.length ? "ia" : "nenhuma");
  const [posicaoLogo, setPosicaoLogo] = useState<PosicaoLogo>("inferior-direito");
  /* preset nomeado, ou "hex" quando a pessoa abre o seletor de cor */
  const [logoCor, setLogoCor] = useState<LogoCorPreset | "hex">("original");
  const [logoHex, setLogoHex] = useState("#FFFFFF");
  const [uniformeId, setUniformeId] = useState<string | null>(null);
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

  /**
   * Escolher o atleta ja preenche o que esta cadastrado.
   *
   * Preenche em vez de travar: o nome sai escrito na arte e as vezes precisa
   * sair diferente do cadastro — apelido, so o primeiro nome. Travar o campo
   * mandaria o usuario editar o elenco para consertar um post.
   */
  function escolherAtleta(j: Jogador) {
    setJogadorId(j.id);
    setNome(j.nome);
    const doClube = clubes.find((c) => c.id === j.clube_id);
    setClube(doClube ? (doClube.nome_curto ?? doClube.nome) : (j.clube ?? ""));
  }

  /** Alimenta o holofote com a posicao do cursor dentro do proprio cartao. */
  function seguirCursor(e: React.MouseEvent<HTMLElement>) {
    const alvo = e.currentTarget;
    const caixa = alvo.getBoundingClientRect();
    alvo.style.setProperty("--px", `${e.clientX - caixa.left}px`);
    alvo.style.setProperty("--py", `${e.clientY - caixa.top}px`);
  }

  const meta = tipo ? TIPO_META[tipo] : null;
  const jogador = jogadores.find((j) => j.id === jogadorId) ?? null;
  const clubeDoAtleta = clubes.find((c) => c.id === jogador?.clube_id) ?? null;
  const uniformesDoClube = uniformes.filter((u) => u.clube_id === clubeDoAtleta?.id);
  // matchday sem adversario e data faria o modelo inventar a partida
  const jogoOk = !meta?.exigeJogo || Boolean(jogo.adversario.trim() && jogo.data_jogo);
  /**
   * O atleta e obrigatorio, e e dele que vem a foto. Sem foto o modelo inventa
   * um jogador generico, e arte com rosto errado no perfil da agencia e pior
   * que arte nenhuma.
   */
  const podeGerar = Boolean(
    tipo && jogadorId && nome.trim().length > 1 && (!meta?.exigeFrase || frase.trim()) && jogoOk,
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
    if (jogadorId) body.set("jogador_id", jogadorId);
    if (clubeDoAtleta) body.set("clube_id", clubeDoAtleta.id);
    if (adversarioId) body.set("adversario_id", adversarioId);
    body.set("logo_modo", logoModo);
    if (marcaId && logoModo !== "nenhuma") body.set("marca_id", marcaId);
    if (logoModo === "carimbo") body.set("posicao_logo", posicaoLogo);
    if (logoModo !== "nenhuma") {
      body.set("logo_cor", logoCor === "hex" ? logoHex : logoCor);
    }
    /* So manda se o manto for MESMO do clube em campo: trocar de atleta depois
       de escolher deixaria o id apontando para a camisa de outro time, e o
       modelo obedeceria sem reclamar. */
    if (uniformeId && uniformesDoClube.some((u) => u.id === uniformeId)) {
      body.set("uniforme_id", uniformeId);
    }

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
      jogador_id: jogadorId,
      clube_id: clubeDoAtleta?.id ?? null,
      adversario_id: adversarioId,
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
      modelo: resultado.modelo,
      provider: resultado.provider,
      custo_usd: resultado.custo_usd,
      duracao_ms: Math.round(resultado.duracao_ms),
      marca_id: resultado.marca_id,
      posicao_logo: resultado.posicao_logo,
      logo_modo: resultado.logo_modo,
      logo_cor: resultado.logo_cor,
      uniforme_id: resultado.uniforme_id,
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
            Escolha a categoria e o atleta. O estilo da arte já está definido — você não precisa
            descrever nada.
          </p>
        </div>

        <Stepper passos={["Tipo do post", "Formato e atleta", "Textos"]} atual={passo} aoIr={setPasso} />

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
                  onMouseMove={seguirCursor}
                  className={cn(
                    "lift holofote group overflow-hidden rounded-card border p-5 text-left",
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
              <div className="grid gap-3 min-[420px]:grid-cols-2">
                {FORMATOS.map((f) => {
                  const m = FORMATO_META[f];
                  const ativo = formato === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormato(f)}
                      onMouseMove={seguirCursor}
                      className={cn(
                        "lift holofote flex items-center gap-4 rounded-card border p-4 text-left",
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

            {/*
              A logo, escolhida por arte e não por conta.
              A escolha some quando não há marca cadastrada: oferecer três modos
              de aplicar uma logo que não existe é oferecer trabalho.
            */}
            {marcas.length > 0 && (
              <div>
                <p className="mb-3 text-[13px] font-medium">
                  Logo <span className="text-muted-2">quem decide onde ela entra</span>
                </p>

                <div className="grid gap-3 min-[420px]:grid-cols-3">
                  {LOGO_MODOS.map((modo) => {
                    const m = LOGO_MODO_META[modo];
                    const ativo = logoModo === modo;
                    return (
                      <button
                        key={modo}
                        type="button"
                        onClick={() => setLogoModo(modo)}
                        onMouseMove={seguirCursor}
                        className={cn(
                          "lift holofote rounded-card border p-4 text-left",
                          ativo
                            ? "border-accent bg-accent/10"
                            : "border-line bg-surface/70 hover:border-line-2",
                        )}
                      >
                        <span className="block text-[14px] font-medium">{m.titulo}</span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                          {m.dica}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {logoModo !== "nenhuma" && marcas.length > 1 && (
                  <div className="mt-3">
                    <Campo rotulo="Qual logo">
                      <Select
                        value={marcaId ?? ""}
                        onChange={(e) => setMarcaId(e.target.value || null)}
                      >
                        {marcas.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                  </div>
                )}

                {logoModo !== "nenhuma" && (
                  <div className="mt-3">
                    <p className="mb-2 text-[12px] font-medium">
                      Cor da logo{" "}
                      <span className="text-muted-2">a forma continua a mesma</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LOGO_CORES.map((c) => {
                        const ativo = logoCor === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setLogoCor(c)}
                            title={LOGO_COR_META[c].dica}
                            className={cn(
                              "rounded-field border px-3 py-2 text-[12px] transition-colors",
                              ativo
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-line bg-surface-2/40 hover:border-line-2",
                            )}
                          >
                            {LOGO_COR_META[c].titulo}
                          </button>
                        );
                      })}
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-field border px-3 py-2 text-[12px] transition-colors",
                          logoCor === "hex"
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-line bg-surface-2/40 hover:border-line-2",
                        )}
                      >
                        <span
                          className="size-3.5 rounded-full border border-line-2"
                          style={{ background: logoHex }}
                        />
                        Escolher
                        <input
                          type="color"
                          value={logoHex}
                          onChange={(e) => {
                            setLogoHex(e.target.value.toUpperCase());
                            setLogoCor("hex");
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    {logoCor === "auto" && logoModo === "ia" && (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
                        Com a IA posicionando, a automática vira branca: ela mede o lugar onde a
                        logo cai, e aqui o lugar só existe depois da arte pronta.
                      </p>
                    )}
                  </div>
                )}

                {logoModo === "carimbo" && (
                  <div className="mt-3">
                    <Campo rotulo="Em qual canto" dica="escolhido antes de a arte existir">
                      <Select
                        value={posicaoLogo}
                        onChange={(e) => setPosicaoLogo(e.target.value as PosicaoLogo)}
                      >
                        {POSICOES_LOGO.map((p) => (
                          <option key={p} value={p}>
                            {POSICAO_LOGO_ROTULO[p]}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                  </div>
                )}
              </div>
            )}

            {/*
              Só os mantos do clube do atleta: uniforme do adversário aqui seria
              oferecer o erro. Some quando o clube não tem nenhum cadastrado —
              não há escolha a fazer, e a camisa continua vindo da foto.
            */}
            {uniformesDoClube.length > 0 && (
              <div>
                <p className="mb-3 text-[13px] font-medium">
                  Uniforme <span className="text-muted-2">o manto desta arte</span>
                </p>
                <div className="grid gap-3 min-[420px]:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setUniformeId(null)}
                    onMouseMove={seguirCursor}
                    className={cn(
                      "lift holofote rounded-card border p-4 text-left",
                      uniformeId === null
                        ? "border-accent bg-accent/10"
                        : "border-line bg-surface/70 hover:border-line-2",
                    )}
                  >
                    <span className="block text-[14px] font-medium">Da foto</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                      A camisa que o atleta veste na foto do elenco.
                    </span>
                  </button>
                  {uniformesDoClube.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUniformeId(u.id)}
                      onMouseMove={seguirCursor}
                      className={cn(
                        "lift holofote flex items-center gap-3 rounded-card border p-3 text-left",
                        uniformeId === u.id
                          ? "border-accent bg-accent/10"
                          : "border-line bg-surface/70 hover:border-line-2",
                      )}
                    >
                      {u.imagem_url && (
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-[8px]">
                          <Image src={u.imagem_url} alt="" fill sizes="48px" className="object-cover" />
                        </span>
                      )}
                      <span className="min-w-0 text-[13px] font-medium">{u.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 text-[13px] font-medium">
                Atleta <span className="text-muted-2">do elenco cadastrado</span>
              </p>
              {jogadores.length === 0 ? (
                <div className="surface grid place-items-center gap-3 rounded-card py-12 text-center">
                  <p className="text-[13px] font-medium">Nenhum atleta cadastrado ainda</p>
                  <p className="max-w-[40ch] text-[12px] leading-relaxed text-muted">
                    Cadastre o atleta uma vez, com nome, clube e foto. Depois é só escolher da
                    lista a cada post.
                  </p>
                  <BotaoLink href="/elenco" variante="sutil" tamanho="sm">
                    Ir para o elenco
                  </BotaoLink>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-5 lg:grid-cols-6">
                  {jogadores.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => escolherAtleta(j)}
                      onMouseMove={seguirCursor}
                      className={cn(
                        "lift holofote overflow-hidden rounded-card border text-left",
                        jogadorId === j.id
                          ? "border-accent bg-accent/10"
                          : "border-line bg-surface hover:border-line-2",
                      )}
                    >
                      <span className="relative block aspect-[4/5] w-full bg-surface-2">
                        {j.foto_url ? (
                          <Image src={j.foto_url} alt="" fill sizes="140px" className="object-cover" />
                        ) : (
                          <span className="grid h-full place-items-center text-muted-2">
                            <UserRound size={18} strokeWidth={1.5} />
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 block p-2 text-[12px] font-medium leading-snug">
                        {j.nome}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Navegacao
              voltar={() => setPasso(0)}
              avancar={() => setPasso(2)}
              podeAvancar={Boolean(jogadorId)}
              rotuloAvancar="Continuar"
            />
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* nome e clube vêm do cadastro: editáveis aqui, mas já preenchidos */}
              <Campo rotulo="Nome do atleta" dica="como sai escrito na arte">
                <Input
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Lucas Ferreira"
                />
              </Campo>
              <Campo
                rotulo="Clube"
                dica={clubeDoAtleta ? "escudo e cores vão junto" : "sem escudo cadastrado"}
              >
                <div className="flex items-center gap-3">
                  <Input
                    value={clube}
                    onChange={(e) => setClube(e.target.value)}
                    placeholder="Vitória Guimarães"
                  />
                  {clubeDoAtleta?.escudo_url && (
                    <span className="relative size-9 shrink-0">
                      <Image
                        src={clubeDoAtleta.escudo_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    </span>
                  )}
                </div>
              </Campo>
            </div>

            {meta?.exigeJogo && (
              <div className="space-y-5 rounded-card border border-line bg-surface-2/30 p-5">
                <p className="text-[12px] leading-relaxed text-muted">
                  Dados da partida. Sem eles o modelo inventa data e adversário, e data
                  inventada parece certa, ninguém confere.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo rotulo="Adversário" dica="clube cadastrado">
                    <Select
                      value={adversarioId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setAdversarioId(id);
                        const c = clubes.find((x) => x.id === id);
                        // o texto acompanha a escolha: e ele que vai escrito na arte
                        setJogo((j) => ({ ...j, adversario: c ? (c.nome_curto ?? c.nome) : "" }));
                      }}
                    >
                      <option value="">Escolha o clube</option>
                      {clubes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </Select>
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

            {!jogador?.foto_url && (
              <p className="rounded-field border border-warn/40 bg-warn/10 p-3 text-[12px]">
                O atleta escolhido está sem foto no cadastro. Sem ela o modelo inventa um rosto —
                adicione a foto no Elenco antes de gerar.
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
