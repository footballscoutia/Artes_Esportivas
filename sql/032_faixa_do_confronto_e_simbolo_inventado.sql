-- ---------------------------------------------------------------------------
-- A faixa do confronto, e o simbolo que finge ser informacao.
--
-- Duas correcoes de uma arte de matchday que acertou o resto: nome do atleta
-- inteiro, uniforme fiel, data e local num bloco so, logo completa, paleta do
-- clube liderando.
--
-- 1) O CONFRONTO SAIU CORTADO — "VASCO x [cabeca do atleta] BOFRIENSE".
--
-- A regra ja existia e foi desobedecida: "O confronto NAO passa atras do
-- atleta: os dois nomes ficam inteiros e livres, em area limpa da composicao."
-- Nao faltava exigencia. Faltava ALAVANCA. "Area limpa" e um requisito sem
-- mecanismo — nao diz onde a area limpa fica. A regra do nome do atleta, que
-- funcionou nesta mesma arte, diz: acima da cabeca, ao lado do corpo, ou no vao
-- entre as palavras. O modelo cumpriu a instrucao que trazia execucao e chutou
-- a que trazia so a cobranca.
--
-- E ha uma segunda camada, criada pela sql/031: o nome do atleta agora ocupa o
-- topo. Sobrou para o confronto a faixa imediatamente abaixo — que e a altura
-- dos ombros e da cabeca, o ponto mais largo do atleta. A correcao anterior
-- empurrou o confronto para o unico lugar ruim, e por isso esta aqui nomeia as
-- faixas em vez de repetir a proibicao.
--
-- 2) BANDEIRA DO URUGUAI NUMA ARTE VASCO x CABOFRIENSE.
--
-- Nenhum campo digitado menciona Uruguai. O modelo preencheu fundo com mapas
-- soltos e uma bandeira, e esse e o pior tipo de erro da ferramenta: nao parece
-- defeito de desenho, parece DADO. Escudo inventado ja tinha regra; bandeira,
-- brasao e mapa nao tinham. Vale para os oito tipos, porque a invencao nao
-- depende do tipo da arte.
-- ---------------------------------------------------------------------------

-- 1) Alavanca posicional do confronto. So o matchday tem confronto.
update prompts
   set texto = replace(
     texto,
$antigo$  O confronto NAO passa atras do atleta: os dois nomes ficam inteiros e livres,
  em area limpa da composicao. E a informacao principal da arte depois do
  atleta, e nome de clube pela metade nao se adivinha.$antigo$,
$novo$  O confronto NAO passa atras do atleta, e nao basta querer "area limpa": e
  preciso ESCOLHER a faixa. O atleta ocupa a coluna do meio, entao a linha do
  confronto vai numa faixa horizontal onde ele nao chega — a de CIMA, junto do
  nome do atleta e acima da cabeca dele, ou a de BAIXO, da cintura para o pe.
  Nunca na altura dos ombros e do peito, que e onde ele e mais largo: e ali que
  o nome do adversario perde as primeiras letras.
  Se os dois nomes nao couberem inteiros numa faixa livre, o par desce ou sobe
  JUNTO, ou diminui junto. O que nao pode e um nome de um lado do atleta e o
  outro do outro lado. E a informacao principal da arte depois do atleta, e nome
  de clube pela metade nao se adivinha: lido em voz alta, cada um dos dois nomes
  tem que sair completo.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';

-- 2) Simbolo inventado. Nos oito.
update prompts
   set texto = replace(
     texto,
$antigo$NAO FAZER, em nenhuma hipotese:
- Escrever qualquer palavra que nao esteja na lista de TEXTO NA ARTE.$antigo$,
$novo$NAO FAZER, em nenhuma hipotese:
- Escrever qualquer palavra que nao esteja na lista de TEXTO NA ARTE.
- Inventar simbolo que se passa por informacao: bandeira de pais, brasao de
  estado ou cidade, mapa de regiao, medalha ou taca de campeonato, numero de
  camisa, faixa de capitao. Nada disso veio nos dados, e erro assim nao parece
  erro — parece DADO, e ninguem confere. Os unicos simbolos com significado na
  arte sao os escudos enviados e a logo da agencia. Se a composicao pedir forma
  no fundo, usar forma ABSTRATA: faixa, tracado, trama, textura, recorte
  geometrico — nada que alguem consiga ler como pais, cidade ou titulo.$novo$
   ),
   atualizado_em = now();
