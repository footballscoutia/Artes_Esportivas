"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, BotaoLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Campo, Senha } from "@/components/ui/Field";
import { Marca } from "@/components/app/Marca";
import { criarClienteNavegador } from "@/lib/supabase/client";

const MINIMO_SENHA = 6;

/**
 * Define uma senha nova.
 *
 * Chega-se aqui pelo link do e-mail de recuperacao, que aponta direto para ca
 * e traz a sessao na propria URL. Nao passa pelo `/auth/callback`: aquele e
 * uma rota de servidor, e conforme o link o Supabase entrega a sessao no
 * FRAGMENTO — que o servidor nunca recebe. Aqui, no navegador, os dois
 * formatos funcionam.
 *
 * A pagina nao pede a senha antiga porque nao ha o que pedir: quem abriu o
 * link ja provou ser dono da caixa de entrada.
 *
 * Serve tambem para quem nunca teve senha. As contas do primeiro mes nasceram
 * de link magico, sem senha nenhuma; quando a entrada virou senha, elas
 * ficaram sem porta. Este e o caminho de volta.
 */
export default function NovaSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sessao, setSessao] = useState<"procurando" | "ok" | "nenhuma">("procurando");

  /**
   * Espera a sessao do link aparecer antes de mostrar o formulario.
   *
   * O cliente do navegador le a URL sozinho ao carregar — tanto o `?code=`
   * quanto o `#access_token=` — mas isso leva alguns milissegundos. Mostrar o
   * formulario antes disso deixaria a pessoa digitar a senha inteira para so
   * entao descobrir que o link estava vencido.
   *
   * `onAuthStateChange` cobre o caso do fragmento, que chega depois do
   * primeiro `getSession`. Sem ele, um link valido as vezes aparecia como
   * vencido, dependendo de quem ganhava a corrida.
   */
  useEffect(() => {
    const sb = criarClienteNavegador();
    let vivo = true;

    const { data: assinatura } = sb.auth.onAuthStateChange((_evento, s) => {
      if (vivo && s) setSessao("ok");
    });

    (async () => {
      const busca = new URLSearchParams(location.search);
      const token_hash = busca.get("token_hash");

      /**
       * O caminho principal: trocar o token do e-mail por sessao aqui.
       *
       * O modelo de e-mail manda `?token_hash=`, e nao o `{{ .ConfirmationURL }}`
       * de fabrica. A URL de fabrica aponta para um GET no `/auth/v1/verify` do
       * Supabase que GASTA o token de uso unico — e o Gmail abre os links das
       * mensagens para escanear antes de entregar. O scanner clicava primeiro,
       * o link chegava queimado, e a pessoa via "este link nao vale mais" num
       * e-mail recem-recebido.
       *
       * `verifyOtp` e POST. O scanner, que so faz GET, nao gasta nada. E como
       * nao depende do verificador do PKCE, o link tambem funciona quando abre
       * em outro navegador — o do aplicativo de e-mail, por exemplo.
       */
      if (token_hash) {
        const { error } = await sb.auth.verifyOtp({ type: "recovery", token_hash });
        history.replaceState(null, "", location.pathname);
        if (vivo && !error) return setSessao("ok");
        if (vivo && error) return setSessao("nenhuma");
      }

      /**
       * Formato antigo, com a sessao no fragmento.
       *
       * Continua atendido porque e o que o painel do Supabase gera quando
       * alguem manda a recuperacao de la. O cliente do `@supabase/ssr` roda em
       * PKCE, e nesse modo o `detectSessionInUrl` so olha o `?code=` — sem
       * isto aqui, o `#access_token=` passava batido.
       */
      const frag = new URLSearchParams(location.hash.replace(/^#/, ""));
      const access_token = frag.get("access_token");
      const refresh_token = frag.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        // tira os tokens da barra de enderecos antes que virem historico ou print
        history.replaceState(null, "", location.pathname);
        if (vivo && !error) return setSessao("ok");
      }

      const { data } = await sb.auth.getSession();
      if (!vivo) return;
      if (data.session) return setSessao("ok");
      // o `?code=` e lido pelo proprio cliente: espera antes de dar por perdido
      setTimeout(() => vivo && setSessao((s) => (s === "procurando" ? "nenhuma" : s)), 1500);
    })();

    return () => {
      vivo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < MINIMO_SENHA) {
      setErro(`A senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setOcupado(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setOcupado(false);

    if (error) {
      /**
       * O caso comum aqui e link vencido ou ja usado: sem sessao de
       * recuperacao, o Supabase recusa a troca. Dizer "sessao ausente" nao
       * ajudaria ninguem; o que resolve e pedir outro link.
       */
      const m = error.message.toLowerCase();
      setErro(
        m.includes("session") || m.includes("jwt") || m.includes("token")
          ? "O link expirou ou já foi usado. Peça outro na tela de entrada."
          : error.message,
      );
      return;
    }

    router.replace("/biblioteca");
    router.refresh();
  }

  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 62% at 50% -12%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 62%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-9 grid place-items-center">
          <Marca className="h-16" />
        </div>

        <Card className="p-6">
          <h1 className="text-[15px] font-medium">Defina a sua senha</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {sessao === "nenhuma"
              ? "Este link não vale mais."
              : "É com ela que você vai entrar daqui em diante."}
          </p>

          {sessao === "nenhuma" ? (
            <div className="mt-5 space-y-4">
              <p className="rounded-field border border-line bg-surface-2/60 p-3 text-[12px] leading-relaxed text-muted">
                Links de recuperação valem por uma hora e só funcionam uma vez. Abra a entrada e
                peça outro — e abra o novo no mesmo navegador em que pediu.
              </p>
              <BotaoLink href="/login" className="w-full" tamanho="lg">
                Voltar para a entrada
              </BotaoLink>
            </div>
          ) : (
          <form onSubmit={enviar} className="mt-5 space-y-4">
            <Campo rotulo="Nova senha" dica={`mínimo ${MINIMO_SENHA} caracteres`}>
              <Senha
                autoComplete="new-password"
                required
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </Campo>

            <Campo rotulo="Confirme a senha">
              <Senha
                autoComplete="new-password"
                required
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="••••••••"
              />
            </Campo>

            {erro && (
              <p className="rounded-field border border-erro/40 bg-erro/10 p-3 text-[12px] leading-relaxed">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              tamanho="lg"
              disabled={ocupado || sessao !== "ok"}
            >
              {ocupado ? "Salvando…" : sessao === "procurando" ? "Conferindo o link…" : "Salvar e entrar"}
            </Button>
          </form>
          )}
        </Card>
      </div>
    </main>
  );
}
