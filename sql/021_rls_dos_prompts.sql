-- ---------------------------------------------------------------------------
-- RLS na tabela de prompts.
--
-- A sql/020 criou `prompts` e esqueceu disto. No Supabase, tabela sem RLS fica
-- inteira ao alcance da chave anônima — que vive no bundle do navegador, à
-- vista de qualquer um. Ou seja: leitura E ESCRITA abertas sobre o texto que
-- comanda toda geração do produto. Não é vazamento de dado de cliente; é pior
-- de um jeito diferente, porque quem reescrevesse o prompt mudaria a arte de
-- todo mundo sem tocar em uma linha de código.
--
-- Mesmo desenho de `referencias`, que é o parente mais próximo: quem está
-- autenticado lê, e só quem aprova escreve. Ler precisa ser liberado porque a
-- geração usa o cliente de SESSÃO, não o admin.
--
-- Sem policy para `anon`: de propósito. O prompt-mãe é o que o produto sabe
-- fazer que os outros não sabem — servi-lo de graça a quem só tem a URL seria
-- entregar a receita.
-- ---------------------------------------------------------------------------

alter table prompts enable row level security;

create policy "prompts: leitura para autenticados"
  on prompts for select to authenticated using (true);

create policy "prompts: so quem aprova edita"
  on prompts for all to authenticated
  using (public.pode_aprovar())
  with check (public.pode_aprovar());
