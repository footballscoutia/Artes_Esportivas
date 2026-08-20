-- ---------------------------------------------------------------------------
-- Convites — quem pode criar conta.
--
-- A entrada virou e-mail e senha, e com isso o cadastro ficou aberto: qualquer
-- pessoa com a URL criava conta e gerava arte na fatura da agencia. A tela
-- sempre disse "o acesso e liberado pela agencia"; aqui isso passa a ser
-- verdade.
--
-- Nao travamos por dominio de e-mail. A equipe usa e-mail pessoal — a unica
-- conta do projeto e @gmail.com — entao a regra por dominio ou tranca todo
-- mundo para fora ou libera o Gmail inteiro, que nao e regra nenhuma.
-- ---------------------------------------------------------------------------

create table if not exists convites (
  /* minusculo sempre: e-mail nao diferencia caixa, e "Joao@" e "joao@" sao a
     mesma pessoa. Guardar como veio criaria convite que nunca casa. */
  email text primary key check (email = lower(email)),
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  /* carimbado pelo gatilho quando o convite vira conta: serve para a tela
     mostrar "ja entrou" sem consultar auth.users, que a RLS nao alcanca */
  usado_em timestamptz
);

-- ---------------------------------------------------------------------------
-- O porteiro.
--
-- Roda BEFORE INSERT em auth.users, que e o unico ponto por onde toda conta
-- passa — formulario, OAuth, painel do Supabase, API. Checagem em tela nao e
-- checagem: quem chama a API do Supabase direto nao ve a nossa tela.
-- ---------------------------------------------------------------------------
create or replace function public.exigir_convite()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  /* Projeto zerado entra sem convite: alguem tem que abrir a porta, e nao ha
     ninguem para convidar o primeiro. Da segunda conta em diante a regra vale
     para todos, inclusive para quem administra. */
  if not exists (select 1 from perfis) then
    return new;
  end if;

  if not exists (
    select 1 from convites where email = lower(new.email)
  ) then
    raise exception 'sem convite para %', new.email
      using errcode = '42501';
  end if;

  update convites set usado_em = now() where email = lower(new.email);
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_exigir_convite on auth.users;
create trigger ao_criar_usuario_exigir_convite
  before insert on auth.users
  for each row execute function public.exigir_convite();

-- ---------------------------------------------------------------------------
-- RLS: so quem aprova mexe na lista.
--
-- Nao ha policy para `anon`: de proposito. Sem leitura publica ninguem
-- descobre pela API quais e-mails estao convidados, que seria uma lista dos
-- funcionarios da agencia servida de graca.
-- ---------------------------------------------------------------------------
alter table convites enable row level security;

create policy "convites: quem aprova le"
  on convites for select to authenticated using (public.pode_aprovar());

create policy "convites: quem aprova convida"
  on convites for insert to authenticated with check (public.pode_aprovar());

create policy "convites: quem aprova retira"
  on convites for delete to authenticated using (public.pode_aprovar());

comment on table convites is
  'Lista de e-mails autorizados a criar conta. Quem aplica e o gatilho exigir_convite() em auth.users, nao a aplicacao.';
