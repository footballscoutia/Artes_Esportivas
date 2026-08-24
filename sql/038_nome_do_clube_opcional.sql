-- ---------------------------------------------------------------------------
-- Se o nome do clube foi escrito na arte, registrado junto das outras escolhas.
--
-- Nao existe instrucao nova no prompt para isto. Falso faz o `clube` chegar
-- vazio ao montarPrompt, e o item inteiro cai — o mesmo mecanismo que ja
-- tratava campo em branco desde que `""` num marcador fez o modelo desenhar
-- glifos para preencher o buraco. O que muda e virar escolha visivel na tela e
-- caber num padrao salvo.
--
-- A coluna existe pelo motivo das outras tres: `pedidos.clube` continua
-- guardando o clube de verdade, entao sem esta coluna nao daria para saber, ao
-- diagnosticar uma arte, se o nome faltou por escolha ou por falha do modelo.
-- ---------------------------------------------------------------------------

alter table geracoes add column if not exists nome_clube boolean not null default true;

comment on column geracoes.nome_clube is
  'Se o nome do clube foi ao modelo. Falso = escolha de nao escrever, e nao esquecimento do modelo — pedidos.clube segue guardando qual era o clube.';
