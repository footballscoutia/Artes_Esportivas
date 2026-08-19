import { cn } from "@/lib/utils";

/**
 * Esfera iridescente girando dentro de um anel de luz — o estado de "gerando".
 * Vem direto da referencia em video: nucleo em gradiente violeta/magenta,
 * aneis de luz deformando em volta e halo difuso no fundo.
 */
export function Orb({ tamanho = 220, className }: { tamanho?: number; className?: string }) {
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: tamanho, height: tamanho }}
    >
      {/* halo */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          inset: -tamanho * 0.28,
          background:
            "radial-gradient(circle, rgba(123,59,255,.65), rgba(255,45,111,.28) 45%, transparent 70%)",
          animation: "breathe 4.5s ease-in-out infinite",
        }}
      />

      {/* aneis de luz */}
      <div
        className="absolute inset-0 blur-[3px]"
        style={{
          border: "2px solid rgba(233,226,255,.85)",
          animation: "wobble 7s ease-in-out infinite, spin-slow 9s linear infinite",
          borderRadius: "48% 52% 55% 45% / 50% 46% 54% 50%",
        }}
      />
      <div
        className="absolute blur-[2px]"
        style={{
          inset: tamanho * 0.04,
          border: "1.5px solid rgba(255,255,255,.5)",
          animation: "wobble 5.5s ease-in-out infinite reverse, spin-rev 12s linear infinite",
          borderRadius: "52% 48% 45% 55% / 46% 54% 46% 54%",
        }}
      />

      {/* nucleo */}
      <div
        className="absolute overflow-hidden rounded-full"
        style={{ inset: tamanho * 0.13 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              // tons do acento, nao do magenta que veio da referencia de IA
              "conic-gradient(from 0deg, #7A4A18, #C8813C 30%, #E7B476 45%, #A9662A 65%, #5E3610 85%, #7A4A18)",
            animation: "spin-slow 6s linear infinite",
            filter: "blur(6px)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,.55), transparent 42%)," +
              "radial-gradient(circle at 70% 78%, rgba(255,45,111,.5), transparent 55%)",
          }}
        />
      </div>
    </div>
  );
}

/** Versao miniatura para botoes e cabecalhos. */
export function OrbMini({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        background:
          "conic-gradient(from 0deg, #7A4A18, #C8813C 35%, #E7B476 50%, #7A4A18)",
        boxShadow: "0 0 12px -2px rgba(255,45,111,.9)",
        animation: "spin-slow 3s linear infinite",
      }}
    />
  );
}
