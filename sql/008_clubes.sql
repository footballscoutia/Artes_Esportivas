-- ---------------------------------------------------------------------------
-- Clubes.
--
-- Nas 78 referencias o clube e METADE da arte: o escudo aparece, e a paleta
-- inteira sai das cores dele. Ate agora o prompt recebia so o nome como texto,
-- e o modelo inventava cor e escudo — que e o pior dos dois mundos, porque
-- escudo inventado parece escudo.
--
-- Com o clube cadastrado, o escudo entra na chamada como IMAGEM de referencia,
-- do mesmo jeito que a foto do atleta, e as cores entram no prompt.
--
-- Matchday precisa de dois: o clube do atleta e o adversario.
-- ---------------------------------------------------------------------------

create table if not exists clubes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  /* como o clube aparece escrito na arte, quando difere do nome de cadastro */
  nome_curto text,
  /* caminho no bucket privado `referencias`: escudo e ativo da agencia */
  escudo_url text,
  /* hex, sem #. o modelo recebe como texto no prompt */
  cor_primaria text,
  cor_secundaria text,
  ativo boolean not null default true,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists clubes_ativos on clubes (nome) where ativo;

create trigger clubes_touch before update on clubes
  for each row execute function public.tocar_atualizado_em();

-- o atleta pertence a um clube; o texto livre continua como saida para quem
-- ainda nao cadastrou
alter table jogadores add column if not exists clube_id uuid references clubes(id);

-- o pedido guarda os dois: de quem e a arte, e contra quem no caso de matchday
alter table pedidos
  add column if not exists clube_id uuid references clubes(id),
  add column if not exists adversario_id uuid references clubes(id);

-- ---------------------------------------------------------------------------
-- RLS: mesma logica do elenco. O cadastro e da agencia, nao de quem digitou.
-- ---------------------------------------------------------------------------
alter table clubes enable row level security;

create policy "clubes: leitura para autenticados"
  on clubes for select to authenticated using (true);

create policy "clubes: equipe cadastra"
  on clubes for insert to authenticated with check (criado_por = auth.uid());

create policy "clubes: equipe edita"
  on clubes for update to authenticated using (true) with check (true);

comment on column clubes.escudo_url is
  'Vai para o modelo como imagem de referencia, nao como descricao. Escudo descrito em texto sai inventado.';
