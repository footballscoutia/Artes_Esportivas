"use client";

import { useState, useTransition, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TituloSecao } from "@/components/ui/Card";
import { liberarGeracao, sair } from "@/lib/acoes";
import type { Acesso, Usuario } from "@/lib/types";

/**
 * A conta de quem esta logado — e, para quem administra, quem pode gastar.
 *
 * A tela antiga era "Equipe": liberava e-mail para entrar NESTA agencia. Isso
 * fez sentido enquanto o cadastro era fechado. Com o cadastro aberto, cada
 * pessoa ganha a propria agencia ao se inscrever, e a pergunta que sobrou nao
 * e mais "quem entra" — e "quem gasta". Sao coisas diferentes e a segunda e a
 * que custa dinheiro.
 *
 * O controle e da PLATAFORMA, nao da organizacao: quem paga a chave e que
 * libera. Fosse por organizacao, cada conta nova se liberaria sozinha no
 * cadastro, porque quem funda a org nasce aprovando nela.
 */
export function Conta({ usuario, acessos }: { usuario: Usuario | null; acessos: Acesso[] }) {
  const router = useRouter();
  const [pendente, comTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar(a: Acesso) {
    setErro(null);
    comTransicao(async () => {
      const r = await liberarGeracao(a.id, !a.pode_gerar);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[820px]">
        <TituloSecao
          titulo="Conta"
          descricao={usuario?.email}
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

        <section className="surface flex items-center gap-3 rounded-card p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[12px] font-semibold">
            {(usuario?.nome || usuario?.email || "—").slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">
              {usuario?.nome || usuario?.email}
            </span>
            <span className="block break-all text-[12px] leading-snug text-muted">
              {usuario?.email}
            </span>
          </span>
          {usuario?.papel === "aprova" && (
            <span
              title="Pode aprovar artes desta agência"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted"
            >
              <ShieldCheck size={13} strokeWidth={1.8} />
              aprova
            </span>
          )}
        </section>

        {/*
          Dizer em voz alta que a conta nao gera. Sem isto, a pessoa descobre a
          trava no meio da primeira arte, depois de escolher atleta e formato —
          e a mensagem de erro chega parecendo defeito, nao regra.
        */}
        {usuario && !usuario.podeGerar && (
          <p className="mt-4 flex items-start gap-2.5 rounded-card border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted">
            <Lock size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" />
            <span>
              Esta conta ainda não gera arte. O cadastro é livre, mas gerar consome crédito de
              modelo — quem administra o MatchPost libera conta a conta.
            </span>
          </p>
        )}

        {usuario?.ehAdmin && (
          <div className="mt-10">
            <h3 className="text-[13px] font-medium">Quem pode gerar</h3>
            <p className="mt-1.5 max-w-[62ch] text-[12px] leading-relaxed text-muted">
              Qualquer pessoa cria conta sozinha, e cada uma ganha a própria agência. Gerar
              arte é o que gasta crédito, e só é liberado aqui. O gasto mostrado é da agência
              inteira, não da pessoa.
            </p>

            {erro && (
              <p className="mt-4 rounded-field border border-erro/40 bg-erro/10 p-3 text-[12px]">
                {erro}
              </p>
            )}

            <ul className="surface mt-4 overflow-hidden rounded-card">
              {acessos.map((a, i) => (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span className="min-w-0 flex-1 basis-[220px]">
                    <span className="block truncate text-[14px] font-medium">
                      {a.nome || a.email}
                      {a.id === usuario.id && (
                        <span className="ml-2 text-[12px] text-muted-2">você</span>
                      )}
                    </span>
                    <span className="block break-all text-[12px] leading-snug text-muted">
                      {a.email} · {a.organizacao}
                    </span>
                  </span>

                  {/* tabular-nums: sem isso as colunas de valor dancam de linha
                      para linha e a lista para de ser comparavel de relance */}
                  <span className="shrink-0 text-right text-[12px] leading-snug text-muted tabular-nums">
                    <span className="block">
                      {a.geracoes_da_org} {a.geracoes_da_org === 1 ? "arte" : "artes"}
                    </span>
                    <span className="block text-muted-2">
                      US$ {Number(a.gasto_da_org_usd).toFixed(2)}
                    </span>
                  </span>

                  {a.admin_plataforma ? (
                    <span
                      title="Administra o MatchPost — sempre pode gerar"
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[11px] text-muted"
                    >
                      <Sparkles size={13} strokeWidth={1.8} />
                      admin
                    </span>
                  ) : (
                    <Button
                      tamanho="sm"
                      variante={a.pode_gerar ? "perigo" : "primario"}
                      disabled={pendente}
                      onClick={() => alternar(a)}
                      className="shrink-0"
                    >
                      {a.pode_gerar ? "Bloquear" : "Liberar"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ViewTransition>
  );
}
