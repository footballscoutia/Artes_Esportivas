-- ---------------------------------------------------------------------------
-- Bandeira de clube entra na lista, e cor de rival vira proibicao.
--
-- Numa arte de gol do Vasco, com escudo desligado, o canto inferior esquerdo
-- saiu com uma bandeira listrada de VERMELHO E PRETO. Num post do Vasco isso
-- le como Flamengo — o maior rival. E a versao mais grave do defeito de
-- invencao: nao e enfeite errado, e identidade de outro clube.
--
-- Dois buracos deixaram passar:
--
-- 1) A sql/032 proibiu "bandeira de PAIS". Bandeira de clube, bandeirao de
-- torcida, cachecol e camisa pendurada nao estavam em lista nenhuma.
--
-- 2) A lista do que o fundo PODE ter (sql/033) inclui "recorte de papel
-- rasgado" e "bloco de cor". Uma forma listrada num canto passa por isso sem
-- violar a letra da regra.
--
-- O primeiro conserto e de enumeracao e sempre tera buraco — foi por isso que a
-- 033 ja tinha invertido para lista fechada. O segundo e o que importa: a regra
-- passa a ser de COR, nao de objeto. Par de cores reconhecivel le como time,
-- qualquer que seja a forma que o carregue, e nenhuma lista de objetos alcanca
-- isso. Uma faixa vermelha e preta e tao Flamengo quanto uma bandeira.
--
-- Vale para os oito tipos: rival nao depende do tipo da arte.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$instrumento, utensilio, nem objeto solto de especie nenhuma — mesmo que
  combine com o clube, com a cidade ou com o esporte.$antigo$,
$novo$instrumento, utensilio, nem objeto solto de especie nenhuma — mesmo que
  combine com o clube, com a cidade ou com o esporte. Bandeira entra nessa
  proibicao em qualquer versao: de pais, de estado, de clube, bandeirao de
  torcida, faixa, cachecol, camisa pendurada e mosaico de arquibancada.
  E COR DE OUTRO CLUBE NAO ENTRA NA ARTE. Esta regra vale acima da lista de
  formas permitidas: uma faixa, uma trama ou um bloco de cor sao permitidos pela
  FORMA, e ainda assim proibidos se trouxerem o par de cores de outro time.
  Par de cores reconhecivel le como identidade de clube seja qual for o objeto
  que o carregue — vermelho e preto listrado, verde e branco, tricolor, preto e
  branco listrado. Num post de clube, vestir a arte com as cores do rival e o
  erro mais grave que existe: nao parece defeito de desenho, parece o time
  errado. As cores da composicao saem dos clubes DESTA arte e da referencia de
  estilo, e de mais lugar nenhum. Na duvida, tirar a cor e deixar o espaco
  neutro.$novo$
   ),
   atualizado_em = now();
