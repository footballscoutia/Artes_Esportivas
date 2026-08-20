-- ---------------------------------------------------------------------------
-- Marcas — a logo carimbada na arte vira dado, nao mais um arquivo fixo em
-- public/brand/logo.png escolhido pelo codigo.
--
-- O motivo nao e so o produto deixar de ser exclusivo do Marcio (Fase 3 cuida
-- da marca do produto em si). E que carimbar sempre no mesmo canto do mesmo
-- tamanho colide: a composicao muda a cada geracao, e o canto certo so da pra
-- saber depois de ver a arte pronta. Por isso a escolha mora na GERACAO, nao
-- na org — cada tentativa pode escolher um canto diferente sem gastar uma
-- chamada nova ao modelo, recompondo a partir do `fundo_url` que ja existe.
-- ---------------------------------------------------------------------------

create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) default public.minha_org(),
  nome text not null,
  /* caminho no bucket privado `marcas` */
  imagem_url text not null,
  ativa boolean not null default true,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

create index if not exists marcas_ativas on marcas (org_id) where ativa;

alter table geracoes add column if not exists marca_id uuid references marcas(id);
alter table geracoes add column if not exists posicao_logo text
  check (posicao_logo in ('inferior-direito', 'inferior-esquerdo', 'superior-direito', 'superior-esquerdo', 'nenhuma'));

comment on column geracoes.marca_id is
  'Qual marca foi carimbada nesta geracao especifica. Nulo nas geracoes de antes desta coluna existir.';
comment on column geracoes.posicao_logo is
  'Canto onde a marca entrou. Escolha de cada tentativa, nao da org — a composicao muda a cada geracao, e o canto livre so se sabe depois de ver a arte.';

-- ---------------------------------------------------------------------------
-- RLS: mesmo desenho de clubes e jogadores — leitura e escrita para a propria
-- org, sem recorte por quem cadastrou.
-- ---------------------------------------------------------------------------
alter table marcas enable row level security;

create policy "marcas: leitura da propria org"
  on marcas for select to authenticated using (org_id = public.minha_org());

create policy "marcas: equipe cadastra"
  on marcas for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

create policy "marcas: equipe edita"
  on marcas for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

-- ---------------------------------------------------------------------------
-- Bucket novo. Privado como os outros tres; lido e escrito so pelo cliente
-- admin, do mesmo jeito que fotos-jogadores e referencias — por isso nao leva
-- policy nenhuma de `authenticated`, so o service_role atravessa RLS nenhuma.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('marcas', 'marcas', false)
on conflict (id) do nothing;
