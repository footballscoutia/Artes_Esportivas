import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role: ignora RLS.
 * So pode ser importado em rota de servidor — e ele que grava a geracao e sobe
 * o arquivo para o storage depois que o modelo responde.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "Supabase nao configurado: falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local",
    );
  }

  return createClient(url, chave, { auth: { persistSession: false } });
}

/** A fase 1 roda inteira sem Supabase; isto diz se ja da para ligar a fase 2. */
export function supabaseConfigurado() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
