/**
 * Encolhe a imagem NO NAVEGADOR, antes de ela virar corpo de requisicao.
 *
 * Server Action tem teto de 1MB por padrao no Next, e o teto de corpo da funcao
 * na Vercel e 4,5MB. Estourar qualquer um dos dois nao devolve erro tratavel: a
 * requisicao morre durante a leitura, ANTES de a acao rodar, e a pessoa recebe
 * a tela preta de "server error" no lugar de uma frase. Foi o que aconteceu com
 * um escudo baixado do Google — o escudo que tinha entrado antes tinha 298KB, e
 * esse passava do limite.
 *
 * Subir o teto sozinho so adia: a proxima foto de celular tem 8MB. Encolher na
 * origem resolve a classe inteira, e ainda deixa o upload mais rapido.
 *
 * NAO mexe no arquivo que ja esta dentro dos limites. Reencodar um PNG pequeno
 * e bom so trocaria qualidade por nada — e escudo e ativo de marca, quem manda
 * um arquivo limpo merece ver o arquivo limpo do outro lado.
 */

/** PNG preserva transparencia; escudo sem fundo transparente estraga a arte. */
export type Formato = "png" | "jpeg";

type Opcoes = {
  /** Maior lado aceito, em pixels. Acima disso a imagem e reduzida. */
  ladoMaximo: number;
  /** Tamanho em bytes a partir do qual vale a pena reencodar. */
  bytesMaximos: number;
  formato: Formato;
  /** So para jpeg. */
  qualidade?: number;
};

const ESCUDO: Opcoes = { ladoMaximo: 1024, bytesMaximos: 1_500_000, formato: "png" };
const FOTO: Opcoes = { ladoMaximo: 1600, bytesMaximos: 1_500_000, formato: "jpeg", qualidade: 0.9 };

async function encolher(arquivo: File, o: Opcoes): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);
  const maior = Math.max(bitmap.width, bitmap.height);

  /* Já cabe: devolve o original intacto. */
  if (maior <= o.ladoMaximo && arquivo.size <= o.bytesMaximos) {
    bitmap.close();
    return arquivo;
  }

  const escala = Math.min(1, o.ladoMaximo / maior);
  const l = Math.max(1, Math.round(bitmap.width * escala));
  const a = Math.max(1, Math.round(bitmap.height * escala));

  const tela = document.createElement("canvas");
  tela.width = l;
  tela.height = a;
  const ctx = tela.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return arquivo;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, l, a);
  bitmap.close();

  const tipo = `image/${o.formato}`;
  const blob = await new Promise<Blob | null>((resolve) =>
    tela.toBlob(resolve, tipo, o.formato === "jpeg" ? o.qualidade : undefined),
  );
  if (!blob) return arquivo;

  /* Se o reencode nao ajudou (acontece com PNG ja otimizado), fica o original:
     trocar por um arquivo maior seria piorar duas vezes. */
  if (blob.size >= arquivo.size) return arquivo;

  const nome = arquivo.name.replace(/\.[^.]+$/, "") + (o.formato === "png" ? ".png" : ".jpg");
  return new File([blob], nome, { type: tipo });
}

/**
 * Troca o arquivo do campo por uma versao que cabe, se precisar.
 *
 * Mexe no proprio FormData porque e ele que vai para a acao — encolher e nao
 * substituir seria trabalho jogado fora. Falha silenciosa de proposito: se o
 * navegador nao der conta de decodificar, o original segue e quem decide e o
 * servidor, com a mensagem dele.
 */
export async function encolherCampo(
  dados: FormData,
  campo: string,
  tipo: "escudo" | "foto",
): Promise<void> {
  const atual = dados.get(campo);
  if (!(atual instanceof File) || atual.size === 0) return;

  try {
    const menor = await encolher(atual, tipo === "escudo" ? ESCUDO : FOTO);
    if (menor !== atual) dados.set(campo, menor, menor.name);
  } catch {
    /* segue com o original */
  }
}
