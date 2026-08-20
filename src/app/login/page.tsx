"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Campo, Input, Senha } from "@/components/ui/Field";
import { Marca } from "@/components/app/Marca";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Minimo do Supabase. Repetido aqui para o aviso sair antes da ida ao servidor. */
const MINIMO_SENHA = 6;

type Modo = "entrar" | "criar";

/**
 * O Supabase responde em ingles, e o resto do app fala portugues.
 *
 * A traducao e por trecho, nao por igualdade: as mensagens do servico mudam de
 * versao para versao, e casar a frase inteira quebraria em silencio — o usuario
 * veria ingles sem ninguem notar. O que nao for reconhecido passa como veio,
 * que e melhor que engolir o motivo.
 */
function emPortugues(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme o e-mail antes de entrar. A mensagem foi para a sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Esse e-mail já tem conta. Entre em vez de cadastrar.";
  if (m.includes("password should be"))
    return `A senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`;
  if (m.includes("only request this after") || m.includes("rate limit"))
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Confira o e-mail digitado.";
  return msg;
}

export default function LoginPage() {
  // useSearchParams precisa de fronteira de Suspense para a pagina seguir estatica
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  // erro vindo de /auth/callback (link expirado, ja usado) aparece de cara
  const [erro, setErro] = useState<string | null>(params.get("erro"));
  const campoEmail = useRef<HTMLInputElement>(null);

  /** Para onde voltar depois de entrar — o proxy poe o destino original em `de`. */
  const de = params.get("de");
  const destino = de?.startsWith("/") && !de.startsWith("//") ? de : "/biblioteca";

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
    setConfirmacao("");
    campoEmail.current?.focus();
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!CONFIGURADO) {
      setErro(
        "Supabase ainda não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e a anon key no .env.local.",
      );
      return;
    }

    if (modo === "criar") {
      if (senha.length < MINIMO_SENHA) {
        setErro(`A senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`);
        return;
      }
      if (senha !== confirmacao) {
        setErro("As duas senhas não são iguais.");
        return;
      }
    }

    setOcupado(true);
    const sb = criarClienteNavegador();

    if (modo === "entrar") {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      setOcupado(false);
      if (error) return setErro(emPortugues(error.message));

      /**
       * `replace`, nao `push`: o login nao pode ficar no historico, senao o
       * botao voltar do navegador devolve a tela de entrar para quem acabou de
       * entrar. O `refresh` vem junto porque quem escreveu o cookie foi o
       * navegador — sem ele o servidor ainda responde como deslogado.
       */
      router.replace(destino);
      router.refresh();
      return;
    }

    const volta = new URL("/auth/callback", location.origin);
    volta.searchParams.set("next", destino);

    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo: volta.toString() },
    });
    setOcupado(false);
    if (error) return setErro(emPortugues(error.message));

    /**
     * Com "Confirm email" ligado no projeto, o cadastro nao devolve sessao: o
     * usuario precisa clicar no link. Sem a confirmacao, a sessao ja vem e da
     * para entrar direto. Os dois casos existem conforme a configuracao do
     * Supabase, entao a tela le o retorno em vez de supor um deles.
     */
    if (data.session) {
      router.replace(destino);
      router.refresh();
      return;
    }
    setConfirmar(true);
  }

  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 py-16">
      {/*
        Refletor de estádio: o campo aceso de cima, com a luz caindo e morrendo
        antes da borda. Nasce do assunto — todo jogo noturno tem essa luz — e
        não da paleta de marca: é branco quente a três por cento, não o âmbar do
        acento, que fica reservado para ação.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 62% at 50% -12%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 62%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {/*
          A marca real da agência, sozinha. O orb é o estado "gerando", e usá-lo
          como identidade na entrada dizia que o produto é a IA. O produto é a
          agência; a IA é a ferramenta. O nome do app saiu junto: quem abre esta
          tela já sabe onde está, e o título repetia a logo em texto.
        */}
        <div className="mb-9 grid place-items-center">
          <Marca className="h-16" />
        </div>

        <Card className="p-6">
          {confirmar ? (
            <div className="grid gap-3 py-6 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full border border-line bg-surface-2 text-muted">
                <Mail size={18} strokeWidth={1.6} />
              </span>
              <p className="text-sm font-medium">Confirme o e-mail</p>
              <p className="text-[12px] leading-relaxed text-muted">
                Mandamos uma mensagem para {email}. Abra o link dela para ativar a conta e
                entrar.
              </p>
            </div>
          ) : (
            <>
              <Alternador modo={modo} aoTrocar={trocarModo} />

              <form onSubmit={enviar} className="mt-5 space-y-4">
                <Campo rotulo="E-mail">
                  <Input
                    ref={campoEmail}
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@mbsports.com.br"
                  />
                </Campo>

                <Campo
                  rotulo="Senha"
                  dica={modo === "criar" ? `mínimo ${MINIMO_SENHA} caracteres` : undefined}
                >
                  <Senha
                    name="senha"
                    autoComplete={modo === "criar" ? "new-password" : "current-password"}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                  />
                </Campo>

                {modo === "criar" && (
                  <Campo rotulo="Confirme a senha">
                    <Senha
                      name="confirmacao"
                      autoComplete="new-password"
                      required
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Campo>
                )}

                {erro && (
                  <p className="rounded-field border border-erro/40 bg-erro/10 p-3 text-[12px] leading-relaxed">
                    {erro}
                  </p>
                )}

                <Button type="submit" className="w-full" tamanho="lg" disabled={ocupado}>
                  {ocupado
                    ? modo === "entrar"
                      ? "Entrando…"
                      : "Criando…"
                    : modo === "entrar"
                      ? "Entrar"
                      : "Criar conta"}
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-2">
          Uso interno da equipe de marketing da Marcio Bittencourt Sports.
        </p>
      </div>
    </main>
  );
}

/**
 * Entrar e criar conta na mesma tela, com o fundo deslizando entre os dois.
 *
 * Mesma linguagem da navegacao principal: o indicador se move, os rotulos
 * ficam parados. Sao dois itens de largura igual, entao a posicao sai de uma
 * conta simples e nao precisa de medicao — a nav mede porque la os rotulos tem
 * tamanhos diferentes.
 */
function Alternador({ modo, aoTrocar }: { modo: Modo; aoTrocar: (m: Modo) => void }) {
  const OPCOES: Array<{ id: Modo; rotulo: string }> = [
    { id: "entrar", rotulo: "Entrar" },
    { id: "criar", rotulo: "Criar conta" },
  ];

  return (
    <div className="relative grid grid-cols-2 rounded-full bg-surface-2 p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface-3 transition-transform duration-[280ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
        style={{ transform: modo === "criar" ? "translateX(100%)" : "none" }}
      />
      {OPCOES.map(({ id, rotulo }) => (
        <button
          key={id}
          type="button"
          onClick={() => aoTrocar(id)}
          className={cn(
            "relative z-10 h-9 rounded-full text-[13px] font-medium transition-colors duration-[180ms]",
            modo === id ? "text-text" : "text-muted hover:text-text",
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
