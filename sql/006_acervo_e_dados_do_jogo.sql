-- ---------------------------------------------------------------------------
-- 1. Referencia deixa de ser unica por categoria.
--
-- O esquema nasceu para "12 referencias curadas, uma por tipo x formato" e o
-- indice `referencias_ativa_unica` garantia exatamente isso. O acervo real tem
-- 59 referencias so de matchday: agora sao muitas ativas por categoria e o
-- gerador sorteia uma. E o que da variedade em vez de todo post sair igual.
-- ---------------------------------------------------------------------------
drop index if exists referencias_ativa_unica;

-- consulta quente: "pegue as ativas desta categoria e formato"
create index if not exists referencias_acervo
  on referencias (tipo, formato) where ativa;

-- ---------------------------------------------------------------------------
-- 2. Dados do jogo, para matchday.
--
-- Um post de matchday mostra adversario, data, hora, campeonato e estadio. Sem
-- esses campos o modelo inventa — e data de jogo inventada e pior que nome
-- errado, porque parece certa e ninguem confere.
--
-- Ficam nulos para os outros tipos.
-- ---------------------------------------------------------------------------
alter table pedidos
  add column if not exists adversario text,
  add column if not exists data_jogo date,
  add column if not exists hora_jogo text,
  add column if not exists campeonato text,
  add column if not exists estadio text;

comment on column pedidos.hora_jogo is
  'Texto livre e nao `time` de proposito: a arte mostra "20H", "21h30", "16:00 CET". Formatar aqui viraria briga com o que o cliente digitou.';
