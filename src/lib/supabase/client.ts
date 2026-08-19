import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador. So enxerga o que a RLS deixar. */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
