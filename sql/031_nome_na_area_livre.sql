-- ---------------------------------------------------------------------------
-- O nome vai para a área LIVRE, em vez de contar com pouca oclusão.
--
-- Terceira falha seguida da mesma regra, e a sql/030 mudou o quadro o
-- suficiente para revelar por quê. Ela tirou as aparições de apoio da frente do
-- texto e funcionou: agora só a figura principal cobre. Mas o nome continuou
-- ilegível — "PHILI__PE CO__INHO" —, e desta vez é o atleta em destaque, o
-- único que TEM licença para encostar.
--
-- O problema é geométrico, não de obediência. A instrução manda o nome ficar
-- "ATRÁS do atleta ou atravessando ele" e depois pede que só a beirada das
-- letras seja coberta. Com o nome em duas linhas centralizadas e o atleta no
-- meio do quadro, as duas coisas não cabem juntas: o tronco dele cai
-- exatamente sobre o miolo das duas linhas. Nenhuma dose de "seja legível"
-- resolve uma composição que já nasce impossível.
--
-- Então a instrução passa a ser de POSIÇÃO. O nome procura onde o atleta não
-- está — acima da cabeça, ao lado do corpo, ou repartido de forma que o atleta
-- caia no vão entre as palavras. Foi assim que o ARRASCAETA funcionou: o nome
-- era largo, e a cabeça cobria uma fração pequena de uma linha só.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto. Caixa alta condensada, ATRAS do atleta ou atravessando ele, com a
  beirada de algumas letras encoberta pelo corpo — e SO a beirada: toda letra
  precisa continuar reconhecivel, e nenhuma silaba pode desaparecer. Isso vale
  para QUALQUER aparicao do atleta: se ele aparecer duas ou tres vezes na
  composicao, as figuras de apoio nao entram na frente do nome. Elas ficam ao
  lado, atras ou abaixo dele — quem pode encostar no nome, e so pela beirada, e
  a figura principal.$antigo$,
$novo$- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto, em caixa alta condensada, atras do atleta.
  POSICIONAR onde o atleta NAO esta: acima da cabeca dele, ao lado do corpo, ou
  repartido de modo que ele caia no VAO entre as palavras. O tronco dele nunca
  cai sobre o miolo das linhas — e ali que as letras somem.
  Encostar so na beirada, e so a figura principal. Se ele aparecer duas ou tres
  vezes na composicao, as figuras de apoio ficam ao lado, atras ou abaixo do
  nome, nunca por cima.
  O teste e simples: lido em voz alta, o nome tem que sair inteiro. Se faltar
  uma letra, o nome esta no lugar errado — mover, nao encolher.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';
