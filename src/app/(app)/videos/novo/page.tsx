import { BotaoLink } from "@/components/ui/Button";
import { NovoVideo } from "@/components/app/NovoVideo";
import { listarClubes, listarJogadores, listarMarcas, listarUniformes } from "@/lib/dados";

export default async function NovoVideoPage() {
  const [jogadores, clubes, uniformes, marcas] = await Promise.all([
    listarJogadores(),
    listarClubes(),
    listarUniformes(),
    listarMarcas(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[26px] leading-tight">Novo vídeo</h1>
          <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
            Do zero, sem partir de uma arte. Escolha o atleta, preencha o que vai escrito e
            decida como o vídeo se monta.
          </p>
        </div>
        <BotaoLink href="/videos" variante="sutil" tamanho="sm">
          Voltar
        </BotaoLink>
      </div>

      <NovoVideo jogadores={jogadores} clubes={clubes} uniformes={uniformes} marcas={marcas} />
    </div>
  );
}
