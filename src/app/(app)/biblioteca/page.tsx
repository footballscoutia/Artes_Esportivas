import { ViewTransition } from "react";
import { Images } from "lucide-react";
import { listarPedidos, capasDosPedidos } from "@/lib/dados";
import { TIPOS, TIPO_META, type Tipo } from "@/lib/types";
import { ArtCard } from "@/components/art/ArtCard";
import { TituloSecao } from "@/components/ui/Card";
import { BotaoLink } from "@/components/ui/Button";
import { FiltroTipo } from "@/components/app/FiltroTipo";

/**
 * Biblioteca — tudo que a conta ja gerou, para rever e baixar.
 *
 * Era uma fila de aprovacao, com status e decisao de aprovar ou recusar. Nao e
 * isso que a ferramenta faz: quem gera a arte e quem aprova sao a mesma pessoa,
 * e o que ela quer depois e reencontrar o arquivo. O filtro agora e por
 * categoria, que e como alguem procura ("cade aquele matchday?").
 */
export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const filtro = TIPOS.includes(t as Tipo) ? (t as Tipo) : null;

  const pedidos = await listarPedidos();
  const visiveis = filtro ? pedidos.filter((p) => p.tipo === filtro) : pedidos;
  const capas = await capasDosPedidos(visiveis.map((p) => p.id));

  const porTipo = Object.fromEntries(
    TIPOS.map((tipo) => [tipo, pedidos.filter((p) => p.tipo === tipo).length]),
  ) as Record<Tipo, number>;

  return (
    <ViewTransition enter="rota-entra" exit="rota-sai" default="none">
      <div className="mx-auto max-w-[1400px]">
      <TituloSecao
        titulo="Biblioteca"
        descricao={
          pedidos.length
            ? `${pedidos.length} arte${pedidos.length > 1 ? "s" : ""} gerada${pedidos.length > 1 ? "s" : ""}`
            : "Nada gerado ainda"
        }
        acao={<BotaoLink href="/novo">Gerar arte</BotaoLink>}
      />

      {pedidos.length > 0 && (
        <FiltroTipo total={pedidos.length} porTipo={porTipo} atual={filtro} />
      )}

      {visiveis.length === 0 ? (
        <div className="surface grid place-items-center gap-4 rounded-card py-24 text-center">
          <Images size={26} className="text-muted-2" strokeWidth={1.5} />
          <div>
            <p className="font-medium">
              {filtro
                ? `Nenhuma arte de ${TIPO_META[filtro].titulo.toLowerCase()} ainda`
                : "Comece escolhendo o atleta"}
            </p>
            <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-muted">
              {filtro
                ? "Gere uma e ela aparece aqui, junto com as outras."
                : "Você escolhe a categoria, o atleta do elenco e responde três perguntas. A arte fica guardada aqui, pronta para baixar quando precisar."}
            </p>
          </div>
          <BotaoLink href="/novo" variante="sutil" tamanho="sm">
            {filtro ? "Gerar uma" : "Gerar a primeira"}
          </BotaoLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visiveis.map((p) => (
            <ArtCard key={p.id} pedido={p} imagem={capas[p.id] ?? null} />
          ))}
        </div>
      )}
      </div>
    </ViewTransition>
  );
}
