/**
 * Gera candidatos a referencia nova, para trocar o acervo que veio do
 * Pinterest por um que e nosso de verdade.
 *
 *   node scripts/gerar-acervo.mjs <tipo> <formato> [--n 4] [--pasta out/acervo-novo]
 *
 *   node scripts/gerar-acervo.mjs matchday story_9x16 --n 6
 *
 * O que muda de categoria para categoria e so o TEXTO do prompt-mae — esse
 * sempre foi nosso, curado na tela de Referencias, nunca veio do Pinterest.
 * Este script pega o prompt-mae ATIVO mais recente daquela combinacao (tipo,
 * formato), troca os marcadores {{...}} por um exemplo generico, e pede ao
 * modelo para desenhar o ESTILO do zero — sem nenhuma imagem de entrada.
 *
 * De proposito, sem retratar ninguem real: o pedido inclui uma instrucao para
 * o atleta ficar generico (silhueta, sem rosto reconhecivel). O que este
 * acervo precisa mostrar e composicao, paleta e tipografia — nao uma pessoa.
 * A foto de quem gerar de verdade entra por cima disso, exatamente como hoje.
 *
 * SEM GEMINI_API_KEY no .env.local, roda em modo de prova: gera um degrade
 * local em vez de chamar o modelo, so para testar que a pasta, o manifesto e
 * o proximo passo (`importar-referencias.mjs`) funcionam. Nada e gasto, e o
 * aviso deixa isso claro no terminal.
 *
 * Nada aqui toca no banco. So depois de olhar as imagens e escolher as boas:
 *   node scripts/importar-referencias.mjs <pasta>
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const FORMATO_META = {
  feed_4x5: { w: 1080, h: 1350, aspectRatio: "4:5" },
  story_9x16: { w: 1080, h: 1920, aspectRatio: "9:16" },
};

const EXEMPLO = {
  nome: "Nome do Atleta",
  clube: "Clube",
  adversario: "Adversário",
  frase: "Frase de exemplo do atleta.",
  rotulo: "EXEMPLO",
  data: "SÁBADO 00/00",
  hora: "20h00",
  campeonato: "Campeonato",
  estadio: "Estádio Exemplo",
};

const INSTRUCAO_TEMPLATE =
  "\n\nESTE E UM TEMPLATE DE ESTILO PARA O ACERVO — nao a arte final de ninguem.\n" +
  "Represente o atleta de forma GENERICA: silhueta ou figura sem rosto reconhecivel,\n" +
  "sem tentar parecer uma pessoa real especifica. O que importa aqui e composicao,\n" +
  "paleta de cores, tratamento tipografico e enquadramento — nao uma identidade.\n" +
  "Use os textos de exemplo entre aspas exatamente como estao, para mostrar como o\n" +
  "layout acomoda texto de verdade depois.";

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

async function lerEnv() {
  const bruto = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() =>
    sair("Não achei o .env.local. Copie o .env.example e preencha."),
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

function preencherMarcadores(promptMae) {
  return promptMae.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, chave) => EXEMPLO[chave] ?? "");
}

/** Sem chave: um degrade local, so para provar que o cano inteiro funciona. */
async function gerarPlaceholder(w, h, indice) {
  const matiz = (indice * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${matiz},60%,18%)"/>
        <stop offset="100%" stop-color="hsl(${matiz},70%,45%)"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="50%" y="50%" fill="white" font-size="28" text-anchor="middle" font-family="sans-serif">
      candidato ${indice + 1} — sem GEMINI_API_KEY
    </text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function gerarComGemini(chave, modelo, prompt, aspectRatio) {
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: chave });

  const resposta = await client.models.generateContent({
    model: modelo,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
  });

  const dados = resposta.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!dados?.data) throw new Error("o modelo respondeu sem imagem (possível bloqueio de conteúdo)");
  return Buffer.from(dados.data, "base64");
}

async function main() {
  const args = process.argv.slice(2);
  const posicionais = args.filter((a) => !a.startsWith("--"));
  const [tipo, formato] = posicionais;
  const n = Number(pegarFlag(args, "--n")) || 4;
  const pasta = pegarFlag(args, "--pasta") || path.join("acervo-novo", tipo ?? "");

  if (!tipo || !formato || !FORMATO_META[formato]) {
    sair(
      "Uso: node scripts/gerar-acervo.mjs <tipo> <feed_4x5|story_9x16> [--n 4] [--pasta out]\n" +
        "  Ex.: node scripts/gerar-acervo.mjs matchday story_9x16 --n 6",
    );
  }

  const env = await lerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) sair("SUPABASE_SERVICE_ROLE_KEY vazia no .env.local.");

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: referencia, error } = await db
    .from("referencias")
    .select("prompt_mae")
    .eq("tipo", tipo)
    .eq("formato", formato)
    .eq("ativa", true)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) sair(`Falha ao buscar o prompt-mãe: ${error.message}`);
  if (!referencia) sair(`Não há referência ativa de "${tipo}"/"${formato}" para tomar como base.`);

  const prompt = preencherMarcadores(referencia.prompt_mae) + INSTRUCAO_TEMPLATE;
  const { w, h, aspectRatio } = FORMATO_META[formato];

  const chave = env.GEMINI_API_KEY;
  const modelo = env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  const comChave = Boolean(chave);

  await mkdir(pasta, { recursive: true });

  console.log(`\n  → ${tipo}/${formato}, ${n} candidato(s), em ${pasta}`);
  console.log(
    comChave
      ? `  usando Gemini (${modelo}) — cada imagem tem custo real\n`
      : "  SEM GEMINI_API_KEY: gerando placeholders locais, só para testar o cano — nada é gasto\n",
  );

  const catalogo = [];
  for (let i = 0; i < n; i++) {
    const bytes = comChave
      ? await gerarComGemini(chave, modelo, prompt, aspectRatio).catch((e) => {
          console.error(`    candidato ${i + 1}: falhou — ${e.message}`);
          return null;
        })
      : await gerarPlaceholder(w, h, i);

    if (!bytes) continue;

    const arquivo = `${tipo}-${formato}-c${String(i + 1).padStart(2, "0")}.png`;
    await writeFile(path.join(pasta, arquivo), bytes);
    catalogo.push({
      arquivo,
      tipo,
      formato,
      original: comChave ? `gerar-acervo.mjs, modelo ${modelo}` : "placeholder de teste — não usar",
    });
    console.log(`    ${arquivo}`);
  }

  await writeFile(path.join(pasta, "categorias.json"), JSON.stringify(catalogo, null, 2));

  console.log(`\n  ${catalogo.length}/${n} gerados. Manifesto em ${path.join(pasta, "categorias.json")}`);
  console.log(
    comChave
      ? `  Revise as imagens, apague as fracas, e rode:\n    node scripts/importar-referencias.mjs ${pasta}\n`
      : "  Isto foi só um teste do cano. Preencha GEMINI_API_KEY e rode de novo para gerar candidatos de verdade.\n",
  );
}

function pegarFlag(args, nome) {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
}

try {
  await main();
} catch (e) {
  console.error(`\n  ${e instanceof Parada ? e.message : (e?.stack ?? e)}\n`);
  process.exitCode = 1;
}
