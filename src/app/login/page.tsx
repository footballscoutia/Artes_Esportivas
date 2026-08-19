"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Campo, Input } from "@/components/ui/Field";
import { Orb } from "@/components/art/Orb";
import { criarClienteNavegador } from "@/lib/supabase/client";

const CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function LoginPage() {
  // useSearchParams precisa de fronteira de Suspense para a pagina seguir estatica
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado">("parado");
  // erro vindo de /auth/callback (link expirado, ja usado) aparece de cara
  const [erro, setErro] = useState<string | null>(params.get("erro"));

  /** Para onde voltar depois de entrar — o proxy poe o destino original em `de`. */
  const de = params.get("de");
  const destino = de?.startsWith("/") && !de.startsWith("//") ? de : "/biblioteca";

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!CONFIGURADO) {
      setErro(
        "Supabase ainda não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e a anon key no .env.local.",
      );
      return;
    }

    setEstado("enviando");
    const volta = new URL("/auth/callback", location.origin);
    volta.searchParams.set("next", destino);

    const { error } = await criarClienteNavegador().auth.signInWithOtp({
      email: email.trim(),
      // tem que ser a rota que troca o codigo por sessao, nao uma tela:
      // apontar direto para /biblioteca deixa o usuario deslogado sem dizer nada
      options: { emailRedirectTo: volta.toString() },
    });

    if (error) {
      setErro(error.message);
      setEstado("parado");
      return;
    }
    setEstado("enviado");
  }

  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 grid place-items-center gap-6 text-center">
          <Orb tamanho={120} />
          <div>
            <h1 className="display text-[28px]">Estúdio de Artes</h1>
            <p className="mt-1.5 text-sm text-muted">Marcio Bittencourt Sports</p>
          </div>
        </div>

        <Card className="p-6">
          {estado === "enviado" ? (
            <div className="grid gap-3 py-6 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full border border-line bg-surface-2 text-muted">
                <Mail size={18} strokeWidth={1.6} />
              </span>
              <p className="text-sm font-medium">Link enviado para {email}</p>
              <p className="text-[12px] text-muted">
                Abra o e-mail neste mesmo navegador para entrar.
              </p>
            </div>
          ) : (
            <form onSubmit={entrar} className="space-y-4">
              <Campo rotulo="E-mail da agência">
                <Input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@mbsports.com.br"
                />
              </Campo>

              {erro && (
                <p className="rounded-field border border-accent/40 bg-accent/10 p-3 text-[12px]">
                  {erro}
                </p>
              )}

              <Button type="submit" className="w-full" tamanho="lg" disabled={estado === "enviando"}>
                {estado === "enviando" ? "Enviando…" : "Entrar por link"}
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-muted-2">
                Uso interno da equipe de marketing. Sem cadastro aberto — o acesso é
                liberado pela agência.
              </p>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
