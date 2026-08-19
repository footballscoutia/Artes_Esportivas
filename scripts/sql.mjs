/**
 * Roda SQL no projeto pela Management API, sem abrir o dashboard.
 *
 *   node scripts/sql.mjs sql/001_schema.sql      arquivo inteiro
 *   node scripts/sql.mjs -e "select now()"       consulta solta
 *   node scripts/sql.mjs --tabelas               o que existe hoje no public
 *
 * Precisa de SUPABASE_ACCESS_TOKEN no .env.local. O ref do projeto sai da
 * NEXT_PUBLIC_SUPABASE_URL — nao ha o que configurar duas vezes.
 *
 * O token vale pela conta inteira, entao este arquivo nunca imprime o valor
 * dele: nem em erro, nem em log, nem no cabecalho que ele monta.
 */
import { readFile } from "node:fs/promises";

const API = "https://api.supabase.com/v1";

async function lerEnv() {
  let bruto;
  try {
    bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    sair("Nao achei o .env.local. Copie o .env.example e preencha.");
  }
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

/**
 * Encerra com mensagem. Joga em vez de chamar process.exit() de proposito: no
 * Windows, matar o processo com um fetch ainda aberto solta um "Assertion
 * failed" do libuv depois da mensagem, e o usuario le o susto em vez do erro.
 */
class Parada extends Error {}

function sair(msg) {
  throw new Parada(msg);
}

async function rodar(sql) {
  const env = await lerEnv();

  // variavel de ambiente ganha do arquivo: da para rodar uma vez sem deixar o
  // token gravado em disco — `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/sql.mjs ...`
  const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    sair(
      "SUPABASE_ACCESS_TOKEN vazio no .env.local.\n" +
        "  Dashboard -> Account -> Access Tokens -> Generate new token (prefixo sbp_).",
    );
  }
  if (!token.startsWith("sbp_")) {
    // erro comum: colar a service_role aqui. Sao coisas diferentes e nao se substituem.
    sair(
      "Esse token nao parece um Personal Access Token (deveria comecar com sbp_).\n" +
        "  A service_role key NAO serve aqui: ela fala com o banco, nao com a API de gestao.",
    );
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) sair("NEXT_PUBLIC_SUPABASE_URL vazio no .env.local.");
  const ref = new URL(url).hostname.split(".")[0];

  const r = await fetch(`${API}/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });

  const texto = await r.text();

  if (!r.ok) {
    let detalhe = texto;
    try {
      const j = JSON.parse(texto);
      detalhe = j.message ?? j.error ?? texto;
    } catch {}
    if (r.status === 401) {
      sair(`401 — token invalido ou revogado. Gere outro no dashboard.\n  ${detalhe}`);
    }
    sair(`HTTP ${r.status} — ${detalhe}`);
  }

  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    sair('Uso: node scripts/sql.mjs <arquivo.sql> | -e "<sql>" | --tabelas');
  }

  let sql;
  let rotulo;

  if (args[0] === "--tabelas") {
    rotulo = "tabelas em public";
    sql = `select table_name as tabela,
                  (select count(*) from information_schema.columns c
                    where c.table_name = t.table_name and c.table_schema = 'public') as colunas
             from information_schema.tables t
            where table_schema = 'public' and table_type = 'BASE TABLE'
            order by table_name;`;
  } else if (args[0] === "-e") {
    if (!args[1]) sair('Faltou o SQL depois do -e. Ex: -e "select now()"');
    rotulo = "consulta";
    sql = args[1];
  } else {
    rotulo = args[0];
    sql = await readFile(args[0], "utf8").catch(() => sair(`Nao consegui ler ${args[0]}`));
  }

  console.log(`\n  → ${rotulo}\n`);
  const saida = await rodar(sql);

  if (Array.isArray(saida) && saida.length > 0) {
    console.table(saida);
    console.log(`\n  ${saida.length} linha(s)\n`);
  } else if (Array.isArray(saida)) {
    console.log("  OK — comando executado, nenhuma linha devolvida.\n");
  } else {
    console.log(saida, "\n");
  }
}

try {
  await main();
} catch (e) {
  console.error(`\n  ${e instanceof Parada ? e.message : (e?.stack ?? e)}\n`);
  process.exitCode = 1;
}
