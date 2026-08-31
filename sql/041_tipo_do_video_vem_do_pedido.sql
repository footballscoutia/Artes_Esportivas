-- ---------------------------------------------------------------------------
-- O TIPO GRAVADO NAS OPCOES DO VIDEO PASSA A CONCORDAR COM O DO PEDIDO.
--
-- E o tipo que escolhe o roteiro de linhas da composicao: matchday desenha
-- campeonato, clube, confronto e a linha de data/hora/estadio; gol, estreia e
-- contratacao desenham rotulo, nome e clube. Pelo atalho da biblioteca as
-- opcoes chegavam sem tipo nenhum — o painel de perguntas nao pergunta isso,
-- porque a arte ja existe e ja tem um —, e a composicao caia no matchday.
--
-- O resultado era o defeito que o usuario reportou: video de gol anunciando
-- data e estadio de um jogo. Nao era erro de codigo, era o roteiro errado
-- montado sem erro nenhum, que e a especie mais dificil de enxergar.
--
-- A rota ja foi corrigida e passa a gravar `pedido.tipo` por cima do que vier
-- nas opcoes. Isto aqui e a outra metade: os videos que JA estao gravados.
--
-- Sem `where`, isto reescreveria linha por linha toda vez que rodasse. Com ele,
-- so toca no que discorda — e rodar de novo nao faz nada, que e o que se espera
-- de uma migracao.
-- ---------------------------------------------------------------------------

update videos v
set opcoes = jsonb_set(coalesce(v.opcoes, '{}'::jsonb), '{tipo}', to_jsonb(p.tipo::text), true)
from pedidos p
where p.id = v.pedido_id
  and coalesce(v.opcoes->>'tipo', '') is distinct from p.tipo::text;
