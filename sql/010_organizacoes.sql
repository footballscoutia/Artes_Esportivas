-- ---------------------------------------------------------------------------
-- Organizações — isolamento entre clientes.
--
-- Ate aqui toda policy do projeto era `using (true)` para autenticado: certo
-- para uma agencia so, vazamento no segundo cliente. Sem isso, o proximo
-- cliente abre o Elenco e ve os atletas do Marcio, com foto.
--
-- `referencias` fica de fora, de proposito: e o acervo do produto, nao de um
-- cliente. Toda org escolhe categoria e nunca ve a referencia em si.
--
-- O default de `org_id` chama `minha_org()`, entao nenhuma acao em
-- src/lib/acoes.ts que grava pelo cliente de SESSAO precisa mudar — o valor
-- certo entra sozinho. So os dois lugares que gravam `geracoes` pelo cliente
-- ADMIN (que nao tem sessao, logo nao tem `auth.uid()`) passam `org_id` na
-- mao; isso muda em acoes.ts, nao aqui.
-- ---------------------------------------------------------------------------

create table if not exists organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- a unica org que existe hoje: tudo que ja esta no banco e dela
insert into organizacoes (nome)
select 'Marcio Bittencourt Sports'
where not exists (select 1 from organizacoes);

alter table perfis     add column if not exists org_id uuid references organizacoes(id);
alter table jogadores  add column if not exists org_id uuid references organizacoes(id);
alter table clubes     add column if not exists org_id uuid references organizacoes(id);
alter table pedidos    add column if not exists org_id uuid references organizacoes(id);
alter table geracoes   add column if not exists org_id uuid references organizacoes(id);
alter table convites   add column if not exists org_id uuid references organizacoes(id);

update perfis    set org_id = (select id from organizacoes limit 1) where org_id is null;
update jogadores set org_id = (select id from organizacoes limit 1) where org_id is null;
update clubes    set org_id = (select id from organizacoes limit 1) where org_id is null;
update pedidos   set org_id = (select id from organizacoes limit 1) where org_id is null;
update convites  set org_id = (select id from organizacoes limit 1) where org_id is null;

-- geracoes deriva do pedido, nao da org unica direto: e o jeito certo mesmo
-- valendo o mesmo hoje, e o padrao que a coluna vai seguir dali pra frente
update geracoes g set org_id = p.org_id
  from pedidos p
 where g.pedido_id = p.id and g.org_id is null;

alter table perfis     alter column org_id set not null;
alter table jogadores  alter column org_id set not null;
alter table clubes     alter column org_id set not null;
alter table pedidos    alter column org_id set not null;
alter table geracoes   alter column org_id set not null;
alter table convites   alter column org_id set not null;

-- ---------------------------------------------------------------------------
-- minha_org() — mesmo desenho de pode_aprovar(): security definer, le so a
-- propria linha de perfis, e por isso nao entra em recursao com a RLS de
-- perfis que ela mesma ajuda a aplicar.
-- ---------------------------------------------------------------------------
create or replace function public.minha_org()
returns uuid
language sql stable
security definer set search_path = public
as $$
  select org_id from perfis where id = auth.uid();
$$;

alter table jogadores alter column org_id set default public.minha_org();
alter table clubes    alter column org_id set default public.minha_org();
alter table pedidos   alter column org_id set default public.minha_org();
alter table convites  alter column org_id set default public.minha_org();

-- ---------------------------------------------------------------------------
-- criar_perfil() passa a decidir a org de quem acabou de criar conta.
--
-- Quem foi convidado entra na org de quem convidou — e o que `convites.org_id`
-- passa a guardar a partir de agora. Quem cria a PRIMEIRA conta do projeto
-- (o caso que `exigir_convite()` ja deixa passar sem convite) ganha uma org
-- nova em folha: e assim que a Fase 4 vai abrir cadastro de verdade, e sem
-- isso o gatilho quebraria o primeiro cadastro de um projeto do zero.
-- ---------------------------------------------------------------------------
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from convites where email = lower(new.email);

  if v_org_id is null then
    insert into organizacoes (nome)
    values (coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)))
    returning id into v_org_id;
  end if;

  insert into perfis (id, email, nome, org_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''), v_org_id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: troca de "autenticado ve tudo" para "autenticado ve a propria org".
-- ---------------------------------------------------------------------------

drop policy if exists "perfis: leitura para autenticados" on perfis;
create policy "perfis: leitura da propria org"
  on perfis for select to authenticated using (org_id = public.minha_org());

drop policy if exists "perfis: cada um edita o proprio" on perfis;
create policy "perfis: cada um edita o proprio"
  on perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and org_id = public.minha_org());

drop policy if exists "pedidos: leitura para autenticados" on pedidos;
create policy "pedidos: leitura da propria org"
  on pedidos for select to authenticated using (org_id = public.minha_org());

drop policy if exists "pedidos: qualquer um da equipe cria" on pedidos;
create policy "pedidos: qualquer um da equipe cria"
  on pedidos for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

drop policy if exists "pedidos: autor edita o proprio rascunho" on pedidos;
create policy "pedidos: autor edita o proprio rascunho"
  on pedidos for update to authenticated
  using (criado_por = auth.uid() and status in ('rascunho', 'em_revisao') and org_id = public.minha_org())
  with check (criado_por = auth.uid() and org_id = public.minha_org());

drop policy if exists "pedidos: aprovador muda qualquer status" on pedidos;
create policy "pedidos: aprovador muda qualquer status"
  on pedidos for update to authenticated
  using (public.pode_aprovar() and org_id = public.minha_org())
  with check (public.pode_aprovar() and org_id = public.minha_org());

drop policy if exists "geracoes: leitura para autenticados" on geracoes;
create policy "geracoes: leitura da propria org"
  on geracoes for select to authenticated using (org_id = public.minha_org());

drop policy if exists "geracoes: aprovador registra decisao" on geracoes;
create policy "geracoes: aprovador registra decisao"
  on geracoes for update to authenticated
  using (public.pode_aprovar() and org_id = public.minha_org())
  with check (public.pode_aprovar() and org_id = public.minha_org());

drop policy if exists "jogadores: leitura para autenticados" on jogadores;
create policy "jogadores: leitura da propria org"
  on jogadores for select to authenticated using (org_id = public.minha_org());

drop policy if exists "jogadores: equipe cadastra" on jogadores;
create policy "jogadores: equipe cadastra"
  on jogadores for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

drop policy if exists "jogadores: equipe edita" on jogadores;
create policy "jogadores: equipe edita"
  on jogadores for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

drop policy if exists "clubes: leitura para autenticados" on clubes;
create policy "clubes: leitura da propria org"
  on clubes for select to authenticated using (org_id = public.minha_org());

drop policy if exists "clubes: equipe cadastra" on clubes;
create policy "clubes: equipe cadastra"
  on clubes for insert to authenticated
  with check (criado_por = auth.uid() and org_id = public.minha_org());

drop policy if exists "clubes: equipe edita" on clubes;
create policy "clubes: equipe edita"
  on clubes for update to authenticated
  using (org_id = public.minha_org())
  with check (org_id = public.minha_org());

drop policy if exists "convites: quem aprova le" on convites;
create policy "convites: quem aprova le"
  on convites for select to authenticated
  using (public.pode_aprovar() and org_id = public.minha_org());

drop policy if exists "convites: quem aprova convida" on convites;
create policy "convites: quem aprova convida"
  on convites for insert to authenticated
  with check (public.pode_aprovar() and org_id = public.minha_org());

drop policy if exists "convites: quem aprova retira" on convites;
create policy "convites: quem aprova retira"
  on convites for delete to authenticated
  using (public.pode_aprovar() and org_id = public.minha_org());

-- ---------------------------------------------------------------------------
-- Storage: nenhuma tela fala com o storage pelo cliente de sessao. As tres
-- funcoes de src/lib/storage.ts (subir, assinar, baixar) usam o cliente
-- ADMIN, que ignora RLS por natureza — entao as policies de `authenticated`
-- aqui embaixo nunca foram exercidas pelo app, so ficavam abertas para quem
-- chamasse o storage direto com a chave anon, sem passar pela nossa RLS de
-- linha nenhuma. Cai tudo; o service_role continua podendo tudo, sempre.
-- ---------------------------------------------------------------------------

drop policy if exists "storage: equipe le os buckets do projeto" on storage.objects;
drop policy if exists "storage: equipe sobe foto de jogador" on storage.objects;
drop policy if exists "storage: so aprovador mexe em referencia" on storage.objects;
