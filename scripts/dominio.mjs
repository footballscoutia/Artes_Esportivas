/**
 * Aponta um domínio comprado na Hostinger para o projeto na Vercel.
 *
 *   node scripts/dominio.mjs matchpost.com.br --dry     mostra o que faria
 *   node scripts/dominio.mjs matchpost.com.br --aplicar manda de verdade
 *
 * Sempre cadastra o domínio raiz E o "www" — um redireciona pro outro na
 * própria Vercel, e ninguém que digitar só metade do endereço cai em erro.
 *
 * Dois tokens no .env.local: VERCEL_TOKEN (já configurado neste projeto) e
 * HOSTINGER_API_TOKEN. Nenhum dos dois é impresso, nem em erro.
 *
 * Só ESCREVE dois registros na zona da Hostinger — o A do raiz e o CNAME do
 * www — e nunca com `overwrite`: o que já existir na zona (e-mail, por
 * exemplo) fica como está.
 */
import { readFile } from "node:fs/promises";

const VERCEL_API = "https://api.vercel.com";
const HOSTINGER_API = "https://developers.hostinger.com";

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() =>
    sair("Não achei o .env.local."),
  );
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

async function api(base, caminho, token, opcoes = {}) {
  const { opcional = false, ...resto } = opcoes;
  const r = await fetch(`${base}${caminho}`, {
    ...resto,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...resto.headers },
  });
  const txt = await r.text();
  let corpo;
  try {
    corpo = txt ? JSON.parse(txt) : {};
  } catch {
    corpo = { raw: txt };
  }
  if (!r.ok) {
    if (opcional) return null;
    const msg = corpo?.error?.message ?? corpo?.message ?? corpo?.raw ?? `HTTP ${r.status}`;
    sair(`HTTP ${r.status} em ${caminho}\n  ${msg}`);
  }
  return corpo;
}

/** Mesma lógica de scripts/vercel-env.mjs — projeto pode estar num time. */
async function acharProjetoVercel(token, nome, timeDoEnv) {
  const escopos = [];
  const times = await api(VERCEL_API, "/v2/teams", token, { opcional: true });
  for (const t of times?.teams ?? []) escopos.push({ rotulo: `time ${t.slug}`, param: `teamId=${t.id}` });
  if (timeDoEnv && !escopos.some((e) => e.rotulo === `time ${timeDoEnv}`)) {
    escopos.push({ rotulo: `time ${timeDoEnv}`, param: `slug=${encodeURIComponent(timeDoEnv)}` });
  }
  escopos.push({ rotulo: "conta pessoal", param: null });

  for (const e of escopos) {
    const q = [e.param, `search=${encodeURIComponent(nome)}`].filter(Boolean).join("&");
    const res = await api(VERCEL_API, `/v9/projects?${q}`, token, { opcional: true });
    const achado = (res?.projects ?? []).find((p) => p.name === nome) ?? (res?.projects ?? [])[0];
    if (achado) return { id: achado.id, nome: achado.name, param: e.param };
  }
  sair(`Não achei o projeto "${nome}" na Vercel.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dominio = args.find((a) => !a.startsWith("--"));
  const aplicar = args.includes("--aplicar");

  if (!dominio) sair("Uso: node scripts/dominio.mjs <dominio.com.br> [--dry|--aplicar]");

  const env = await lerEnv();
  const tokenVercel = env.VERCEL_TOKEN;
  const tokenHostinger = env.HOSTINGER_API_TOKEN;
  if (!tokenVercel) sair("VERCEL_TOKEN vazio no .env.local.");
  if (!tokenHostinger) sair("HOSTINGER_API_TOKEN vazio no .env.local.");

  const raiz = dominio;
  const www = `www.${dominio}`;

  const projeto = await acharProjetoVercel(tokenVercel, env.VERCEL_PROJECT || "artes-esportivas", env.VERCEL_TEAM);
  const url = (caminho, extra = "") => {
    const q = [projeto.param, extra].filter(Boolean).join("&");
    return q ? `${caminho}?${q}` : caminho;
  };
  console.log(`\n  projeto Vercel: ${projeto.nome}`);
  console.log(`  domínio: ${raiz} + ${www}\n`);

  // --- 1. cadastra os dois no projeto da Vercel (idempotente: 409 se já existe, tudo bem) ---
  for (const nome of [raiz, www]) {
    const r = await api(VERCEL_API, url(`/v10/projects/${projeto.id}/domains`), tokenVercel, {
      method: "POST",
      body: JSON.stringify({ name: nome }),
      opcional: true,
    });
    console.log(r ? `  cadastrado na Vercel: ${nome}` : `  já estava na Vercel (ou sem permissão): ${nome}`);
  }

  // --- 2. pergunta pra Vercel quais registros ela quer para cada um ---
  const configRaiz = await api(VERCEL_API, `/v6/domains/${raiz}/config`, tokenVercel);
  const configWww = await api(VERCEL_API, `/v6/domains/${www}/config`, tokenVercel);

  /* recommendedIPv4[0].value e uma LISTA — a Vercel pede varios A no raiz,
     nao um so. Confirmado lendo a resposta bruta antes de escrever qualquer
     coisa: um valor unico com virgula dentro teria ido pro Hostinger como um
     registro A invalido. */
  const ipsRaiz = configRaiz.recommendedIPv4?.[0]?.value ?? ["76.76.21.21"];
  const cnameWww = configWww.recommendedCNAME?.[0]?.value ?? "cname.vercel-dns.com.";

  console.log(`\n  a Vercel pediu:`);
  for (const ip of ipsRaiz) console.log(`    ${raiz.padEnd(24)} A      ${ip}`);
  console.log(`    ${www.padEnd(24)} CNAME  ${cnameWww}`);

  // --- 3. le a zona atual na Hostinger, pra nao pisar em nada que ja existe ---
  const zonaAtual = await api(HOSTINGER_API, `/api/dns/v1/zones/${dominio}`, tokenHostinger);
  const jaTem = (nome, tipo) =>
    (zonaAtual ?? []).some((r) => (r.name === "" ? "@" : r.name) === nome && r.type === tipo);

  console.log(`\n  zona atual na Hostinger tem ${zonaAtual?.length ?? 0} registro(s).`);
  console.log(`    A no raiz já existe: ${jaTem("@", "A") ? "sim — será atualizado" : "não — será criado"}`);
  console.log(`    CNAME no www já existe: ${jaTem("www", "CNAME") ? "sim — será atualizado" : "não — será criado"}`);

  const registros = [
    { name: "@", type: "A", ttl: 3600, records: ipsRaiz.map((ip) => ({ content: ip })) },
    { name: "www", type: "CNAME", ttl: 3600, records: [{ content: cnameWww }] },
  ];

  if (!aplicar) {
    console.log("\n  --dry (padrão): nada foi escrito na Hostinger. Rode com --aplicar para valer.\n");
    return;
  }

  /**
   * Apaga so esses dois nomes antes de escrever.
   *
   * CNAME so aceita um valor por nome — o PUT com overwrite:false tenta
   * ACRESCENTAR em vez de trocar quando o conteudo muda, e a Hostinger recusa
   * com "has more than one record". Apagar pelo filtro (name, type) e
   * cirurgico: so esses dois nomes somem, o resto da zona (e-mail, por
   * exemplo) fica intacto.
   */
  await api(HOSTINGER_API, `/api/dns/v1/zones/${dominio}`, tokenHostinger, {
    method: "DELETE",
    body: JSON.stringify({ filters: [{ name: "@", type: "A" }, { name: "www", type: "CNAME" }] }),
    opcional: true, // 404/vazio se um dos dois nao existia mais — segue o jogo
  });

  await api(HOSTINGER_API, `/api/dns/v1/zones/${dominio}`, tokenHostinger, {
    method: "PUT",
    body: JSON.stringify({ overwrite: false, zone: registros }),
  });

  console.log("\n  escrito na Hostinger.");
  console.log("  propagação de DNS leva de minutos a algumas horas.");
  console.log(`  confira em: https://vercel.com/domains/${dominio}\n`);
}

try {
  await main();
} catch (e) {
  console.error(`\n  ${e instanceof Parada ? e.message : (e?.stack ?? e)}\n`);
  process.exitCode = 1;
}
