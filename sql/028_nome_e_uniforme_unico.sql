-- ---------------------------------------------------------------------------
-- Duas correções da arte de frase.
--
-- 1. O NOME SEM TRATAMENTO, DE NOVO — e a lição se repetiu inteira.
--
-- Nessa arte o CLUBE saiu num recipiente com filetes e entreletra, e o NOME
-- saiu texto liso, mesma fonte das vizinhas, só num corpo diferente. A
-- diferença entre os dois está no prompt: a sql/025 deu ao clube a lista de
-- alavancas — caixa alta com entreletra, recipiente, filete, cor — e ao nome
-- sobrou a frase genérica "tem tratamento próprio: nunca apenas mais uma linha
-- do bloco".
--
-- É a terceira vez que o mesmo padrão aparece: a linha que NOMEIA as alavancas
-- recebe tratamento, a que só afirma que precisa de tratamento não recebe.
-- Afirmar a exigência não basta; é preciso dizer com o quê ela se cumpre.
--
-- 2. O UNIFORME EM UMA APARIÇÃO SÓ. A arte traz o atleta três vezes e só uma
-- usa o manto enviado; nas outras duas ele veste uma camisa inventada, com
-- escudo de outra liga e patrocinador que ninguém mandou. O bloco NAO FAZER já
-- proibia patrocinador inventado, mas nada dizia que o uniforme vale para
-- TODAS as aparições — e composição com o atleta repetido é comum no acervo.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$O nome do atleta tem tratamento proprio: nunca apenas mais uma linha do bloco.$antigo$,
$novo$O nome do atleta tem tratamento proprio, e nao apenas um corpo diferente:
precisa de pelo menos um entre peso contrastante com a linha vizinha, caixa
alta, entreletra aberta, recipiente, filete ou cor propria. Mesma fonte e mesmo
peso das linhas em volta, so que maior ou menor, nao e tratamento.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Desenhar patrocinador, temporada, placar ou numero que nao foi pedido.$antigo$,
$novo$- Desenhar patrocinador, temporada, placar ou numero que nao foi pedido.
- Vestir o atleta com uniformes diferentes na mesma arte. Se ele aparecer mais
  de uma vez na composicao, TODAS as aparicoes usam o mesmo uniforme enviado —
  mesmas cores, mesmo escudo, mesmos patrocinios. Uma aparicao certa e duas
  inventadas e pior que nenhuma, porque a certa da credibilidade as outras.$novo$
   ),
   atualizado_em = now();
