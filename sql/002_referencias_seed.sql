-- ---------------------------------------------------------------------------
-- As 12 referencias (6 tipos x 2 formatos).
--
-- Isto e um ANDAIME, nao conteudo final. O prompt-mae aqui e o generico que a
-- fase 1 usava, e `imagem_url` aponta para os PNGs de mentira em public/mock/.
-- Cada combinacao precisa da arte curada de verdade e do seu proprio
-- prompt-mae, validado no AI Studio antes de virar producao — a tela
-- /admin/referencias existe para isso.
--
-- Idempotente de proposito, ao contrario do 001: da para rodar de novo sem
-- duplicar. So insere o que ainda nao existe.
-- ---------------------------------------------------------------------------

with base as (
  select
    t.tipo,
    f.formato,
    case f.formato when 'feed_4x5' then 'feed' else 'story' end as sufixo,
    t.contexto
  from (values
    ('contratacao'::tipo_post, 'Anúncio de chegada do atleta ao novo clube'),
    ('gol',                    'Comemoração de gol marcado na partida'),
    ('estreia',                'Primeira partida com a camisa do clube'),
    ('mvp',                    'Destaque da partida, melhor em campo'),
    ('aniversario',            'Felicitação de aniversário do atleta'),
    ('frase',                  'Declaração do atleta em destaque na arte')
  ) as t(tipo, contexto)
  cross join (values ('feed_4x5'::formato_arte), ('story_9x16')) as f(formato)
)
insert into referencias (tipo, formato, imagem_url, prompt_mae, versao, ativa, observacoes)
select
  b.tipo,
  b.formato,
  '/mock/ref-' || b.tipo || '-' || b.sufixo || '.png',
  'Arte promocional esportiva vertical, o atleta da foto de referencia em destaque'  || chr(10) ||
  'recortado sobre fundo com a identidade da agencia. Iluminacao dramatica de estadio,' || chr(10) ||
  'particulas de luz, profundidade de campo. Preservar fielmente rosto, tom de pele e'  || chr(10) ||
  'biotipo do atleta da foto. Nao gerar texto, nao gerar logotipos, nao gerar escudos'  || chr(10) ||
  'de clube. Deixar a faixa inferior limpa para a camada de texto.'                     || chr(10) ||
  chr(10) || 'Contexto: ' || b.contexto || '.',
  1,
  true,
  'Andaime da fase 2 — trocar pela referência curada e pelo prompt-mãe validado.'
from base b
where not exists (
  select 1 from referencias r where r.tipo = b.tipo and r.formato = b.formato and r.ativa
);
