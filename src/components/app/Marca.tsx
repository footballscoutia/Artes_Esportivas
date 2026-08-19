import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A marca da agencia, na versao certa para o tema.
 *
 * A logo original e cromada, desenhada para fundo escuro: sobre papel ela some.
 * `logo-escura.png` e a silhueta da mesma forma, gerada do canal alpha — o
 * tratamento padrao de marca para fundo claro.
 *
 * Quem escolhe e o CSS, pelo mesmo mecanismo dos icones de tema. As duas
 * imagens sao servidas, e nenhuma logica de tema entra em componente.
 */
export function Marca({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/brand/logo.png"
        alt="Marcio Bittencourt Sports"
        width={410}
        height={161}
        priority
        className={cn("so-escuro w-auto", className)}
      />
      <Image
        src="/brand/logo-escura.png"
        alt="Marcio Bittencourt Sports"
        width={410}
        height={161}
        priority
        className={cn("so-claro w-auto", className)}
      />
    </>
  );
}
