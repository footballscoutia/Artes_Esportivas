-- ---------------------------------------------------------------------------
-- Três correções vindas das artes de estreia, MVP e frase.
--
-- A frase saiu certa e valida o prompt que eu tinha escrito sem teste. As
-- outras duas expuseram brechas diferentes.
--
-- 1. LETRA SOBREPOSTA. Na estreia, os dois "R" de PRIMEIRO saíram com uma
-- letra cursiva desenhada POR CIMA da letra em bloco. É a mesma falha do
-- "Philippe Philippe", mas um nível abaixo: a regra dizia que cada PALAVRA
-- aparece uma vez, e o modelo achou a brecha na LETRA.
--
-- 2. OCLUSÃO POR MÃO. No MVP, "MELHOR EM CAMPO" ficou atrás do atleta e as
-- MÃOS dele — na altura do rosto, numa pose que a regra não previu — cobriram
-- letras inteiras. A sql/026 falava em "o corpo dele", e corpo não cobre mão,
-- braço, cabelo nem bola. A instrução era estreita demais.
--
-- 3. PALETA. A estreia saiu preta e cinza com o Cabofriense, que é verde. E
-- aqui a culpa não é do contexto que escrevi: o cabeçalho manda usar a
-- referência como guia de ESTILO e lista "paleta" entre os itens, enquanto o
-- bloco de clubes manda a paleta sair das cores do clube. Duas instruções
-- opostas no mesmo prompt, e venceu a que estava mais perto do começo.
--
-- O conserto não é reforçar um dos lados: é tirar a ambiguidade. A referência
-- perde a paleta e mantém composição, tipografia e camadas; a cor passa a ter
-- dono único, com regra explícita para quando não houver cor informada.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas.$antigo$,
$novo$Use a imagem de referencia como guia de
ESTILO — composicao, tratamento tipografico, recortes e camadas.
A PALETA nao vem dela: havendo cores de clube informadas mais abaixo, sao elas
que mandam no fundo, nas faixas e nos destaques, por mais escura ou clara que
a referencia seja. So quando nenhuma cor for informada a paleta pode sair da
referencia.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Escrever a mesma palavra duas vezes. O nome do atleta pode ser repartido
  entre dois tratamentos diferentes — primeiro nome de um jeito, sobrenome de
  outro —, mas cada palavra aparece UMA vez: repartir e diferente de repetir.$antigo$,
$novo$- Escrever a mesma palavra, ou a mesma LETRA, duas vezes. O nome do atleta pode
  ser repartido entre dois tratamentos — primeiro nome de um jeito, sobrenome
  de outro —, mas cada palavra e cada letra aparece UMA vez: repartir e
  diferente de repetir. Duas letras sobrepostas, uma cursiva por cima de uma em
  bloco, e defeito de desenho e nao estilo.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$  liberado, mas so enquanto TODA palavra continua legivel: o corpo dele pode
  comer a beirada das letras, nunca uma letra inteira nem uma silaba.$antigo$,
$novo$  liberado, mas so enquanto TODA palavra continua legivel: o atleta pode comer
  a beirada das letras — com o corpo, o braco, a MAO, o cabelo ou a bola,
  qualquer parte dele —, nunca uma letra inteira nem uma silaba.$novo$
   ),
   atualizado_em = now();
