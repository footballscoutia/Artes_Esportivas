-- ---------------------------------------------------------------------------
-- Cada linha tem a sua linha, e a figura de apoio pertence ao fundo.
--
-- A sql/034 acertou o que se propos: fundo quieto, escudo uma unica vez, area
-- vazia sobrando. Sobraram dois defeitos, e os dois sao de ARRANJO.
--
-- 1) O RODAPE. "Philippe Coutinho" a esquerda e "VASCO" a direita dividiram a
-- mesma altura do quadro, com uma bola no vao entre eles — e duas informacoes
-- na mesma faixa leem como uma frase so, ainda mais quebrada por um objeto no
-- meio. Junto veio um glifo solto antes do VASCO e a perna do C-cedilha de
-- GOLACO caindo sobre a linha de baixo.
--
-- O bloco COMO O TEXTO ENTRA NA ARTE descreve com cuidado o TRATAMENTO de cada
-- linha — peso, caixa, entreletra, recipiente — e nao diz uma palavra sobre
-- onde as linhas ficam umas em relacao as outras. O modelo tratou bem cada
-- linha e arranjou mal o conjunto, porque so a primeira coisa estava escrita.
--
-- 2) A FIGURA DE APOIO. A 034 pediu que a segunda aparicao fosse "menor, mais
-- apagada e claramente atras". Ela saiu menor — e igualmente nitida, saturada e
-- contrastada, flutuando na altura da cabeca principal. "Mais apagada" descreve
-- o resultado sem dizer com que recurso se chega nele. Agora a regra e de
-- CAMADA: a figura de apoio pertence ao fundo e usa o tratamento do fundo.
-- ---------------------------------------------------------------------------

-- 1) Arranjo das linhas de texto. Nos oito tipos.
update prompts
   set texto = replace(
     texto,
$antigo$Cada informacao aparece UMA unica vez na arte inteira. Informacao repetida nao
reforca: polui.$antigo$,
$novo$Cada informacao aparece UMA unica vez na arte inteira. Informacao repetida nao
reforca: polui.
Cada linha tem a SUA linha. Duas informacoes diferentes nunca dividem a mesma
altura do quadro — nem lado a lado, nem com um vao entre elas. Nome do atleta a
esquerda e clube a direita, na mesma faixa, le como uma frase so.
NADA entra dentro de um bloco de texto: bola, escudo, logo, recorte e figura
ficam FORA da area do bloco — nunca entre duas linhas, nunca entre duas
palavras, nunca no vao no meio de uma linha.
A perna do C-cedilha, do J, do Q e do g, e os acentos, contam como parte da
letra: a linha seguinte comeca depois deles, com folga. Letra grande encostando
na linha de baixo e defeito de composicao, nao aperto de espaco — se faltou
lugar, o bloco inteiro anda ou diminui junto.$novo$
   ),
   atualizado_em = now();

-- 2) A figura de apoio recebe o tratamento do fundo, nao o da figura principal.
update prompts
   set texto = replace(
     texto,
$antigo$  Segunda aparicao do atleta continua liberada, mas SUBORDINADA: menor, mais
  apagada e claramente atras da principal. Nunca um segundo rosto do mesmo
  tamanho ao lado do primeiro — isso le como duas pessoas, nao como composicao.$antigo$,
$novo$  Segunda aparicao do atleta continua liberada, mas ela pertence ao FUNDO e usa
  o tratamento do fundo: menor, mais apagada, com menos contraste e menos cor
  que a principal, fundida na fumaca, na sombra ou na textura de tras. Nunca um
  recorte nitido e saturado flutuando solto no quadro, nem um segundo rosto na
  altura do primeiro — assim os dois leem como duas pessoas coladas, e nao como
  composicao. Se ela nao puder ficar visivelmente mais apagada que a figura
  principal, e melhor nao existir.$novo$
   ),
   atualizado_em = now();

-- O matchday traz a mesma frase com um miolo proprio (lista o que nao repetir),
-- entao a ancora acima nao casa nele. Mesmo acrescimo, ancora dele.
update prompts
   set texto = replace(
     texto,
$antigo$em mais de um lugar. Informacao repetida nao reforca: polui.$antigo$,
$novo$em mais de um lugar. Informacao repetida nao reforca: polui.
Cada linha tem a SUA linha. Duas informacoes diferentes nunca dividem a mesma
altura do quadro — nem lado a lado, nem com um vao entre elas. Nome do atleta a
esquerda e clube a direita, na mesma faixa, le como uma frase so.
NADA entra dentro de um bloco de texto: bola, escudo, logo, recorte e figura
ficam FORA da area do bloco — nunca entre duas linhas, nunca entre duas
palavras, nunca no vao no meio de uma linha.
A perna do C-cedilha, do J, do Q e do g, e os acentos, contam como parte da
letra: a linha seguinte comeca depois deles, com folga. Letra grande encostando
na linha de baixo e defeito de composicao, nao aperto de espaco — se faltou
lugar, o bloco inteiro anda ou diminui junto.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';
