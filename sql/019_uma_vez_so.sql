-- ---------------------------------------------------------------------------
-- Cada coisa uma vez só — e a forma vem da referência, não do prompt.
--
-- Duas artes de matchday saíram com o campeonato escrito duas vezes e com DOIS
-- separadores de confronto. Nenhum dos dois é teimosia do modelo: os dois são
-- buraco de instrução minha.
--
-- QUANTIDADE. A sql/015 descreveu o tratamento de cada linha e não disse
-- quantas vezes cada uma aparece. "Funcionando como sobretítulo do confronto"
-- não proíbe existir também no topo, e "o x como elemento gráfico" não diz que
-- é um só. Onde a instrução não fecha, o modelo preenche.
--
-- FORMA. Mais sutil, e mais importante. A sql/015 dizia "barra diagonal, corte
-- ou símbolo" — uma solução, não uma exigência. Prescrever a solução no prompt
-- a aplica às 59 referências de uma vez, e o acervo existe justamente para que
-- duas artes não saiam iguais. O prompt vinha por cima e achatava a variedade
-- que o sorteio deveria dar.
--
-- Só que voltar a ser vago não serve: foi a vagueza ("discretos e legíveis")
-- que produziu o bloco-legenda que a sql/015 corrigiu. A saída é separar as
-- duas coisas — o prompt fixa o PADRÃO A CUMPRIR (é elemento gráfico, não uma
-- letra solta) e manda a FORMA sair da referência desta arte.
-- ---------------------------------------------------------------------------

update referencias
   set prompt_mae = replace(
     prompt_mae,
$antigo$- Confronto: "{{clube}}" x "{{adversario}}" — a informacao principal depois do
  atleta. Os dois nomes em tipografia condensada pesada, e o "x" como elemento
  grafico proprio (barra diagonal, corte ou simbolo), nunca uma letra solta.$antigo$,
$novo$- Confronto: "{{clube}}" x "{{adversario}}" — a informacao principal depois do
  atleta. Os dois nomes em tipografia condensada pesada, NA MESMA LINHA, com UM
  unico separador entre eles. O separador nao e uma letra solta: e elemento
  grafico. A forma dele sai da referencia de estilo desta arte, e nao de um
  desenho fixo — duas artes nao devem trazer o mesmo separador.$novo$
   )
 where tipo = 'matchday';

update referencias
   set prompt_mae = replace(
     prompt_mae,
$antigo$- Campeonato: "{{campeonato}}" — caixa alta, corpo pequeno e entreletra aberta,
  funcionando como sobretitulo do confronto.$antigo$,
$novo$- Campeonato: "{{campeonato}}" — caixa alta, corpo pequeno e entreletra aberta,
  como sobretitulo do confronto. Aparece UMA vez na arte inteira.$novo$
   )
 where tipo = 'matchday';

-- A regra geral, para o que eu nao previ linha a linha.
update referencias
   set prompt_mae = replace(
     prompt_mae,
$antigo$O bloco de informacao NAO e legenda: ele e composto como parte da arte. Deve
ter recipiente, contraste de peso entre as linhas e alinhamento com a geometria
do fundo — nunca varias linhas centralizadas na mesma fonte, diferindo so no
tamanho. Uma cor de destaque do clube entra em um dos elementos do bloco.$antigo$,
$novo$O bloco de informacao NAO e legenda: ele e composto como parte da arte. Deve
ter recipiente, contraste de peso entre as linhas e alinhamento com a geometria
do fundo — nunca varias linhas centralizadas na mesma fonte, diferindo so no
tamanho. Uma cor de destaque do clube entra em um dos elementos do bloco.

Cada informacao aparece UMA unica vez na arte inteira. Nao repetir o
campeonato, o nome do atleta, o separador do confronto, a data nem os escudos
em mais de um lugar. Informacao repetida nao reforca: polui.$novo$
   )
 where tipo = 'matchday';
