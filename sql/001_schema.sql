-- ---------------------------------------------------------------------------
-- Gerador de Artes Esportivas — esquema inicial
-- Rodar no SQL Editor do Supabase (uma vez, no projeto novo).
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type tipo_post as enum (
  'contratacao', 'gol', 'estreia', 'mvp', 'aniversario', 'frase'
);

create type formato_arte as enum ('feed_4x5', 'story_9x16');

create type status_pedido as enum ('rascunho', 'em_revisao', 'aprovado', 'publicado');

create type papel_usuario as enum ('submete', 'aprova');

-- ---------------------------------------------------------------------------
-- Perfis — espelha auth.users e guarda o papel
-- ---------------------------------------------------------------------------
create table perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  email text not null,
  papel papel_usuario not null default 'submete',
  criado_em timestamptz not null default now()
);

create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

create or replace function public.pode_aprovar()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from perfis where id = auth.uid() and papel = 'aprova'
  );
$$;

-- ---------------------------------------------------------------------------
-- Referencias — a identidade visual da agencia mora aqui.
-- Chave e (tipo, formato): feed e story precisam de artes separadas, nao da
-- para reenquadrar a mesma arte. Sao 6 tipos x 2 formatos = 12 para curar.
-- ---------------------------------------------------------------------------
create table referencias (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_post not null,
  formato formato_arte not null,
  imagem_url text,
  prompt_mae text not null,
  versao integer not null default 1,
  ativa boolean not null default true,
  observacoes text,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- so uma referencia ativa por combinacao; as versoes antigas ficam inativas
create unique index referencias_ativa_unica
  on referencias (tipo, formato)
  where ativa;

create index referencias_chave on referencias (tipo, formato, versao desc);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_post not null,
  formato formato_arte not null,
  foto_jogador_url text,
  nome_jogador text not null,
  clube text,
  frase text,
  referencia_id uuid references referencias(id),
  referencia_versao integer,
  status status_pedido not null default 'rascunho',
  criado_por uuid not null references perfis(id),
  aprovado_por uuid references perfis(id),
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pedidos_status on pedidos (status, criado_em desc);

-- ---------------------------------------------------------------------------
-- Geracoes — inclusive as recusadas.
-- Cinco recusas seguidas de "gol" apontam para a referencia ou para o
-- prompt-mae, nao para a IA. Este historico e o diagnostico.
-- ---------------------------------------------------------------------------
create table geracoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  imagem_url text,
  aprovada boolean not null default false,
  motivo_recusa text,
  modelo text not null,
  provider text not null default 'gemini',
  custo_usd numeric(6, 4) not null default 0,
  duracao_ms integer,
  criado_em timestamptz not null default now()
);

create index geracoes_pedido on geracoes (pedido_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- atualizado_em automatico
-- ---------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger referencias_touch before update on referencias
  for each row execute function public.tocar_atualizado_em();
create trigger pedidos_touch before update on pedidos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS — ferramenta interna: todo mundo autenticado le tudo.
-- O que muda entre os papeis e quem aprova e quem cura referencia.
-- ---------------------------------------------------------------------------
alter table perfis enable row level security;
alter table referencias enable row level security;
alter table pedidos enable row level security;
alter table geracoes enable row level security;

create policy "perfis: leitura para autenticados"
  on perfis for select to authenticated using (true);

create policy "perfis: cada um edita o proprio"
  on perfis for update to authenticated using (id = auth.uid());

create policy "referencias: leitura para autenticados"
  on referencias for select to authenticated using (true);

create policy "referencias: so quem aprova cura"
  on referencias for all to authenticated
  using (public.pode_aprovar()) with check (public.pode_aprovar());

create policy "pedidos: leitura para autenticados"
  on pedidos for select to authenticated using (true);

create policy "pedidos: qualquer um da equipe cria"
  on pedidos for insert to authenticated with check (criado_por = auth.uid());

create policy "pedidos: autor edita o proprio rascunho"
  on pedidos for update to authenticated
  using (criado_por = auth.uid() and status in ('rascunho', 'em_revisao'))
  with check (criado_por = auth.uid());

create policy "pedidos: aprovador muda qualquer status"
  on pedidos for update to authenticated
  using (public.pode_aprovar()) with check (public.pode_aprovar());

create policy "geracoes: leitura para autenticados"
  on geracoes for select to authenticated using (true);

create policy "geracoes: aprovador registra decisao"
  on geracoes for update to authenticated
  using (public.pode_aprovar()) with check (public.pode_aprovar());

-- insert de geracao e feito pelo servidor com a service_role, que ignora RLS

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('fotos-jogadores', 'fotos-jogadores', false),
  ('geracoes', 'geracoes', false),
  ('referencias', 'referencias', false)
on conflict (id) do nothing;

create policy "storage: equipe le os buckets do projeto"
  on storage.objects for select to authenticated
  using (bucket_id in ('fotos-jogadores', 'geracoes', 'referencias'));

create policy "storage: equipe sobe foto de jogador"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-jogadores');

create policy "storage: so aprovador mexe em referencia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'referencias' and public.pode_aprovar());

-- ---------------------------------------------------------------------------
-- Sementes: as 12 referencias entram por aqui ou pela tela de Referencias.
-- O prompt-mae de cada uma tem que ser validado no AI Studio antes de virar
-- producao — rodar 5 vezes em 2K, erro de mao e de escudo so aparece em alta.
-- ---------------------------------------------------------------------------
-- insert into referencias (tipo, formato, imagem_url, prompt_mae) values
--   ('gol', 'feed_4x5', 'referencias/gol-feed-v1.png', '...');
