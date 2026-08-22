-- ---------------------------------------------------------------------------
-- Como a logo entra na arte.
--
-- Até aqui só havia um jeito: o código carimbava a logo num dos quatro cantos,
-- depois que o modelo devolvia a imagem. A sql/011 explicou por que a ESCOLHA
-- do canto mora na geração e não na org — a composição muda a cada tentativa e
-- o canto livre só se sabe depois de ver a arte pronta.
--
-- Só que escolher entre quatro cantos é escolher entre quatro apostas. Quem
-- sabe onde sobra espaço é quem compôs a imagem, e quem compôs foi o modelo.
-- Daí o modo `ia`: a logo vai junto com o pedido, como referência, e o modelo
-- a integra onde couber — com a luz e a perspectiva da própria arte.
--
-- Os dois modos ficam, e não por indecisão. Eles falham de maneiras opostas:
--   `carimbo` — a logo sai EXATA, porque são os bytes originais colados por
--               cima; erra o lugar, porque o lugar foi escolhido às cegas.
--   `ia`      — acerta o lugar, porque quem escolhe viu a imagem; pode errar a
--               FORMA, porque modelo de imagem redesenha o que vê, e logo
--               redesenhada é a marca do cliente publicada errada.
--
-- Não há modo certo dos dois: há o que cada arte pede. Por isso a coluna é da
-- geração, ao lado de `posicao_logo`, e não uma configuração da agência.
-- ---------------------------------------------------------------------------

alter table geracoes
  add column if not exists logo_modo text
  check (logo_modo in ('ia', 'carimbo', 'nenhuma'));

/* As gerações antigas são todas carimbo — era o único jeito que existia. As
   que não tinham marca viram 'nenhuma' para a tela não prometer uma logo que
   não está lá. */
update geracoes
   set logo_modo = case
         when marca_id is null or posicao_logo = 'nenhuma' then 'nenhuma'
         else 'carimbo'
       end
 where logo_modo is null;

comment on column geracoes.logo_modo is
  'Como a logo entrou: ia (o modelo integrou na composição), carimbo (o código colou num canto) ou nenhuma. No modo ia a logo está nos pixels do fundo, então recompor não consegue movê-la.';
