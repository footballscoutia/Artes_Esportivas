-- ---------------------------------------------------------------------------
-- Sete correções de uma arte de matchday (Vasco x Cabofriense).
--
-- A mais importante não é nenhuma delas isolada: é que DUAS instruções minhas
-- se contradiziam dentro do mesmo prompt, e o modelo escolheu uma. Já tinha
-- acontecido com a paleta (sql/027) e aconteceu de novo aqui.
--
-- 1. NOME ILEGÍVEL. A sql/018 mandou o nome ficar "ATRÁS do atleta, com parte
-- das letras encoberta pelo corpo" — e foi ela que salvou o ARRASCAETA. A
-- sql/026 depois limitou a oclusão à beirada das letras. As duas ficaram em
-- lugares diferentes do prompt, uma incentivando e a outra restringindo, e
-- venceu a que incentiva: saiu "PHILI__PE CO____HO".
--
-- O conserto NÃO é uma terceira regra. É colocar o limite DENTRO da mesma
-- frase que oferece o recurso, para não haver duas vozes. O recurso continua
-- inteiro — só passa a vir com a condição colada nele.
--
-- 2. CONFRONTO ILEGÍVEL. "Vasco X ___ofriense". A regra da sql/026 protegia
-- as linhas PEQUENAS; o confronto não é pequeno nem é o elemento gigante, e
-- caiu no vão entre as duas.
--
-- 3. HORA E ESTÁDIO FORA DA TARJA. O prompt pedia "no mesmo recipiente", mas
-- em linhas separadas — e linha separada virou elemento separado. Agora os
-- três são um bloco só, descrito de uma vez.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto. Caixa alta condensada, ATRAS do atleta ou atravessando ele, com
  parte das letras encoberta pelo corpo. Nunca empilhado junto do cabecalho,
  nunca do mesmo tamanho das linhas de informacao.$antigo$,
$novo$- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto. Caixa alta condensada, ATRAS do atleta ou atravessando ele, com a
  beirada de algumas letras encoberta pelo corpo — e SO a beirada: toda letra
  precisa continuar reconhecivel, e nenhuma silaba pode desaparecer. Se o
  atleta cobrir mais que isso, deslocar o nome para o lado ou reduzi-lo ate
  caber legivel. Um nome pela metade nao e efeito, e defeito. Nunca empilhado
  junto do cabecalho, nunca do mesmo tamanho das linhas de informacao.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';

update prompts
   set texto = replace(
     texto,
$antigo$  grafico. A forma dele sai da referencia de estilo desta arte, e nao de um
  desenho fixo — duas artes nao devem trazer o mesmo separador.$antigo$,
$novo$  grafico. A forma dele sai da referencia de estilo desta arte, e nao de um
  desenho fixo — duas artes nao devem trazer o mesmo separador.
  O confronto NAO passa atras do atleta: os dois nomes ficam inteiros e livres,
  em area limpa da composicao. E a informacao principal da arte depois do
  atleta, e nome de clube pela metade nao se adivinha.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';

update prompts
   set texto = replace(
     texto,
$antigo$- Data: "{{data}}" — dentro de um recipiente grafico: tarja, pilula ou faixa
  enviesada, com contraste real contra o fundo.
- Hora: "{{hora}}" — no mesmo recipiente da data, menor que ela.
- Estadio: "{{estadio}}" — menor de todos, junto da data. Omitir se vier vazio.$antigo$,
$novo$- Data, hora e estadio formam UM bloco unico, dentro do MESMO recipiente
  grafico — tarja, pilula ou faixa enviesada —, com contraste real contra o
  fundo. Nenhum dos tres fica solto sobre a arte, fora do recipiente:
    "{{data}}" — a maior das tres.
    "{{hora}}" — menor que a data, colada nela.
    "{{estadio}}" — a menor de todas.
  Este bloco tambem nao passa atras do atleta.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';

-- ---------------------------------------------------------------------------
-- 4 e 5. ESCUDO REDESENHADO E RECOLORIDO. O escudo do Cabofriense saiu com
-- "CABOFRIEKEE" escrito dentro, e a cruz do Vasco apareceu numa versão dourada.
-- O escudo foi ENVIADO como imagem nos dois casos. "Reproduzir fielmente, sem
-- redesenhar" não bastou: o modelo entende recolorir e reescrever como
-- estilizar, não como redesenhar.
--
-- 6. PATROCÍNIO INVENTADO NA CAMISA. Mesmo com o uniforme enviado, saiu
-- "SODCÃO ASSORTÊNIA" e "COLECHO HRODEN" nas mangas. O NAO FAZER já proibia
-- patrocinador não pedido; faltava dizer o que fazer quando o texto do
-- uniforme não couber legível — apagar, nunca aproximar.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$- Desenhar escudo, selo, emblema, medalha ou brasao que nao tenha sido enviado
  como imagem.$antigo$,
$novo$- Desenhar escudo, selo, emblema, medalha ou brasao que nao tenha sido enviado
  como imagem.
- Mexer num escudo enviado. Ele entra como esta: mesmas cores, mesmas formas,
  mesmas letras. Nao recolorir, nao fazer versao dourada, monocromatica ou
  vazada, nao reescrever o texto de dentro dele. Se o escudo nao couber
  legivel no tamanho pretendido, aumenta-lo ou usa-lo em menos lugares —
  jamais aproximar as letras de memoria. Escudo com o nome do clube errado e
  pior que arte nenhuma.
- Escrever texto inventado sobre o uniforme. Os patrocinios e dizeres da
  camisa saem do uniforme enviado, exatamente como aparecem nele. O que nao
  couber legivel fica de fora: manga limpa e correta, manga com palavra
  aproximada e mentira que parece verdade.$novo$
   ),
   atualizado_em = now();
