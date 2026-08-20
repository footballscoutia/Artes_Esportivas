-- ---------------------------------------------------------------------------
-- Entrada aberta — cadastrar cria uma org nova, em vez de precisar de convite.
--
-- O gatilho `exigir_convite()` (sql/009) foi construido quando so existia UMA
-- agencia e senha tinha acabado de nascer: cadastro aberto significava
-- qualquer pessoa gerando arte na fatura do Marcio. Fazia sentido travar tudo.
--
-- Agora existe org_id (sql/010) e cada org paga a propria fatura, entao a
-- pergunta muda de "quem pode entrar no MEU projeto" para "quem pode criar UM
-- projeto novo" — e a resposta e: qualquer um. `criar_perfil()` (sql/010) ja
-- sabe fazer isso: se o e-mail bate com um convite, entra na org de quem
-- convidou; se nao bate com nada, ganha uma org propria. So faltava o
-- `exigir_convite()` parar de barrar esse segundo caso na porta.
-- ---------------------------------------------------------------------------

drop trigger if exists ao_criar_usuario_exigir_convite on auth.users;
drop function if exists public.exigir_convite();

-- ---------------------------------------------------------------------------
-- O nome da org nova vem do que a pessoa digitou no cadastro, nao do prefixo
-- do e-mail — "prokiki.pedro" como nome de agencia era so o que sobrava sem
-- ter o que perguntar. A tela de login manda em `raw_user_meta_data.organizacao`;
-- sem isso (cadastro fora da nossa tela — API direta, por exemplo), cai no
-- prefixo do e-mail como antes.
-- ---------------------------------------------------------------------------
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_nova boolean := false;
begin
  select org_id into v_org_id from convites where email = lower(new.email);

  if v_org_id is null then
    v_org_nova := true;
    insert into organizacoes (nome)
    values (
      coalesce(
        nullif(new.raw_user_meta_data->>'organizacao', ''),
        nullif(new.raw_user_meta_data->>'nome', ''),
        split_part(new.email, '@', 1)
      )
    )
    returning id into v_org_id;
  end if;

  /**
   * Quem funda a org nasce podendo aprovar — sem isso, a primeira pessoa da
   * primeira agencia nova nao consegue nem convidar o proprio time, porque
   * `convidar()` e `pode_aprovar()` exigem o papel 'aprova'. Quem ENTRA numa
   * org existente por convite nasce 'submete' (o default da tabela): quem
   * convida e que decide promover, depois, editando o perfil.
   */
  insert into perfis (id, email, nome, org_id, papel)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    v_org_id,
    case when v_org_nova then 'aprova'::papel_usuario else 'submete'::papel_usuario end
  );
  return new;
end;
$$;
