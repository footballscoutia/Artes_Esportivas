-- ---------------------------------------------------------------------------
-- Padroes de arte: a combinacao de escolhas vira dado, e o escudo vira opcional.
--
-- O pedido: "nao acho que o escudo e o nome do time devam aparecer em toda
-- geracao... deixar BEM personalizavel pra quem ta gerando. Ate pra caso ele
-- queira manter um padrao."
--
-- Dois achados que definiram o tamanho disto:
--
-- 1) Quase tudo JA e opcional, e ninguem sabe. O montarPrompt derruba o ITEM
-- inteiro quando o campo chega vazio — construido depois que `""` num marcador
-- fez o modelo desenhar glifos para preencher o buraco ("VS ≡≡ X FLAMENGO").
-- Entao clube, campeonato, estadio, adversario, frase, data e hora ja saem do
-- prompt quando em branco. O liga/desliga do NOME DO CLUBE reusa esse
-- mecanismo, em vez de criar outro: a tela manda o campo vazio.
--
-- 2) O ESCUDO e a excecao real. Ele nao e marcador, e imagem montada a partir
-- dos clubes em campo — nao havia como pedir "nome do clube sim, escudo nao".
-- E o escudo repetido tres vezes numa arte de gol saiu justamente de ele ser
-- obrigatorio num quadro com area sobrando.
--
-- 3) Os controles de composicao sao ZONA, FONTE ou TETO — nunca desenho. A
-- distincao vem de tres tipos de instrucao vistos nas correcoes anteriores:
-- adjetivo vago vira legenda, forma prescrita vira clone, e alavanca nomeada
-- com a forma decidida pela referencia funciona. A regra da faixa do confronto
-- (sql/032) e desse terceiro tipo e acertou de primeira.
--
-- A tabela chama `padroes` e nao `perfis` porque `perfis` ja e a tabela de
-- usuarios.
-- ---------------------------------------------------------------------------

create table if not exists padroes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) default public.minha_org(),
  nome text not null,
  /* Nulo = serve para qualquer tipo de arte. Preenchido = so aparece naquele
     tipo, para um "Matchday limpo" nao poluir a lista do aniversario. */
  tipo text,
  /* As escolhas em si. jsonb e nao colunas porque o conjunto vai crescer, e
     cada coluna nova aqui custaria migracao + deploy. O contrato esta em
     src/lib/padroes.ts, que e quem le e escreve isto. */
  opcoes jsonb not null default '{}'::jsonb,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

create index if not exists padroes_da_org on padroes (org_id, tipo);

comment on table padroes is
  'Combinacao salva de escolhas de geracao. Existe para a mesma combinacao se repetir: arranjo novo a cada arte e a maior fonte de variancia do resultado.';

alter table padroes enable row level security;

create policy "padroes: leitura da propria org"
  on padroes for select to authenticated using (org_id = public.minha_org());

create policy "padroes: equipe cadastra"
  on padroes for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

create policy "padroes: equipe edita"
  on padroes for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

create policy "padroes: equipe apaga"
  on padroes for delete to authenticated using (org_id = public.minha_org());

-- O que cada geracao de fato usou. Registrado em coluna, e nao so no padrao,
-- porque padrao pode ser editado depois e a geracao precisa continuar contando
-- a verdade sobre ela mesma — este banco e a fonte que a gente consulta para
-- diagnosticar defeito de arte.
alter table geracoes add column if not exists padrao_id uuid references padroes(id);
alter table geracoes add column if not exists escudo_modo text not null default 'ambos';
alter table geracoes add column if not exists zona_texto text not null default 'auto';
-- O default e 'clube' porque e o que ja acontecia antes de haver opcao: o
-- blocoDeClubes emite "A paleta da arte sai dessas cores" sempre que o clube
-- tem cor cadastrada. Default 'referencia' mudaria em silencio o resultado de
-- quem nunca abriu a personalizacao.
alter table geracoes add column if not exists paleta text not null default 'clube';

alter table geracoes drop constraint if exists geracoes_escudo_modo_valido;
alter table geracoes add constraint geracoes_escudo_modo_valido
  check (escudo_modo in ('ambos', 'clube', 'adversario', 'nenhum'));

alter table geracoes drop constraint if exists geracoes_zona_texto_valida;
alter table geracoes add constraint geracoes_zona_texto_valida
  check (zona_texto in ('auto', 'topo', 'base', 'lateral'));

alter table geracoes drop constraint if exists geracoes_paleta_valida;
alter table geracoes add constraint geracoes_paleta_valida
  check (paleta in ('referencia', 'clube'));

comment on column geracoes.escudo_modo is
  'Quais escudos foram ao modelo. "nenhum" nao deixa buraco: o prompt manda a area sobrar vazia, porque area vazia sem instrucao e onde o modelo inventa.';
comment on column geracoes.zona_texto is
  'Faixa preferida do bloco principal de texto. Zona, nao desenho — a forma continua saindo da referencia.';
comment on column geracoes.paleta is
  'De onde saem as cores: da referencia de estilo ou do escudo do clube.';
