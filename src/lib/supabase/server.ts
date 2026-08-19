import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de servidor com a sessao do usuario. Respeita RLS. */
export async function criarClienteServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // chamado de dentro de um Server Component: o middleware ja renova a sessao
          }
        },
      },
    },
  );
}
