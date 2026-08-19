# Estúdio de Artes — Marcio Bittencourt Sports

Ferramenta interna para gerar as artes promocionais dos atletas (contratação, gol,
estreia, craque do jogo, aniversário, frase) no padrão visual da agência.

O usuário sobe a foto do jogador, responde três perguntas e recebe a arte pronta,
em alta, para aprovação. **Ninguém escreve prompt** — cada combinação de tipo e
formato já carrega a sua referência curada e o seu prompt-mãe.

## Rodar

```bash
npm install
npm run dev
```

Abre em <http://localhost:3000>. **Roda sem nenhuma chave de API**: o provider
padrão é `mock`, que devolve uma arte de exemplo depois de alguns segundos, com o
pipeline real de composição de camadas por cima.

## Ligar as chaves

Copie `.env.example` para `.env.local` e preencha. As duas trocas que importam:

```bash
IMAGE_PROVIDER=gemini        # sai o mock, entra o Nano Banana 2
GEMINI_API_KEY=...           # projeto COM billing ativo
```

Supabase precisa das três chaves de **Project Settings → API**
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`). O *access token* do dashboard (`sbp_...`) é da
Management API e **não** serve para ler ou gravar tabela.

O esquema do banco está em [`sql/001_schema.sql`](sql/001_schema.sql) — rodar
inteiro no SQL Editor do projeto novo. Ele cria tabelas, enums, RLS, os três
buckets de storage e o gatilho que cria o perfil quando alguém entra.

## Telas

| Rota | O que é |
| --- | --- |
| `/fila` | Fila de aprovação, filtrada por status |
| `/novo` | As três perguntas e a geração |
| `/pedido/[id]` | Arte grande, camadas, histórico de gerações, aprovar/recusar |
| `/admin/referencias` | Curadoria das 12 referências (6 tipos × 2 formatos) |
| `/login` | Entrada por link de e-mail (ativa quando o Supabase estiver ligado) |

## Trocar de modelo de imagem

Toda a conversa com o modelo passa por `src/lib/ai/provider.ts`. Nada fora de
`src/lib/ai/` sabe que existe Gemini.

Para entrar com Flux Kontext Max ou Seedream 5.0 no comparativo: criar
`src/lib/ai/flux.ts` exportando um `ImageGenProvider`, adicionar um `case` em
`src/lib/ai/index.ts` e mudar `IMAGE_PROVIDER` no `.env.local`. Nenhuma tela muda.

## Composição de camadas

`src/lib/compose.ts` monta, nesta ordem:

```
fundo gerado pela IA  →  nome do jogador  →  recorte do jogador  →  logo da agência
```

Logo e nome nunca são gerados pela IA: ela distorce marca e erra letra de nome, e
o custo do erro é alto. Como camada saem idênticos sempre, e um nome errado se
corrige sem gastar outra geração.

O modelo recebe um pedido 18% maior que o formato final; o corte para 1080×1350
ou 1080×1920 acontece no código, que também reserva a faixa onde a logo entra —
sem depender de um prompt pedindo "deixe o canto vazio".

## Estado atual

Interface completa rodando com dados de mentira (`src/lib/mock.ts`) e provider
`mock`. O caminho real já está escrito e desligado: adapter do Gemini, esquema
SQL, clientes do Supabase e login por link.

Falta, quando as chaves chegarem: trocar as leituras de `mock.ts` por consultas
ao Supabase, gravar as gerações (inclusive as recusadas, com motivo) e subir os
arquivos para o storage.

## Substituir os placeholders

- `public/brand/logo.png` — logo real da agência (PNG com transparência)
- `src/lib/compose.ts` — trocar o stack de fonte pela fonte da marca
- `public/mock/` — pasta inteira morre quando as artes vierem do Supabase; o
  script que a gera é `scripts/gerar-mocks.mjs`
