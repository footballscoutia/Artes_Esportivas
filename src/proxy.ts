import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (era `middleware.ts` ate o Next 15 — o Next 16 renomeou o arquivo e a
 * funcao, mesma capacidade).
 *
 * Faz duas coisas, e so essas duas:
 *
 *   1. renova o cookie da sessao do Supabase. Server Component nao consegue
 *      escrever cookie, entao se ninguem renovar aqui a sessao morre sozinha.
 *   2. checagem otimista: manda para /login quem nao tem sessao, e para /biblioteca
 *      quem ja tem e caiu no /login.
 *
 * "Otimista" e a palavra que importa. O proxy roda em TODA requisicao, prefetch
 * de <Link> incluso, entao ele so le o cookie — `getClaims()` valida o JWT
 * localmente. Quem manda de verdade e a checagem no layout de `(app)`, que fala
 * com o servidor de auth. Aqui dentro nao entra consulta a banco.
 */

/** Rotas que existem sem sessao. O resto de `(app)` e fechado. */
/**
 * `/nova-senha` e publica de proposito.
 *
 * O link de recuperacao entrega a sessao no FRAGMENTO da URL, que so o
 * navegador enxerga — o servidor nao. Se o proxy exigisse sessao aqui, ele
 * mandaria a pessoa para o login antes de o JavaScript ter chance de ler o
 * fragmento, e o link nunca funcionaria.
 *
 * Deixar a tela publica nao abre nada: ela e um formulario. Quem autoriza a
 * troca e o `updateUser` do Supabase, que sem sessao de recuperacao recusa.
 */
const PUBLICAS = ["/login", "/auth", "/nova-senha"];

/** A fase 1 roda inteira sem Supabase: sem chave, o proxy sai de cena. */
const CONFIGURADO = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export async function proxy(req: NextRequest) {
  if (!CONFIGURADO) return NextResponse.next();

  // Esta resposta e a que segue viagem: o cliente do Supabase escreve os
  // cookies renovados nela, entao trocar de objeto no meio perde a sessao.
  let resposta = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          resposta = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida o JWT local e renova o par de tokens quando estiver vencendo.
  // E o unico await do caminho — nao acrescentar mais nenhum aqui.
  //
  // O try existe porque isto roda em TODA requisicao: Supabase fora do ar ou
  // URL errada no .env nao pode virar tela branca no app inteiro. Falhou, trata
  // como quem nao tem sessao — cai no /login, que sabe se explicar.
  let temSessao = false;
  try {
    const { data } = await supabase.auth.getClaims();
    temSessao = Boolean(data?.claims);
  } catch (e) {
    console.error("[proxy] falha ao validar a sessao", e);
  }

  const caminho = req.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));

  if (!temSessao && !publica) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    // guarda o destino para devolver o usuario onde ele queria entrar
    login.searchParams.set("de", caminho);
    return NextResponse.redirect(login);
  }

  if (temSessao && caminho === "/login") {
    const fila = req.nextUrl.clone();
    fila.pathname = "/biblioteca";
    fila.search = "";
    return NextResponse.redirect(fila);
  }

  return resposta;
}

export const config = {
  /**
   * Fora do proxy: arquivos internos do Next, o favicon, e a pasta de imagens.
   * `/api/gerar` tambem fica de fora — ele responde a fetch, nao a navegacao, e
   * um redirect 307 para /login viraria HTML no lugar do JSON que a tela espera.
   * A rota checa a propria sessao quando a fase 2 entrar.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|mock|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
