/**
 * TESTE: animar uma arte pronta com o Veo (imagem-para-vídeo).
 *
 * ==========================================================================
 * RESULTADO: NÃO FUNCIONA. Guardado porque o "não" custou dinheiro e vale
 * mais documentado do que redescoberto daqui a três meses.
 *
 * As duas tentativas voltaram com o mesmo filtro:
 *
 *   "Sorry, we can't create videos with real people's names or likenesses."
 *
 * A segunda já ia com `personGeneration: "allow_adult"` E um prompt sem uma
 * palavra sequer sobre pessoas — descrevendo a arte como "composição
 * gráfica". A recusa foi idêntica, o que prova que o filtro lê a IMAGEM e não
 * o texto: é o rosto reconhecível de um atleta real que barra.
 *
 * Isso mata o caminho "Animar esta arte" com o Veo, porque toda arte do
 * MatchPost tem um jogador reconhecível. E mata ANTES da pergunta que este
 * teste ia responder — se o texto embutido ondula ao ser animado —, que segue
 * sem resposta.
 *
 * O que sobra, e continua viável: animar com o Veo a placa de FUNDO, que é
 * gerada sem ninguém. Sem rosto, sem filtro. O atleta recortado e o texto
 * entram por cima, em código, como já entram hoje.
 * ==========================================================================
 *
 *   node scripts/teste-animar.mjs <geracao_id>
 *
 * A PERGUNTA QUE ELE RESPONDE
 *
 * O caminho "Animar esta arte" parte de uma imagem ACABADA — o texto já está
 * embutido nos pixels. Nenhuma documentação diz o que acontece com tipografia
 * quando o modelo anima o quadro, e a hipótese pessimista é que ela ondule:
 * o modelo não sabe que aquilo é letra, para ele é textura.
 *
 * Se ondular, o caminho morre como está. Se sobreviver, vale construir. Só um
 * teste responde, e ele custa entre US$ 0,20 e US$ 0,64 — barato perto de
 * integrar uma API inteira para descobrir depois.
 *
 * A CONFIGURAÇÃO É A MAIS BARATA DE PROPÓSITO
 *
 * Lite, 720p, 4 segundos: US$ 0,20. Não é a que se usaria em produção, mas
 * responde a pergunta — se a letra ondula em 720p, ondula em 1080p também.
 * E 1080p obrigaria 8 segundos, triplicando o custo de um teste.
 *
 * O ÁUDIO SAI DESLIGADO. O Veo 3.1 gera som por padrão, e a agência põe a
 * trilha dela — som gerado seria peso de arquivo que ninguém vai usar.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const GERACAO_PADRAO = "788415e6-98ca-4da6-9451-416b7ea27e2b";
const SAIDA = "out/animar";

class Parada extends Error {}
const sair = (m) => {
  throw new Parada(m);
};

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

/**
 * O pedido de movimento é de CÂMERA, e não de conteúdo.
 *
 * A arte já está pronta; o que falta é vida. Pedir qualquer coisa que mude o
 * que está desenhado é convidar o modelo a redesenhar — e redesenhar significa
 * reescrever o texto, que é exatamente o que não pode acontecer.
 *
 * Por isso o prompt fala de partículas, luz e um avanço lento, e diz de forma
 * explícita que texto, escudo e logo ficam parados e intactos. Se ainda assim
 * ondular, a resposta é do modelo e não da instrução.
 */
const PROMPT = [
  "Movimento sutil de camera e atmosfera sobre esta composicao grafica.",
  "",
  "PERMITIDO: um avanco muito lento da camera; particulas finas de poeira flutuando",
  "no ar; a luz do fundo variando de leve.",
  "",
  "PROIBIDO: mudar, redesenhar ou deformar qualquer texto, letra, numero ou simbolo.",
  "Sao elementos graficos fixos, colados sobre a imagem — ficam absolutamente",
  "parados, nitidos e identicos ao original, do primeiro ao ultimo quadro.",
  "",
  "Tambem proibido: trocar o enquadramento, cortar para outra cena ou alterar as",
  "cores. O resultado e a MESMA imagem, viva.",
].join("\n");

async function main() {
  const geracaoId = process.argv[2] ?? GERACAO_PADRAO;
  const env = await lerEnv();
  if (!env.GEMINI_API_KEY) sair("GEMINI_API_KEY ausente no .env.local.");

  await mkdir(SAIDA, { recursive: true });

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: geracao } = await db
    .from("geracoes")
    .select("imagem_url")
    .eq("id", geracaoId)
    .maybeSingle();
  if (!geracao) sair(`Geração ${geracaoId} não encontrada.`);

  const { data: arquivo } = await db.storage.from("geracoes").download(geracao.imagem_url);
  if (!arquivo) sair("Não consegui baixar a arte.");
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(SAIDA, "origem.jpg"), bytes);
  console.log(`· arte de origem: ${(bytes.length / 1024).toFixed(0)} KB`);

  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  console.log("· pedindo o vídeo (Lite 720p 4s ≈ US$ 0,20)");
  let operacao = await client.models.generateVideos({
    model: "veo-3.1-lite-generate-preview",
    /* `source` no lugar de prompt/image soltos: a forma antiga esta depreciada
       e vai sumir. */
    source: {
      prompt: PROMPT,
      image: { imageBytes: bytes.toString("base64"), mimeType: "image/jpeg" },
    },
    config: {
      aspectRatio: "9:16",
      resolution: "720p",
      durationSeconds: 4,
      numberOfVideos: 1,
      personGeneration: "allow_adult",
      /* `generateAudio` so existe no modo empresarial; na API de desenvolvedor
         o audio vem junto e nao ha como recusar. Sai depois, no ffmpeg — o
         arquivo carrega uma trilha que ninguem vai usar de qualquer jeito. */
    },
  });

  /* Geração de vídeo é assíncrona: a chamada devolve uma operação e o resultado
     chega minutos depois. Espera longa entre consultas de propósito — apertar o
     servidor não faz o vídeo sair antes. */
  let voltas = 0;
  while (!operacao.done && voltas < 40) {
    await new Promise((r) => setTimeout(r, 12000));
    operacao = await client.operations.getVideosOperation({ operation: operacao });
    voltas++;
    process.stdout.write(`  aguardando… ${voltas * 12}s\r`);
  }
  if (!operacao.done) sair("O modelo demorou demais. A operação continua rodando do lado deles.");
  if (operacao.error) sair(`O modelo recusou: ${JSON.stringify(operacao.error)}`);

  const video = operacao.response?.generatedVideos?.[0]?.video;
  if (!video) sair(`Resposta sem vídeo: ${JSON.stringify(operacao.response).slice(0, 400)}`);

  const destino = path.join(SAIDA, "animado.mp4");
  await client.files.download({ file: video, downloadPath: destino });
  console.log(`\nPronto: ${destino}`);
}

main().catch((e) => {
  if (e instanceof Parada) console.error(`\n${e.message}\n`);
  else console.error(e);
  process.exitCode = 1;
});
