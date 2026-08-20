/**
 * Sobe uma logo existente em public/brand/ para o bucket `marcas` e cadastra
 * a linha em `marcas`, para uma org que ja existe no banco.
 *
 *   node scripts/semear-marca.mjs <arquivo-em-public/brand> <nome-da-org> <nome-da-marca>
 *
 * Existe porque a Fase 1 tirou a logo de public/brand/logo.png fixo no codigo
 * e passou pra tabela `marcas` — a org do Marcio precisa da logo dela
 * cadastrada do mesmo jeito que qualquer cliente novo vai cadastrar a dele,
 * mas partindo de um arquivo que ja esta no repo em vez de um upload pela
 * tela (que ainda nao existe nesta fase).
 *
 * Roda com service_role: o bucket e privado e nao ha policy de authenticated
 * nele — so o servidor grava, sempre.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  return Object.fromEntries(
    bruto
      .split(/\r?\n/)
      .filter((l) => /^[A-Z]/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function main() {
  const [arquivo, nomeOrg, nomeMarca] = process.argv.slice(2);
  if (!arquivo || !nomeOrg || !nomeMarca) {
    console.error(
      'Uso: node scripts/semear-marca.mjs <arquivo-em-public/brand> "<nome da org>" "<nome da marca>"',
    );
    process.exitCode = 1;
    return;
  }

  const env = await lerEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");

  const sb = createClient(url, chave, { auth: { persistSession: false } });

  const { data: org, error: erroOrg } = await sb
    .from("organizacoes")
    .select("id")
    .eq("nome", nomeOrg)
    .maybeSingle();
  if (erroOrg || !org) throw new Error(`Org "${nomeOrg}" não encontrada: ${erroOrg?.message ?? "sem linha"}`);

  const bytes = await readFile(path.join(process.cwd(), "public", "brand", arquivo));
  const caminho = `${org.id}/${Date.now()}-${arquivo}`;

  const { error: erroUpload } = await sb.storage.from("marcas").upload(caminho, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (erroUpload) throw new Error(`Falha no upload: ${erroUpload.message}`);

  const { data: marca, error: erroMarca } = await sb
    .from("marcas")
    .insert({ org_id: org.id, nome: nomeMarca, imagem_url: caminho })
    .select("id")
    .single();
  if (erroMarca) throw new Error(`Falha ao cadastrar a marca: ${erroMarca.message}`);

  console.log(`OK — marca "${nomeMarca}" cadastrada (id ${marca.id}) para "${nomeOrg}", em ${caminho}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
