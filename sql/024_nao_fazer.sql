-- ---------------------------------------------------------------------------
-- Um bloco de proibições, curto e no fim.
--
-- A sql/022 já mandava não copiar o conteúdo da referência, e nomeava palavras,
-- idioma, logotipos e escudos. Não segurou: duas artes de gol geradas DEPOIS
-- dela saíram com "GOAL GOAL GOAL" e "WELCOME WELCOME" repetidos ao fundo,
-- "2021/22 SIGNING" em inglês e um selo circular que ninguém enviou.
--
-- A hipótese do porquê importa mais que a correção. Para o modelo, palavra
-- repetida em contorno atrás da arte não é CONTEÚDO — é TEXTURA, e textura é
-- exatamente o que ele foi mandado imitar quando lhe pedimos o estilo da
-- referência. A proibição precisava nomear a forma, não só a origem.
--
-- E lugar importa. A regra estava num parágrafo no alto, longe do ponto em que
-- o modelo decide o que escrever. Aqui ela vai para o FIM, curta e em lista —
-- é a última coisa que ele lê antes de desenhar.
--
-- Junto, o nome do clube deixa de ser exceção. Ele é um texto pedido como os
-- outros, mas saía solto ao lado do escudo enquanto o resto ganhava
-- tratamento. Continua sem forma prescrita: o que se exige é o cuidado, não o
-- desenho.
-- ---------------------------------------------------------------------------

update prompts
   set texto = texto || $novo$

NAO FAZER, em nenhuma hipotese:
- Escrever qualquer palavra que nao esteja na lista de TEXTO NA ARTE.
- Repetir uma palavra vez apos vez como textura, padrao de fundo, marca dagua
  ou contorno atras da composicao. Se a referencia faz isso, NAO imitar: o
  padrao repetido e conteudo dela, nao estilo.
- Escrever em outro idioma. Todo texto sai em portugues, como foi pedido.
- Desenhar escudo, selo, emblema, medalha ou brasao que nao tenha sido enviado
  como imagem.
- Desenhar patrocinador, temporada, placar ou numero que nao foi pedido.$novo$,
   atualizado_em = now();

-- O nome do clube tambem e texto composto, e nao etiqueta ao lado do escudo.
update prompts
   set texto = replace(
     texto,
$antigo$- Clube: "{{clube}}" — discreto. Omitir se vier vazio.$antigo$,
$novo$- Clube: "{{clube}}" — discreto no tamanho, mas composto com o mesmo cuidado
  das outras linhas. Nunca texto solto encostado no escudo.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Selecao ou clube: "{{clube}}" — discreto. Omitir se vier vazio.$antigo$,
$novo$- Selecao ou clube: "{{clube}}" — discreto no tamanho, mas composto com o
  mesmo cuidado das outras linhas. Nunca texto solto encostado no escudo.$novo$
   ),
   atualizado_em = now();
