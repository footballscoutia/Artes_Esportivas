-- ---------------------------------------------------------------------------
-- Duas correções da arte de gol que saiu limpa das proibições.
--
-- O bloco NAO FAZER da sql/024 funcionou: sumiram o "GOAL GOAL GOAL", o
-- "WELCOME", o inglês e o selo inventado. Sobraram dois defeitos, e nenhum é
-- do tipo que as regras anteriores alcançavam.
--
-- 1. O NOME SAIU DUAS VEZES. "Philippe" em manuscrito por cima e "Philippe
-- Coutinho" em bloco logo abaixo. Não é conteúdo vazando nem palavra usada
-- como textura — é um recurso legítimo de arte esportiva (primeiro nome em
-- manuscrito sobre o sobrenome em bloco) executado pela metade: o modelo
-- dividiu os TRATAMENTOS e esqueceu de dividir as PALAVRAS. A regra de "cada
-- informação uma vez" não pegava, porque para ele aquilo é um elemento só com
-- duas camadas.
--
-- 2. O NOME DO CLUBE CONTINUA SEM TRATAMENTO. A sql/024 pediu "composto com o
-- mesmo cuidado das outras linhas" e saiu texto na mesma fonte, mesmo peso, só
-- menor — literalmente o que o próprio prompt define como o que a arte NÃO
-- deve ser. "Mesmo cuidado" é vago: não diz o que fazer nem o que evitar.
--
-- A correção nomeia as ALAVANCAS e deixa a escolha com a referência. É a mesma
-- forma que funcionou no bloco de informação do matchday: dizer que existe
-- caixa alta com entreletra, recipiente, filete e cor — e não dizer qual usar.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$- Escrever qualquer palavra que nao esteja na lista de TEXTO NA ARTE.$antigo$,
$novo$- Escrever qualquer palavra que nao esteja na lista de TEXTO NA ARTE.
- Escrever a mesma palavra duas vezes. O nome do atleta pode ser repartido
  entre dois tratamentos diferentes — primeiro nome de um jeito, sobrenome de
  outro —, mas cada palavra aparece UMA vez: repartir e diferente de repetir.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Clube: "{{clube}}" — discreto no tamanho, mas composto com o mesmo cuidado
  das outras linhas. Nunca texto solto encostado no escudo.$antigo$,
$novo$- Clube: "{{clube}}" — discreto no tamanho, e distinguido das outras linhas por
  algo ALEM do tamanho: caixa alta com entreletra aberta, um recipiente, um
  filete ao lado, uma cor propria. Escolher um desses conforme a referencia.
  Mesma fonte e mesmo peso das linhas vizinhas, so que menor, nao serve.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Selecao ou clube: "{{clube}}" — discreto no tamanho, mas composto com o
  mesmo cuidado das outras linhas. Nunca texto solto encostado no escudo.$antigo$,
$novo$- Selecao ou clube: "{{clube}}" — discreto no tamanho, e distinguido das outras
  linhas por algo ALEM do tamanho: caixa alta com entreletra aberta, um
  recipiente, um filete ao lado, uma cor propria. Escolher um desses conforme a
  referencia. Mesma fonte e mesmo peso das vizinhas, so que menor, nao serve.$novo$
   ),
   atualizado_em = now();
