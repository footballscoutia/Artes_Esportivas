-- ---------------------------------------------------------------------------
-- Devolve o tratamento ao nome do atleta.
--
-- A sql/015 deu instrução de forma ao bloco de informação, e funcionou: o
-- confronto ganhou o "x" gráfico, o campeonato virou sobretítulo espaçado, a
-- data ganhou tarja. Só que o nome do atleta — que tinha a única instrução de
-- forma do prompt antigo, e por isso era a única coisa bem desenhada — ficou
-- para trás e foi absorvido pelo cabeçalho: virou mais uma linha empilhada,
-- mesma família, só menor.
--
-- A régua vale nos dois sentidos. O modelo concentra o desenho onde a descrição
-- é mais rica, então subir a régua de um bloco rebaixa o que ficou parado. A
-- correção é dizer do nome o que agora se diz do resto — incluindo, explícito,
-- onde ele NÃO deve ir.
-- ---------------------------------------------------------------------------

update referencias
   set prompt_mae = replace(
     prompt_mae,
$antigo$- Nome do atleta: "{{nome}}" — tipografia pesada, integrada a composicao.$antigo$,
$novo$- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto. Caixa alta condensada, ATRAS do atleta ou atravessando ele, com
  parte das letras encoberta pelo corpo. Nunca empilhado junto do cabecalho,
  nunca do mesmo tamanho das linhas de informacao.$novo$
   )
 where tipo = 'matchday';
