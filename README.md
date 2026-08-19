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

**Rodar uma vez só.** Os `create type` e `create policy` não têm guarda de
idempotência: a segunda execução falha no meio e deixa o schema pela metade.

## Rodar SQL sem abrir o dashboard

Opcional. Preencha `SUPABASE_ACCESS_TOKEN` no `.env.local` (Dashboard → Account
→ Access Tokens, prefixo `sbp_`) e:

```bash
npm run db:tabelas                    # o que existe hoje em public
npm run db:schema                     # aplica sql/001_schema.sql
npm run db:sql -- -e "select now()"   # consulta solta
npm run db:sql -- caminho/outro.sql   # qualquer arquivo
```

O ref do projeto sai da `NEXT_PUBLIC_SUPABASE_URL` — não se configura duas vezes.

Esse token **não é deste projeto**: a documentação do Supabase é literal em
dizer que ele carrega os mesmos privilégios da sua conta de usuário, ou seja,
todo projeto de toda organização que você acessa. Por isso ele nunca recebe
prefixo `NEXT_PUBLIC_`, nenhum arquivo em `src/` o lê, e vale revogar quando
terminar. Para não gravá-lo em disco, dá para passar só na chamada:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... npm run db:tabelas
```

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

## Quem desenha o quê

O modelo desenha a arte inteira, **texto incluso**. Nome, etiqueta, clube e frase
entram pelo prompt-mãe, através dos marcadores `{{nome}}`, `{{clube}}`,
`{{frase}}` e `{{rotulo}}` — escrevê-los no prompt é o que dá ao curador
controle sobre *como* o nome entra na cena. Sem nenhum marcador, os textos vão
num bloco no fim, para uma referência antiga não sair sem nome.

`src/lib/compose.ts` faz só o acabamento:

```
arte gerada (com texto)  →  recorte do jogador  →  logo da agência
```

**A logo continua sendo camada de código**, por um motivo diferente do texto: a
marca da agência tem forma exata e o modelo não a conhece — mesmo com
referência, ele aproxima. Um nome errado se corrige gerando outra; escudo torto
publicado no perfil da agência é erro de outra categoria. Por isso o prompt pede
o canto inferior direito limpo.

O modelo recebe um pedido 18% maior que o formato final; o corte para 1080×1350
ou 1080×1920 acontece no código.

**Nome errado custa uma geração.** Se acontecer com frequência num tipo, o
problema é o prompt-mãe, não a IA — o histórico de recusas em `/pedido/[id]`
existe para tornar isso visível.

## Estado atual

**Leitura vem do Supabase.** Todas as telas passam por `src/lib/dados.ts`, que
consulta o banco com o cliente de sessão — a RLS decide o que cada papel vê, e
não há filtro de permissão escrito em TypeScript que possa ser esquecido.

Sem chave no `.env.local`, `dados.ts` cai no `src/lib/mock.ts` e o projeto
continua rodando com dados de mentira. Quem clona para mexer no visual não
precisa de conta no Supabase.

**Falta a escrita.** Nada ainda grava no banco:

- `/novo` gera a arte, mas "Enviar para aprovação" só navega para a fila
- `/pedido/[id]` — aprovar, recusar e "gerar outra" ainda são `setTimeout`
- `/admin/referencias` — salvar o prompt-mãe não persiste
- as imagens voltam embutidas em base64; ainda não sobem para o Storage

## Substituir os placeholders

- `public/brand/logo.png` — logo real da agência (PNG com transparência)
- `public/mock/` — pasta inteira morre quando as artes vierem do Supabase; o
  script que a gera é `scripts/gerar-mocks.mjs`
