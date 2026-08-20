"use client";

import { useRef, useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, LogOut, ShieldCheck, UserPlus, X } from "lucide-react";
import { Button, BotaoIcone } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { Campo, Input } from "@/components/ui/Field";
import { convidar, retirarConvite, sair } from "@/lib/acoes";
import type { Convite, Usuario } from "@/lib/types";

/**
 * Quem tem acesso ao estudio.
 *
 * Existe porque a entrada virou senha e o cadastro precisou ser fechado: sem
 * uma tela, liberar alguem novo viraria abrir o painel do Supabase e escrever
 * SQL, e uma tarefa dessas ou nao acontece ou acontece errado.
 */
export function Equipe({
  contas,
  convites,
  usuario,
}: {
  contas: Usuario[];
  convites: Convite[];
  usuario: Usuario | null;
}) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [avisou, setAvisou] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const aprova = usuario?.papel === "aprova";
  const pendentes = convites.filter((c) => !c.usado_em);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setErro(null);
    setAvisou(null);

    comTransicao(async () => {
      const r = await convidar(dados);
      if (!r.ok) return setErro(r.erro);
      formulario.current?.reset();
      setAvisou(r.dados.email);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[760px]">
        <TituloSecao
          titulo="Equipe"
          descricao={`${contas.length} ${contas.length === 1 ? "pessoa com acesso" : "pessoas com acesso"}`}
          acao={
            <Button
              variante="contorno"
              disabled={pendente}
              onClick={() => comTransicao(() => sair())}
            >
              <LogOut size={15} strokeWidth={1.9} />
              Sair da conta
            </Button>
          }
        />

        <section className="surface overflow-hidden rounded-card">
          {contas.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[12px] font-semibold">
                {(c.nome || c.email).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {c.nome || c.email}
                  {c.id === usuario?.id && <span className="ml-2 text-[12px] text-muted-2">você</span>}
                </span>
                {c.nome && <span className="block truncate text-[12px] text-muted">{c.email}</span>}
              </span>
              {c.papel === "aprova" && (
                <span
                  title="Pode aprovar arte e convidar gente"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted"
                >
                  <ShieldCheck size={13} strokeWidth={1.8} />
                  aprova
                </span>
              )}
            </div>
          ))}
        </section>

        {aprova && (
          <>
            <div className="mt-8">
              <h3 className="text-[13px] font-medium">Convidar</h3>
              <p className="mt-1.5 max-w-[58ch] text-[12px] leading-relaxed text-muted">
                Sem convite, ninguém cria conta — quem tenta é barrado pelo banco, não pela
                tela. Libere o e-mail aqui e peça para a pessoa se cadastrar na entrada.
              </p>

              <form ref={formulario} onSubmit={enviar} className="mt-4 flex items-end gap-3">
                <Campo rotulo="E-mail" className="flex-1">
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="colega@exemplo.com"
                    autoComplete="off"
                  />
                </Campo>
                <Button type="submit" tamanho="lg" disabled={pendente}>
                  <UserPlus size={15} strokeWidth={2} />
                  {pendente ? "Liberando…" : "Liberar"}
                </Button>
              </form>

              {erro && (
                <p className="mt-3 rounded-field border border-erro/40 bg-erro/10 p-3 text-[12px]">
                  {erro}
                </p>
              )}
              {avisou && !erro && (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
                  <Check size={14} className="text-ok" strokeWidth={2.2} />
                  {avisou} já pode criar conta.
                </p>
              )}
            </div>

            {pendentes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[13px] font-medium">
                  Convidados, ainda sem conta
                </h3>
                <ul className="surface mt-3 overflow-hidden rounded-card">
                  {pendentes.map((c, i) => (
                    <li
                      key={c.email}
                      className={`flex items-center gap-3 p-3.5 ${i > 0 ? "border-t border-line" : ""}`}
                    >
                      <Clock size={15} className="shrink-0 text-muted-2" strokeWidth={1.7} />
                      <span className="min-w-0 flex-1 truncate text-[13px]">{c.email}</span>
                      <BotaoIcone
                        titulo={`Retirar o convite de ${c.email}`}
                        onClick={() =>
                          comTransicao(async () => {
                            const r = await retirarConvite(c.email);
                            if (!r.ok) return setErro(r.erro);
                            router.refresh();
                          })
                        }
                      >
                        <X size={15} />
                      </BotaoIcone>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </ViewTransition>
  );
}
