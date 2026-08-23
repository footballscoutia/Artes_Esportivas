-- ---------------------------------------------------------------------------
-- Texto atrás do atleta continua liberado — desde que dê para ler.
--
-- O recurso é bom e foi pedido de propósito: a sql/018 mandou o nome do atleta
-- ficar "ATRÁS do atleta ou atravessando ele, com parte das letras encoberta
-- pelo corpo", e foi isso que produziu o ARRASCAETA, a melhor arte até aqui.
--
-- Só que a instrução não disse até onde. Numa arte de contratação a barra do
-- clube saiu lendo "CABO___ENSE" — o corpo dele cobriu "FRI" inteiro — e o
-- sobrenome perdeu o começo atrás do cabelo. O que funciona numa palavra
-- gigante, onde sobram letras, apaga a informação numa linha curta.
--
-- A regra separa as duas situações em vez de proibir o recurso. Elemento
-- grande: pode ser coberto, desde que toda palavra continue legível. Linha
-- pequena — clube, campeonato, data: não entra atrás do atleta, porque nela
-- cobrir duas letras já é cobrir tudo.
--
-- E fecha a saída fácil: se não couber assim, mover o texto. Encolher a parte
-- visível seria trocar um problema de leitura por outro.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$- Desenhar patrocinador, temporada, placar ou numero que nao foi pedido.$antigo$,
$novo$- Desenhar patrocinador, temporada, placar ou numero que nao foi pedido.
- Deixar qualquer palavra ilegivel. Texto atras do atleta e recurso bom e esta
  liberado, mas so enquanto TODA palavra continua legivel: o corpo dele pode
  comer a beirada das letras, nunca uma letra inteira nem uma silaba. Se nao
  couber assim, MOVER o texto — nao encolher a parte visivel nem confiar que
  quem ve completa a palavra de cabeca.
- Passar linha pequena — clube, campeonato, data, estadio — atras do atleta.
  A sobreposicao e recurso para o elemento GRANDE, onde sobra palavra visivel.
  Numa linha curta, cobrir duas letras ja apaga a informacao inteira.$novo$
   ),
   atualizado_em = now();
