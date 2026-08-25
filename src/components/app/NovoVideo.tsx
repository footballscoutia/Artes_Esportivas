"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Clapperboard, UserRound } from "lucide-react";
import { Button, BotaoLink } from "@/components/ui/Button";
import { Campo, Input } from "@/components/ui/Field";
import { EscolhasDeVideo } from "@/components/app/EscolhasDeVideo";
import { TIPOS, TIPO_META, type Clube, type Jogador, type Tipo } from "@/lib/types";
import { OPCOES_PADRAO, type Opcoes } from "@/video/template";
import { cn } from "@/lib/utils";

/**
 * Vídeo do ZERO, sem partir de uma arte.
 *
 * O caminho a partir de um pedido existente continua sendo o atalho: ele herda
 * atleta, confronto e datas de uma arte que a pessoa ja aprovou. Este aqui e o
 * caminho completo, para quando o video e o produto e nao o desdobramento.
 *
 * Os dois terminam na MESMA rota. A diferenca e so quem escreve o pedido: la, a
 * arte ja escreveu; aqui, esta tela escreve. Fossem duas rotas, uma delas
 * ganharia um campo novo primeiro e a outra ficaria para tras.
 */

type Props = { jogadores: Jogador[]; clubes: Clube[] };

/** Os tipos que fazem sentido em video vertical de rede social. */
const TIPOS_DE_VIDEO = TIPOS.filter((t) => t !== "frase");

export function NovoVideo({ jogadores, clubes }: Props) {
  const router = useRouter();

  const [tipo, setTipo] = useState<Tipo>("matchday");
  const [jogadorId, setJogadorId] = useState<string | null>(null);
  const [adversarioId, setAdversarioId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [clube, setClube] = useState("");
  const [jogo, setJogo] = useState({
    data_jogo: "",
    hora_jogo: "",
    campeonato: "",
    estadio: "",
  });
  const [opcoes, setOpcoes] = useState<Opcoes>(OPCOES_PADRAO);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const jogador = jogadores.find((j) => j.id === jogadorId) ?? null;
  const clubeDoAtleta = clubes.find((c) => c.id === jogador?.clube_id) ?? null;
  const adversario = clubes.find((c) => c.id === adversarioId) ?? null;
  const ehConfronto = tipo === "matchday";

  /* Escolher o atleta PREENCHE em vez de travar: o nome sai escrito no video e
     as vezes precisa sair diferente do cadastro — apelido, só o primeiro nome. */
  function escolherAtleta(j: Jogador) {
    setJogadorId(j.id);
    setNome(j.nome);
    const c = clubes.find((x) => x.id === j.clube_id);
    setClube(c ? (c.nome_curto ?? c.nome) : (j.clube ?? ""));
  }

  const pronto = nome.trim().length >= 2 && Boolean(jogadorId);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const r = await fetch("/api/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dados: {
            tipo,
            nome: nome.trim(),
            clube: clube.trim() || null,
            adversario: ehConfronto ? (adversario?.nome_curto ?? adversario?.nome ?? null) : null,
            data_jogo: jogo.data_jogo || null,
            hora_jogo: jogo.hora_jogo.trim() || null,
            campeonato: jogo.campeonato.trim() || null,
            estadio: jogo.estadio.trim() || null,
            jogador_id: jogadorId,
            clube_id: clubeDoAtleta?.id ?? null,
            adversario_id: ehConfronto ? adversarioId : null,
          },
          opcoes,
        }),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo?.erro ?? "Falha ao gerar as camadas.");
      router.push(`/video/${corpo.video_id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar as camadas.");
      setGerando(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-7">
        <div>
          <p className="mb-3 text-[13px] font-medium">
            Tipo <span className="text-muted-2 font-normal">o que o vídeo anuncia</span>
          </p>
          <div className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
            {TIPOS_DE_VIDEO.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "rounded-card border px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                  tipo === t
                    ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                    : "border-line hover:border-line-2",
                )}
              >
                {TIPO_META[t].rotulo}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-[13px] font-medium">
            Atleta <span className="text-muted-2 font-normal">do elenco cadastrado</span>
          </p>
          {jogadores.length === 0 ? (
            <div className="surface grid place-items-center gap-3 rounded-card py-12 text-center">
              <UserRound className="size-5 text-muted-2" />
              <p className="text-[13px] font-medium">Nenhum atleta cadastrado</p>
              <p className="max-w-[40ch] text-[12px] leading-relaxed text-muted">
                O vídeo precisa da foto do atleta para gerar a camada dele. Cadastre uma vez e
                use em todos os posts.
              </p>
              <BotaoLink href="/elenco" variante="sutil" tamanho="sm">
                Ir para o elenco
              </BotaoLink>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 min-[560px]:grid-cols-5">
              {jogadores.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => escolherAtleta(j)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-card border text-left transition-colors",
                    jogadorId === j.id
                      ? "border-accent ring-1 ring-accent/40"
                      : "border-line hover:border-line-2",
                  )}
                >
                  <span className="relative block aspect-square bg-surface-2">
                    {j.foto_url && (
                      <Image src={j.foto_url} alt="" fill sizes="160px" className="object-cover" />
                    )}
                  </span>
                  <span className="truncate px-2 py-1.5 text-[12px] font-medium">{j.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {ehConfronto && (
          <div>
            <p className="mb-3 text-[13px] font-medium">
              Adversário <span className="text-muted-2 font-normal">quem enfrenta</span>
            </p>
            <div className="grid grid-cols-3 gap-2 min-[560px]:grid-cols-6">
              {clubes
                .filter((c) => c.id !== clubeDoAtleta?.id)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAdversarioId(adversarioId === c.id ? null : c.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-card border px-2 py-2.5 transition-colors",
                      adversarioId === c.id
                        ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                        : "border-line hover:border-line-2",
                    )}
                  >
                    <span className="relative block size-8">
                      {c.escudo_url && (
                        <Image src={c.escudo_url} alt="" fill sizes="40px" className="object-contain" />
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[11px]">
                      {c.nome_curto ?? c.nome}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 min-[560px]:grid-cols-2">
          <Campo rotulo="Nome no vídeo">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Philippe Coutinho" />
          </Campo>
          <Campo rotulo="Clube">
            <Input value={clube} onChange={(e) => setClube(e.target.value)} placeholder="Vasco" />
          </Campo>
          <Campo rotulo="Campeonato">
            <Input
              value={jogo.campeonato}
              onChange={(e) => setJogo({ ...jogo, campeonato: e.target.value })}
              placeholder="Brasileirão"
            />
          </Campo>
          <Campo rotulo="Estádio">
            <Input
              value={jogo.estadio}
              onChange={(e) => setJogo({ ...jogo, estadio: e.target.value })}
              placeholder="São Januário"
            />
          </Campo>
          <Campo rotulo="Data">
            <Input
              type="date"
              value={jogo.data_jogo}
              onChange={(e) => setJogo({ ...jogo, data_jogo: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Horário">
            <Input
              value={jogo.hora_jogo}
              onChange={(e) => setJogo({ ...jogo, hora_jogo: e.target.value })}
              placeholder="20h30"
            />
          </Campo>
        </div>

        {/* Campo vazio não vira buraco: a linha inteira some do vídeo. É o mesmo
            comportamento da arte parada, e por isso não há campo obrigatório
            além do nome e do atleta. */}
        <p className="text-[12px] leading-relaxed text-muted-2">
          Campo em branco simplesmente não aparece no vídeo — nada fica escrito pela metade.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <EscolhasDeVideo opcoes={opcoes} aoMudar={(k, v) => setOpcoes((o) => ({ ...o, [k]: v }))} />

        {erro && <p className="text-[12px] leading-relaxed text-danger">{erro}</p>}

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <Button className="w-full" disabled={!pronto || gerando} onClick={gerar}>
            <Clapperboard size={15} />
            {gerando ? "Gerando camadas…" : "Gerar vídeo"}
          </Button>
          {!pronto && (
            <p className="text-[12px] text-muted-2">Escolha o atleta para continuar.</p>
          )}
          <p className="text-[11px] leading-relaxed text-muted-2">
            Gerar cria duas camadas — o cenário e o atleta recortado — e custa duas gerações.
            Depois disso, editar animação, ritmo, fonte e cores não custa nada.
          </p>
        </div>
      </div>
    </div>
  );
}
