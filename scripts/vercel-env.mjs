/**
 * Sincroniza as variaveis de ambiente do .env.local com o projeto na Vercel.
 *
 *   node scripts/vercel-env.mjs --dry     mostra o que faria, sem enviar nada
 *   node scripts/vercel-env.mjs           envia
 *   node scripts/vercel-env.mjs --deploy  envia e dispara um redeploy
 *
 * Precisa de VERCEL_TOKEN no .env.local (vercel.com/account/tokens).
 *
 * Este arquivo lida com os VALORES das chaves, ao contrario do scripts/sql.mjs.
 * Por isso, tres regras:
 *   1. nenhum valor e impresso — nem em erro, nem em log, so o tamanho;
 *   2. a service_role sobe como `sensitive`: a Vercel aceita gravar e nunca
 *      mais devolve o valor, nem pela API nem pelo dashboard;
 *   3. a conferencia final le so os NOMES das variaveis, nunca os conteudos.
 */
import { readFile } from "node:fs/promises";

const API = "https://api.vercel.com";

const TODOS = ["production", "preview", "development"];

/**
 * Variavel `sensitive` NAO aceita "development" como alvo — a Vercel recusa com
 * 400. Faz sentido: em development o valor precisaria ser legivel para o
 * `vercel env pull`, e o ponto de `sensitive` e nunca mais ser legivel.
 * Rodando local, a service_role vem do .env.local mesmo.
 */
const SEM_DEV = ["production", "preview"];

/** O que sobe. O que nao esta aqui nao vai, por mais que exista no .env.local. */
const ENVIAR = [
  { chave: "NEXT_PUBLIC_SUPABASE_URL", tipo: "encrypted", alvos: TODOS },
  { chave: "NEXT_PUBLIC_SUPABASE_ANON_KEY", tipo: "encrypted", alvos: TODOS },
  { chave: "SUPABASE_SERVICE_ROLE_KEY", tipo: "sensitive", alvos: SEM_DEV },
  { chave: "IMAGE_PROVIDER", tipo: "encrypted", alvos: TODOS },
  /**
   * A chave do Gemini sobe como `sensitive`, igual a service_role: a Vercel
   * grava e nunca mais devolve o valor, nem pela API nem pelo painel. E uma
   * chave que gasta dinheiro de verdade — se um dia vazar, o prejuizo nao e
   * dado exposto, e saldo queimado.
   *
   * O nome do modelo nao e segredo e vai como as outras: precisa existir em
   * `development` tambem para o `vercel env pull` continuar montando um
   * .env.local que roda.
   */
  { chave: "GEMINI_API_KEY", tipo: "sensitive", alvos: SEM_DEV },
  { chave: "GEMINI_IMAGE_MODEL", tipo: "encrypted", alvos: TODOS },
];

/** Nunca sobem: sao ferramentas locais e na Vercel so aumentariam o estrago. */
const NUNCA = ["SUPABASE_ACCESS_TOKEN", "VERCEL_TOKEN", "VERCEL_PROJECT", "VERCEL_TEAM"];

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() =>
    sair("Nao achei o .env.local."),
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

/**
 * `opcional: true` devolve null em vez de estourar. Token de escopo restrito
 * pode nao ter permissao para chamadas de descoberta (listar times, por
 * exemplo) e ainda assim funcionar perfeitamente no projeto — negar ali nao e
 * motivo para parar tudo.
 */
async function api(caminho, token, opcoes = {}) {
  const { opcional = false, ...resto } = opcoes;
  const r = await fetch(`${API}${caminho}`, {
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
    const msg = corpo?.error?.message ?? corpo?.raw ?? `HTTP ${r.status}`;
    if (r.status === 401 || r.status === 403) {
      sair(`${r.status} — token da Vercel invalido, expirado ou sem acesso.\n  ${msg}`);
    }
    sair(`HTTP ${r.status} em ${caminho}\n  ${msg}`);
  }
  return corpo;
}

/**
 * Acha o projeto na conta pessoal e em cada time. Projeto de time exige
 * ?teamId= em toda chamada seguinte — sem isso a API responde 404 dizendo que
 * o projeto nao existe, que e o erro mais confuso possivel.
 */
async function acharProjeto(token, nome, timeDoEnv) {
  const escopos = [];

  // Token de escopo restrito costuma nao poder listar times. Se der, otimo:
  // acha o projeto em qualquer time sozinho. Se nao der, seguimos pelo slug.
  const times = await api("/v2/teams", token, { opcional: true });
  for (const t of times?.teams ?? []) escopos.push({ rotulo: `time ${t.slug}`, param: `teamId=${t.id}` });

  // a API aceita ?slug= no lugar de ?teamId=, e o slug esta na URL do deploy
  if (timeDoEnv && !escopos.some((e) => e.rotulo === `time ${timeDoEnv}`)) {
    escopos.push({ rotulo: `time ${timeDoEnv}`, param: `slug=${encodeURIComponent(timeDoEnv)}` });
  }
  escopos.push({ rotulo: "conta pessoal", param: null });

  const tentados = [];
  for (const e of escopos) {
    const q = [e.param, `search=${encodeURIComponent(nome)}`].filter(Boolean).join("&");
    const res = await api(`/v9/projects?${q}`, token, { opcional: true });
    if (!res) {
      tentados.push(`${e.rotulo} (sem acesso)`);
      continue;
    }
    const achado = (res.projects ?? []).find((p) => p.name === nome) ?? (res.projects ?? [])[0];
    if (achado) return { id: achado.id, nome: achado.name, param: e.param, escopo: e.rotulo };
    tentados.push(`${e.rotulo} (nao tem o projeto)`);
  }

  sair(
    `Nao achei o projeto "${nome}" na Vercel.\n` +
      `  Procurei em: ${tentados.join(", ")}\n` +
      `  Se o time nao aparece acima, ponha VERCEL_TEAM=<slug-do-time> no .env.local.\n` +
      `  O slug esta na URL do deploy: artes-esportivas-git-main-<SLUG>.vercel.app`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const seco = args.includes("--dry");
  const deployar = args.includes("--deploy");

  const env = await lerEnv();
  const token = process.env.VERCEL_TOKEN || env.VERCEL_TOKEN;
  if (!token) {
    sair("VERCEL_TOKEN vazio no .env.local.\n  Gere em vercel.com/account/tokens → Create Token.");
  }

  const faltando = ENVIAR.filter((v) => !env[v.chave]);
  if (faltando.length) {
    sair(`Sem valor no .env.local para: ${faltando.map((f) => f.chave).join(", ")}`);
  }

  const projeto = await acharProjeto(
    token,
    env.VERCEL_PROJECT || "artes-esportivas",
    env.VERCEL_TEAM || null,
  );
  /** Junta o escopo do time a qualquer query string, sem duplicar "?". */
  const url = (caminho, extra = "") => {
    const q = [projeto.param, extra].filter(Boolean).join("&");
    return q ? `${caminho}?${q}` : caminho;
  };
  console.log(`\n  projeto: ${projeto.nome}  (${projeto.escopo})\n`);

  console.log("  vai subir:");
  for (const v of ENVIAR) {
    console.log(
      `    ${v.chave.padEnd(30)} ${String(env[v.chave].length).padStart(4)} chars  [${v.tipo}]  ${v.alvos.join(", ")}`,
    );
  }
  console.log("\n  nunca sobem:", NUNCA.join(", "), "\n");

  if (seco) {
    console.log("  --dry: nada foi enviado.\n");
    return;
  }

  // upsert=true: se a variavel ja existe, atualiza em vez de estourar duplicata
  const corpo = ENVIAR.map((v) => ({
    key: v.chave,
    value: env[v.chave],
    type: v.tipo,
    target: v.alvos,
  }));

  // A Vercel aceita sucesso PARCIAL: cria o que deu, devolve 200, e lista o
  // resto em `failed`. Sem olhar esse array, uma variavel some em silencio e o
  // deploy sobe pela metade — que foi exatamente o que aconteceu na primeira vez.
  const res = await api(url(`/v10/projects/${projeto.id}/env`, "upsert=true"), token, {
    method: "POST",
    body: JSON.stringify(corpo),
  });

  const falhas = res?.failed ?? [];
  if (falhas.length) {
    const detalhe = falhas
      .map((f) => `    ${f.error?.envVarKey ?? "?"}: ${f.error?.message ?? "erro sem mensagem"}`)
      .join("\n");
    sair(`A Vercel recusou ${falhas.length} variável(is):\n${detalhe}`);
  }
  console.log("  enviadas.\n");

  // conferencia: le so os nomes e os alvos, nunca os valores
  const { envs = [] } = await api(url(`/v9/projects/${projeto.id}/env`), token);
  console.log("  agora no projeto:");
  for (const v of ENVIAR) {
    const achadas = envs.filter((e) => e.key === v.chave);
    const alvos = [...new Set(achadas.flatMap((e) => e.target ?? []))].sort();
    const falta = v.alvos.filter((a) => !alvos.includes(a));
    console.log(
      `    ${v.chave.padEnd(30)} ${alvos.length ? alvos.join(", ") : "AUSENTE"}${falta.length ? "   <= FALTA " + falta.join(", ") : ""}`,
    );
  }

  const intrusas = envs.filter((e) => NUNCA.includes(e.key));
  console.log(
    intrusas.length
      ? `\n  ATENCAO: ${intrusas.map((i) => i.key).join(", ")} esta(o) na Vercel e nao deveria(m).`
      : "\n  nenhum token local vazou para a Vercel.",
  );

  if (!deployar) {
    console.log("\n  Variavel nova so vale em build novo. Rode com --deploy, ou:");
    console.log("  Vercel → Deployments → o ultimo → ··· → Redeploy\n");
    return;
  }

  const { deployments = [] } = await api(
    url("/v6/deployments", `projectId=${projeto.id}&limit=1&state=READY`),
    token,
  );
  const ultimo = deployments[0];
  if (!ultimo?.meta?.githubCommitRef) {
    console.log("\n  Nao achei um deploy anterior com origem git. Redeploy pelo dashboard.\n");
    return;
  }

  const novo = await api(url("/v13/deployments", "forceNew=1"), token, {
    method: "POST",
    body: JSON.stringify({
      name: projeto.nome,
      project: projeto.id,
      target: "production",
      gitSource: {
        type: "github",
        org: ultimo.meta.githubCommitOrg,
        repo: ultimo.meta.githubCommitRepo,
        ref: ultimo.meta.githubCommitRef,
      },
    }),
  });
  console.log(`\n  redeploy disparado: https://${novo.url}`);
  console.log("  leva ~1 min. Confira depois em https://artes-esportivas.vercel.app/fila\n");
}

try {
  await main();
} catch (e) {
  console.error(`\n  ${e instanceof Parada ? e.message : (e?.stack ?? e)}\n`);
  process.exitCode = 1;
}
