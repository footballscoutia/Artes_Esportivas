-- ---------------------------------------------------------------------------
-- Video: as camadas viram dado, e as escolhas do editor ficam com o video.
--
-- Um video NAO e uma geracao a mais. A diferenca que justifica tabela propria:
--
--   Uma geracao produz UMA imagem e acabou. Um video tem duas camadas caras,
--   um monte de escolhas baratas, e e EDITADO depois de pronto — a pessoa mexe
--   na tipografia, no ritmo e nas cores quantas vezes quiser sem gastar nada,
--   porque a parte que custou ja esta no balde.
--
-- E dai vem o formato: `fundo_url` e `atleta_url` sao o que custou dinheiro e
-- nunca mudam; `opcoes` e o documento que o editor reescreve a vontade. Separar
-- os dois e o que torna "nao gostei, deixa eu ajustar" gratuito.
--
-- `mp4_url` nasce nulo. Renderizar e um passo separado e demorado, e um video
-- sem mp4 nao e um video quebrado: e um rascunho que ainda esta sendo editado.
-- ---------------------------------------------------------------------------

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) default public.minha_org(),
  pedido_id uuid not null references pedidos(id) on delete cascade,

  /* O que custou geracao. Imutavel — regerar as camadas cria video novo. */
  fundo_url text not null,
  atleta_url text not null,

  /* O documento do editor. Contrato em src/video/template.ts. */
  opcoes jsonb not null default '{}'::jsonb,

  /* Nulo enquanto ninguem mandou renderizar. */
  mp4_url text,
  duracao_s numeric,

  custo_usd numeric,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists videos_do_pedido on videos (pedido_id, criado_em desc);
create index if not exists videos_da_org on videos (org_id, criado_em desc);

comment on table videos is
  'Um video em edicao. As camadas custaram geracao e nao mudam; as opcoes sao reescritas de graca quantas vezes a pessoa quiser.';
comment on column videos.mp4_url is
  'Nulo = ainda nao renderizado. Nao e defeito: e rascunho em edicao.';

alter table videos enable row level security;

create policy "videos: leitura da propria org"
  on videos for select to authenticated using (org_id = public.minha_org());

create policy "videos: equipe edita"
  on videos for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

create policy "videos: equipe apaga"
  on videos for delete to authenticated using (org_id = public.minha_org());

/* Sem policy de INSERT para `authenticated`, igual a `geracoes`: quem cria video
   e o servidor, depois que o modelo respondeu e o dinheiro saiu. Cliente que
   pudesse inserir aqui poderia registrar video sem ter gerado camada nenhuma. */

-- Privado como os outros. Leitura so por URL assinada de validade curta.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;
