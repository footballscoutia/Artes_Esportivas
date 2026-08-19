import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Volta do link de e-mail.
 *
 * `signInWithOtp` nao loga ninguem: ele manda um link. Quem loga e esta rota,
 * que troca o que vem na URL por uma sessao e grava os cookies. Sem ela o link
 * chega, o usuario clica, cai numa tela qualquer e continua deslogado — sem
 * nenhum erro visivel, que e o pior tipo de bug.
 *
 * Dois formatos chegam aqui, porque depende do template de e-mail do projeto:
 *
 *   ?code=...                 fluxo PKCE (padrao do @supabase/ssr)
 *   ?token_hash=...&type=...  template antigo, ainda comum
 *
 * Os dois sao tratados. O que nao for reconhecido volta para /login com o
 * motivo na URL, nunca em silencio.
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // para onde o usuario queria ir antes de ser barrado pelo proxy
  const destino = searchParams.get("next") ?? searchParams.get("de") ?? "/fila";

  // so caminho interno: `next=https://outro.site` viraria redirect aberto
  const seguro = destino.startsWith("/") && !destino.startsWith("//") ? destino : "/fila";

  // o proprio Supabase avisa aqui quando o link expirou ou ja foi usado
  const erroSupabase = searchParams.get("error_description") ?? searchParams.get("error");
  if (erroSupabase) return voltarParaLogin(origin, erroSupabase);

  const supabase = await criarClienteServidor();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return voltarParaLogin(origin, error.message);
    return NextResponse.redirect(`${origin}${seguro}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return voltarParaLogin(origin, error.message);
    return NextResponse.redirect(`${origin}${seguro}`);
  }

  return voltarParaLogin(origin, "Link de acesso incompleto ou já utilizado.");
}

function voltarParaLogin(origin: string, motivo: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("erro", motivo);
  return NextResponse.redirect(url);
}
