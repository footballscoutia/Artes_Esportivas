-- ---------------------------------------------------------------------------
-- Liberação para gerar — quem pode gastar o saldo.
--
-- O cadastro aberto (sql/012) respondeu "quem pode ter uma conta". Ficou de pé
-- outra pergunta, que só virou urgente quando a chave do Gemini entrou no ar:
-- quem pode GASTAR. Cada imagem custa dinheiro de verdade, de um saldo
-- pré-pago, e até aqui qualquer conta recém-criada saía gerando.
--
-- A liberação é da PLATAFORMA, não da organização. Se cada agência liberasse a
-- si mesma, a permissão se autoconcederia no cadastro e não seria permissão
-- nenhuma — quem decide é quem paga a conta.
--
-- Isto é uma trava de começo, não o modelo de cobrança. Quando existir plano e
-- limite por org (a fase 5), esta coluna vira o "plano gratuito com zero
-- créditos" e some do caminho.
-- ---------------------------------------------------------------------------

alter table perfis
  add column if not exists pode_gerar boolean not null default false,
  add column if not exists admin_plataforma boolean not null default false;

comment on column perfis.pode_gerar is
  'Se esta conta pode chamar o modelo. Falso por padrão: conta nova não gasta saldo antes de alguém dizer que pode.';
comment on column perfis.admin_plataforma is
  'Dono do saldo. Único que libera geração para os outros. Não se concede pela aplicação.';

-- O dono do saldo. Por e-mail porque é o que identifica a pessoa antes de o
-- perfil existir; se a conta ainda não foi criada, o update não pega ninguém e
-- a linha volta a rodar depois sem estragar nada.
update perfis
   set admin_plataforma = true,
       pode_gerar = true
 where email = 'prokiki.pedro@gmail.com';

-- ---------------------------------------------------------------------------
-- As duas perguntas, respondidas dentro do banco.
--
-- `security definer` porque as duas leem `perfis`, e uma policy de `perfis` que
-- chamasse uma função que lê `perfis` entraria em recursão. Rodando como dona,
-- a função enxerga a tabela sem passar pela RLS — o mesmo desenho de
-- `minha_org()` (sql/010).
--
-- O nome é `pode_gerar_arte` e não `pode_gerar` para não colidir com a coluna:
-- iguais, `where pode_gerar` dentro de uma query sobre `perfis` viraria um
-- enigma para quem lesse depois.
-- ---------------------------------------------------------------------------
create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select p.admin_plataforma from perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.pode_gerar_arte()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select p.pode_gerar from perfis p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Liberar e retirar.
--
-- Uma função em vez de uma policy de UPDATE em `perfis`: a policy deixaria o
-- admin mexer em QUALQUER coluna de qualquer perfil — inclusive `org_id`, e um
-- org_id trocado por engano mistura os dados de duas agências, que é o
-- acidente mais caro que este esquema tem. Aqui só uma coluna se move.
-- ---------------------------------------------------------------------------
create or replace function public.liberar_geracao(p_perfil uuid, p_pode boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'só o administrador da plataforma libera geração'
      using errcode = '42501';
  end if;

  /* O admin não se rebaixa por acidente: se ele mesmo perdesse a liberação,
     não haveria como se devolver pela tela. */
  if p_perfil = auth.uid() and p_pode = false then
    raise exception 'o administrador não retira a própria liberação'
      using errcode = '42501';
  end if;

  update perfis set pode_gerar = p_pode where id = p_perfil;
end;
$$;

-- ---------------------------------------------------------------------------
-- A lista que o admin vê.
--
-- Também função, e não policy de SELECT: ler todos os perfis é uma leitura
-- ATRAVESSANDO organizações, o oposto de tudo que a sql/010 montou. Concentrar
-- isso numa função é ter um lugar só para auditar quando alguém perguntar
-- "quem consegue ver o quê".
--
-- O gasto é da ORGANIZAÇÃO, não da pessoa: as gerações são gravadas por org, e
-- inventar um rateio por pessoa seria número bonito e errado.
-- ---------------------------------------------------------------------------
create or replace function public.painel_de_acessos()
returns table (
  id uuid,
  nome text,
  email text,
  organizacao text,
  pode_gerar boolean,
  admin_plataforma boolean,
  criado_em timestamptz,
  geracoes_da_org bigint,
  gasto_da_org_usd numeric
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'só o administrador da plataforma vê os acessos'
      using errcode = '42501';
  end if;

  return query
    select p.id,
           p.nome,
           p.email,
           o.nome,
           p.pode_gerar,
           p.admin_plataforma,
           p.criado_em,
           coalesce(g.n, 0)::bigint,
           coalesce(g.usd, 0)::numeric
      from perfis p
      join organizacoes o on o.id = p.org_id
      left join lateral (
        select count(*) as n, sum(ge.custo_usd) as usd
          from geracoes ge
         where ge.org_id = p.org_id
      ) g on true
     order by p.criado_em;
end;
$$;

revoke all on function public.painel_de_acessos() from anon;
revoke all on function public.liberar_geracao(uuid, boolean) from anon;
