# Sistema visual — MatchPost

Escrito a partir do que está construído, não do que se pretendia construir.

## Tokens

Todos vivem em `src/app/globals.css`, num bloco `@theme` (Tailwind v4). O escuro
é o padrão e mora no `@theme`; o claro só redefine valores em
`:root[data-tema="claro"]`. Nenhum componente sabe que existe tema — todos leem
as mesmas variáveis.

| Papel | Escuro | Claro |
|---|---|---|
| `--color-bg` | `#101113` | `#f4f3f0` |
| `--color-surface` | `#17181b` | `#ffffff` |
| `--color-surface-2` | `#1e2023` | `#f0eee9` |
| `--color-surface-3` | `#262a2e` | `#e2dfd8` |
| `--color-text` | `#e8e8ea` | `#17181a` |
| `--color-muted` | `#8a8c93` | `#63656b` |
| `--color-accent` | `#2E7CFF` | `#1E5FDB` |
| `--color-line` | `rgba(255,255,255,.09)` | `rgba(20,21,24,.12)` |

O tema não segue `prefers-color-scheme`: avaliar arte no escuro ou no claro é
preferência de trabalho, não do sistema operacional. A escolha fica gravada em
`localStorage` e é aplicada antes da primeira pintura por um script inline no
`layout.tsx` — sem isso a tela pisca no tema errado a cada carregamento.

## Cor

**Um acento só**, chapado, e apenas em três lugares: ação primária, seleção e
estado. O azul é o da marca — o mesmo bloco do "POST" na logo.

Havia uma razão registrada para o âmbar anterior: quase todo clube é vermelho,
azul ou verde, então a interface não disputava atenção com a arte que ela
produz. **Essa razão continua verdadeira e o azul a viola** — a identidade
pesou mais. Se um dia a cor do botão competir visualmente com o escudo de um
clube na tela, é aqui que está a explicação.

Sem gradiente de marca. Sem texto em gradiente. Ênfase vem de peso e tamanho.

## Tipografia

- **Display:** Anton (`--fonte-anton`), peso único 400, na classe `.display`.
  Só em `h1`/`h2`. Numa ferramenta de trabalho, display em rótulo ou botão
  atrapalha a leitura.
- **Corpo:** Geist Sans.
- **Mono:** Geist Mono, só para dado e medida — nunca como fantasia de
  "técnico".

Tracking nunca passa de `-0.04em`; na landing os títulos ficam em `-0.03em`.
Display máximo de `5.6rem`. Texto corrido entre 62 e 68ch.

As classes de fonte vão no `<html>`, não no `<body>`: os tokens do tema vivem
no `:root`, e um `var()` aninhado se resolve onde a variável é **declarada**.
Com as fontes no body, o `:root` não as enxergava e `--font-sans` caía fora.

## Elevação

Declarada **uma vez**: borda **ou** sombra, nunca as duas. A classe `.surface`
é borda de 1px. Somar borda, desfoque e sombra é o "ghost card" — três sinais
de profundidade competindo pelo mesmo trabalho.

Raio: `--radius-field` 10px, `--radius-card` 14px, `--radius-panel` 16px.
Pílula só em controle pequeno.

## Superfícies do navegador

`::selection`, barra de rolagem, `caret-color` e `:focus-visible` são
tematizados do acento. É o sinal mais barato de que a página foi construída em
vez de montada, e o que mais se esquece.

O foco usa `:focus-visible`, não `:focus` — quem clica com o mouse não ganha um
anel que não pediu. O contorno fica fora da caixa, para não empurrar layout.

## Movimento

**Um momento autoral por superfície**, não efeitos espalhados. Na landing é a
fusão das três placas, dirigida pelo scroll com o palco preso. O resto é
entrada discreta.

Curva: `expo.out` (desaceleração exponencial). Entradas usam `gsap.from` de
propósito — o estado inicial é aplicado em tempo de execução, então **sem JS o
conteúdo continua visível**. Nunca esconder texto esperando animação.

`prefers-reduced-motion` recebe a cena no estado final, parada: a informação é
a fusão ter acontecido, não a animação dela.

## A landing (`/`)

Rota pública. Quem tem sessão nunca chega: o proxy manda para `/biblioteca`.

Três bibliotecas conversando: **Lenis** (scroll suave) alimenta o
`ScrollTrigger` do **GSAP**, que dirige o progresso da cena **three.js**. A cena
não sabe o que é scroll — recebe um número de 0 a 1 e interpola entre "separado"
e "fundido".

As placas 3D são **diagrama, não imitação**: retângulos com aresta acesa, nunca
uma foto falsa de atleta nem escudo inventado. Não há arte real para mostrar
enquanto `IMAGE_PROVIDER=mock`, e fingir que há seria mentir sobre o produto na
própria página que o vende.

## O que este sistema recusa

- Rótulo/sobrancelha acima de título — o título carrega o próprio peso
- Numeração de seção (01/02/03) quando a ordem não carrega informação
- Cartões iguais de ícone + título + texto como estrutura de página
- Vidro e desfoque como decoração
- Emoji no lugar de ícone (usa `lucide-react`)
- Ilustração em estilo rascunho
