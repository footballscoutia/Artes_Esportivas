-- ---------------------------------------------------------------------------
-- Uniformes — o manto vira dado, em vez de suposição do modelo.
--
-- Mesma lição do escudo (sql/008): o que o modelo não recebe como IMAGEM, ele
-- desenha de memória. E camisa desenhada de memória é o pior tipo de erro
-- nestas artes, porque parece certa — as cores batem, as faixas quase batem, e
-- ninguém confere o patrocínio nem o padrão da temporada. Publicado no perfil
-- do clube, é o detalhe que o torcedor vê antes de qualquer outra coisa.
--
-- A foto do atleta já mostra ALGUM uniforme, mas mostra o da foto: a do elenco
-- foi tirada uma vez e a temporada muda. Aqui a agência diz qual manto vale
-- nesta arte, e a peça de referência é uma foto de alguém vestindo — não um
-- desenho da camisa, porque o modelo precisa ver como o tecido cai no corpo.
--
-- Pertence ao CLUBE e não à org solta: uniforme é do Flamengo, não da agência.
-- Amarrar assim deixa a tela de gerar oferecer só os mantos de quem está em
-- campo, em vez de uma lista de tudo que já foi cadastrado.
-- ---------------------------------------------------------------------------

create table if not exists uniformes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizacoes(id) default public.minha_org(),
  clube_id uuid not null references clubes(id) on delete cascade,
  /* "Titular 2026", "Away", "Terceiro" — o nome é da agência, não normalizado:
     cada clube inventa o próprio vocabulário e forçar um enum só criaria
     uniforme cadastrado na gaveta errada. */
  nome text not null,
  imagem_url text not null,
  ativo boolean not null default true,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

create index if not exists uniformes_do_clube on uniformes (clube_id) where ativo;

alter table geracoes add column if not exists uniforme_id uuid references uniformes(id);

comment on table uniformes is
  'Fotos de referência do manto de cada clube. Vão ao modelo como imagem, para a camisa não ser desenhada de memória.';
comment on column geracoes.uniforme_id is
  'Qual uniforme esta geração mandou ao modelo. Nulo = nenhum, e a camisa saiu da foto do atleta.';

alter table uniformes enable row level security;

create policy "uniformes: leitura da propria org"
  on uniformes for select to authenticated using (org_id = public.minha_org());

create policy "uniformes: equipe cadastra"
  on uniformes for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

create policy "uniformes: equipe edita"
  on uniformes for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

-- Privado como os outros, lido só por URL assinada.
insert into storage.buckets (id, name, public)
values ('uniformes', 'uniformes', false)
on conflict (id) do nothing;
