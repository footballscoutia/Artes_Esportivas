# Gerador de Artes Esportivas — Plano de construção

## 1. Leitura das referências

**Healix (dashboard médico, claro)** — o que vale copiar é a *estrutura*:
- nav em pílulas flutuando sobre o conteúdo, não barra colada
- rail vertical à esquerda só com ícones circulares (ações rápidas)
- painel-gaveta à direita com o detalhe do item selecionado
- cards flutuantes com raio grande (20–28px) e sombra difusa, nunca bordas duras
- um único azul de acento; todo o resto é neutro
- dados apresentados como chips inline (`FEV1: 4.8 L`, `Heart rate: 72 BPM`)
- ícones outline monocromáticos, traço fino

**AIAF (landing escura, vídeo 2)** — o que vale copiar é a *atmosfera*:
- fundo quase preto azulado, conteúdo respirando em cima dele
- cards numerados que acendem em gradiente magenta→violeta
- tipografia display grande, tracking apertado, quebra em 2–3 linhas
- glow como hierarquia: o que importa brilha

**Orb iridescente (vídeo 1)** — gradiente violeta/magenta girando dentro de um anel
de luz. É o estado de "gerando" do produto: enquanto o Nano Banana responde, o orb
ocupa o lugar da arte.

## 2. Direção visual proposta: "Studio escuro"

Arte gerada aparece melhor sobre fundo escuro — é o mesmo motivo de Lightroom,
Figma e Instagram Studio serem escuros. Então: **esqueleto do Healix + paleta e
glow do AIAF + orb como loading**.

Tokens:

```
--bg        #080B12   fundo
--surface   #111725   cards
--surface-2 #1A2133   inputs, hover
--line      rgba(255,255,255,.07)
--text      #F4F6FB
--muted     #8A93A8
--accent    linear-gradient(135deg,#FF2D6F,#7B3BFF)
--accent-sol #FF2D6F
raio: 16 (input) / 24 (card) / 999 (pílula)
tipo: display tight para títulos, sans neutra para UI
```

## 3. Onde fica

Pasta nova `claudio/artes-esportivas/` — o `claudio/` atual é o projeto Python de
ingestão do BID, sem relação. Nada é tocado lá.

## 4. Arquitetura

```
artes-esportivas/
  .env.example              # todas as chaves, comentadas
  sql/001_schema.sql        # referencias, pedidos, geracoes, RLS, buckets
  src/
    app/
      login/
      (app)/
        novo/               # wizard de 3 passos
        fila/               # fila de aprovação
        pedido/[id]/        # detalhe + aprovar/recusar/gerar outra
        admin/referencias/  # curadoria (12 refs: 6 tipos x 2 formatos)
      api/gerar/route.ts
    lib/
      ai/
        provider.ts         # interface ImageGenProvider
        gemini.ts           # Nano Banana 2 (gemini-3.1-flash-image)
        mock.ts             # devolve imagem falsa, roda sem chave
        index.ts            # escolhe por IMAGE_PROVIDER=mock|gemini|fal
      compose.ts            # sharp: fundo -> nome -> recorte -> logo
      supabase/{client,server,admin}.ts
    components/ui/          # design system
    components/art/         # OrbLoader, ArtCanvas, StatusPill, TypeCard...
```

**Troca de modelo = uma linha.** `provider.ts` define
`generate(input: GenInput): Promise<GenResult>` e nada fora de `lib/ai/` sabe que
existe Gemini. Adicionar Flux Kontext Max ou Seedream 5.0 depois é criar um arquivo
irmão e mudar `IMAGE_PROVIDER` no `.env`.

**Composição.** Gera em resolução maior que o formato final e corta para
`feed_4x5` (1080x1350) ou `story_9x16` (1080x1920), reservando no corte a faixa
onde o código escreve nome e assina a logo. Não depende de prompt pedindo canto
vazio.

## 5. Fases

**Fase 0 — esqueleto e design system. FEITO.** Next.js 16 + TS + Tailwind v4, tokens,
componentes base (botão pílula, card, input, chip, drawer, rail, orb animado).

**Fase 1 — interface completa com dados mock. FEITA.** Todas as telas navegáveis, sem
Supabase e sem IA:
- `/novo`: passo 1 tipo do post (6 cards numerados estilo AIAF) → passo 2 formato
  (feed 4:5 / story 9:16) + upload da foto → passo 3 nome do jogador e frase.
  Nenhum campo de prompt, em lugar nenhum.
- gerar → orb + progresso → arte no canvas central, painel de metadados à direita
- `/fila`: grid das artes em revisão, filtro por status
- `/pedido/[id]`: arte grande, aprovar / recusar com motivo / gerar outra /
  corrigir texto das camadas sem re-gerar / baixar
- `/admin/referencias`: matriz 6 tipos × 2 formatos, upload da referência,
  prompt-mãe, versão, ativa/inativa

**Fase 2 — Supabase. Escrita e desligada** (`sql/001_schema.sql`, `src/lib/supabase/`, `/login`). Falta trocar as leituras de
`src/lib/mock.ts` por consultas reais — as telas não mudam.

**Fase 3 — geração real. Adapter e composição prontos, faltam as chaves.** O pipeline
inteiro (provider → composição de camadas → arte final) já roda de ponta a ponta
com `IMAGE_PROVIDER=mock`. Trocar para `gemini` é uma linha no `.env.local`.

**Fase 4 — acabamento.** Erros, retry, custo por geração visível, download.

Fases 0 e 1 rodam sem nenhuma chave. Quando você colocar o `.env`, a fase 2/3 já
está escrita esperando.

## 6. O que preciso de você (não trava o começo)

1. **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). O *access token* do
   dashboard é da Management API, não serve pra ler/gravar tabela.
2. **Gemini:** `GEMINI_API_KEY` de projeto com billing ativo — tier gratuito treina
   com o que sobe, e contratação não anunciada é confidencial.
3. **Logo da agência** em SVG ou PNG com transparência, e a fonte da marca. Até
   chegarem, uso placeholder — a camada da logo já fica pronta.
4. **As 12 referências curadas** (6 tipos × 2 formatos) e os prompts-mãe. O admin
   já nasce pronto pra receber; o contexto sugere validar o prompt-mãe de "gol" no
   AI Studio antes — isso é trabalho seu no AI Studio, em paralelo à interface.
