-- ---------------------------------------------------------------------------
-- Guardar o fundo cru, separado da arte composta.
--
-- `imagem_url` e a arte final: fundo + nome + logo, achatados num PNG so.
-- A partir dela nao da para trocar o nome sem regerar, porque o texto ja esta
-- queimado no pixel.
--
-- O README promete o contrario — "um nome errado se corrige sem gastar outra
-- geracao" — e essa promessa precisa do fundo guardado inteiro. `fundo_url`
-- aponta para o que o modelo devolveu, antes de qualquer camada.
-- ---------------------------------------------------------------------------
alter table geracoes add column if not exists fundo_url text;

comment on column geracoes.fundo_url is
  'Caminho no storage do que o modelo devolveu, sem as camadas de codigo. Permite recompor nome e logo sem gastar outra geracao.';
