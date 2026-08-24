-- ---------------------------------------------------------------------------
-- O fundo passa a ter lista FECHADA do que pode, no lugar da lista de proibicoes.
--
-- Segunda ocorrencia do mesmo defeito com roupa diferente. Na arte de matchday
-- foi bandeira do Uruguai e mapas; na de gol foi estatua sobre pedestal, arco
-- de aqueduto, coluna, estrelas em relevo e uma cuia de chimarrao com bomba.
-- Nenhum desses veio dos dados.
--
-- A sql/032 tratou disso com uma lista de PROIBICOES — bandeira, brasao, mapa,
-- medalha, numero de camisa — fechada por "nada que alguem consiga ler como
-- pais, cidade ou titulo". Uma cuia nao e pais, nem cidade, nem titulo. O
-- modelo nao desobedeceu: ele achou a categoria que a lista nao enumerava.
--
-- Lista de proibicao sempre tem buraco, porque o espaco do que pode ser
-- inventado e infinito e o da enumeracao nao e. Entao a regra inverte: em vez
-- de dizer o que o fundo nao pode ter, dizer o que ele PODE ter, e fechar. E o
-- mesmo movimento da sql/032 no confronto — trocar a cobranca pela alavanca,
-- so que aqui a alavanca e um repertorio finito.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$  arte sao os escudos enviados e a logo da agencia. Se a composicao pedir forma
  no fundo, usar forma ABSTRATA: faixa, tracado, trama, textura, recorte
  geometrico — nada que alguem consiga ler como pais, cidade ou titulo.$antigo$,
$novo$  arte sao os escudos enviados e a logo da agencia.
  O fundo nao e lugar de OBJETO RECONHECIVEL. Nao entra monumento, estatua,
  arco, ponte, predio, silhueta de cidade, taca, medalha, estrela de titulo,
  instrumento, utensilio, nem objeto solto de especie nenhuma — mesmo que
  combine com o clube, com a cidade ou com o esporte.
  A lista do que o fundo PODE ter e curta e fechada: faixa, filete, trama de
  linhas, textura, granulado, ruido, recorte de papel rasgado, bloco de cor,
  degrade e sombra do proprio atleta. Se nao esta nesta lista, nao entra.
  Na duvida, fundo mais vazio: espaco limpo e melhor que enfeite inventado.$novo$
   ),
   atualizado_em = now();
