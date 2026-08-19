/**
 * Importa um acervo de referencias para o bucket privado e para a tabela.
 *
 *   node scripts/importar-referencias.mjs <pasta> [--limpar-mock] [--dry]
 *
 * A <pasta> precisa ter um `categorias.json` no formato:
 *   [{ arquivo, tipo, formato, original }, ...]
 *
 * `--limpar-mock` apaga as referencias de andaime (as que apontam para
 * /mock/...). So use quando o acervo novo cobrir o que importa.
 *
 * Sobe com o cliente de service_role porque o bucket e privado e a policy de
 * storage so deixa aprovador mexer em referencia — isto aqui roda fora de
 * sessao, direto da maquina de quem cura.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "referencias";

/**
 * Prompt-mae por categoria.
 *
 * Os marcadores {{...}} sao trocados pelos dados do pedido em src/lib/gerar.ts.
 * Escreve-los aqui e o que da ao curador controle sobre COMO cada dado entra na
 * cena — e metade do resultado.
 *
 * Todos terminam pedindo o canto inferior direito limpo: a logo da agencia
 * entra ali por cima, no codigo, porque o modelo nao conhece a marca.
 */
const ABERTURA =
  "Arte promocional esportiva de altissima qualidade, no padrao de designer\n" +
  "profissional de clube de futebol. Use a imagem de referencia como guia de\n" +
  "ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —\n" +
  "nao copie o conteudo dela.\n\n" +
  "O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,\n" +
  "tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a\n" +
  "etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.";

const FECHAMENTO =
  "Escrever apenas os textos listados, exatamente como estao entre aspas,\n" +
  "respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de\n" +
  "clube nem patrocinador que nao tenha sido pedido.\n\n" +
  "Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a\n" +
  "logo da agencia entra ali por cima.";

const PROMPTS = {
  matchday: `${ABERTURA}

Contexto: anuncio do proximo jogo. E o formato mais comum do acervo — arte de
story, atleta em destaque, e os dados da partida organizados num bloco legivel.

TEXTO NA ARTE:
- Confronto: "{{clube}}" x "{{adversario}}" — o par de times e a informacao
  principal depois do atleta.
- Nome do atleta: "{{nome}}" — tipografia pesada, integrada a composicao.
- Campeonato: "{{campeonato}}" — pequeno, acima ou ao lado do confronto.
- Data e hora: "{{data}}" e "{{hora}}" — juntos, discretos e legiveis.
- Estadio: "{{estadio}}" — menor de todos. Omitir se vier vazio.

Omitir qualquer campo que chegue vazio, sem deixar rotulo orfao nem espaco
reservado.

${FECHAMENTO}`,

  contratacao: `${ABERTURA}

Contexto: anuncio de contratacao. O acervo mostra o padrao — o atleta ja com a
camisa do novo clube, a palavra de boas-vindas dominando a arte, e o nome logo
abaixo.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — o maior elemento de texto da arte.
- Nome do atleta: "{{nome}}" — logo abaixo da chamada, pesado.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

${FECHAMENTO}`,

  convocado: `${ABERTURA}

Contexto: convocacao para a selecao nacional. O acervo usa cores e simbolos do
pais como pano de fundo, com o atleta em primeiro plano.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — grande, no alto.
- Nome do atleta: "{{nome}}".
- Selecao ou clube: "{{clube}}" — discreto. Omitir se vier vazio.

${FECHAMENTO}`,

  gol: `${ABERTURA}

Contexto: comemoracao de gol. Energia alta, atleta em celebracao, cor saturada.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — dominante, ocupando a largura da arte.
- Nome do atleta: "{{nome}}".
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

${FECHAMENTO}`,

  aniversario: `${ABERTURA}

Contexto: felicitacao de aniversario. Tom celebrativo, atleta sorrindo quando a
foto permitir.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — grande.
- Nome do atleta: "{{nome}}" — o maior elemento.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

${FECHAMENTO}`,
};

/** Categorias sem acervo proprio herdam o padrao — o estilo vem da referencia. */
const GENERICO = (contexto) => `${ABERTURA}

Contexto: ${contexto}.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — grande, integrada a composicao.
- Nome do atleta: "{{nome}}" — o maior elemento de texto.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.
- Frase do atleta: "{{frase}}" — em italico. Omitir se vier vazia.

${FECHAMENTO}`;

PROMPTS.estreia = GENERICO("primeira partida do atleta com a camisa do clube");
PROMPTS.mvp = GENERICO("atleta eleito o melhor em campo na partida");
PROMPTS.frase = GENERICO("declaracao do atleta em destaque na arte");

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

async function main() {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  const seco = args.includes("--dry");
  const limparMock = args.includes("--limpar-mock");

  if (!pasta) sair("Uso: node scripts/importar-referencias.mjs <pasta> [--limpar-mock] [--dry]");

  const env = await lerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) sair("SUPABASE_SERVICE_ROLE_KEY vazia no .env.local.");

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const catalogo = JSON.parse(
    (await readFile(path.join(pasta, "categorias.json"), "utf8").catch(() =>
      sair(`Nao achei categorias.json em ${pasta}`),
    )).replace(/^﻿/, ""),
  );

  const semPrompt = [...new Set(catalogo.map((c) => c.tipo))].filter((t) => !PROMPTS[t]);
  if (semPrompt.length) sair(`Sem prompt-mae definido para: ${semPrompt.join(", ")}`);

  const porTipo = {};
  catalogo.forEach((c) => (porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1));
  console.log(`\n  ${catalogo.length} referências em ${pasta}`);
  Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`    ${t.padEnd(13)} ${n}`));

  if (seco) {
    console.log("\n  --dry: nada foi enviado.\n");
    return;
  }

  const arquivos = new Set(await readdir(pasta));
  let subidas = 0;
  const falhas = [];

  for (const item of catalogo) {
    if (!arquivos.has(item.arquivo)) {
      falhas.push(`${item.arquivo}: não está na pasta`);
      continue;
    }
    const bytes = await readFile(path.join(pasta, item.arquivo));
    const caminho = `acervo/${item.tipo}/${item.arquivo}`;

    const { error: erroUpload } = await db.storage
      .from(BUCKET)
      .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
    if (erroUpload) {
      falhas.push(`${item.arquivo}: ${erroUpload.message}`);
      continue;
    }

    const { error: erroLinha } = await db.from("referencias").insert({
      tipo: item.tipo,
      formato: item.formato,
      imagem_url: caminho,
      prompt_mae: PROMPTS[item.tipo],
      versao: 1,
      ativa: true,
      observacoes: `Acervo importado — origem: ${item.original}`,
    });
    if (erroLinha) {
      falhas.push(`${item.arquivo}: ${erroLinha.message}`);
      continue;
    }
    subidas++;
    if (subidas % 10 === 0) console.log(`    ${subidas}/${catalogo.length}…`);
  }

  console.log(`\n  subidas: ${subidas}`);
  if (falhas.length) {
    console.log(`  falhas: ${falhas.length}`);
    falhas.slice(0, 10).forEach((f) => console.log(`    ${f}`));
  }

  if (limparMock) {
    const { data, error } = await db
      .from("referencias")
      .delete()
      .like("imagem_url", "/mock/%")
      .select("id");
    console.log(
      error ? `  erro ao limpar andaime: ${error.message}` : `  andaime removido: ${data.length}`,
    );
  }

  const { count } = await db.from("referencias").select("*", { count: "exact", head: true });
  console.log(`  total na tabela agora: ${count}\n`);
}

try {
  await main();
} catch (e) {
  console.error(`\n  ${e instanceof Parada ? e.message : (e?.stack ?? e)}\n`);
  process.exitCode = 1;
}
