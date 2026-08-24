-- ---------------------------------------------------------------------------
-- O fundo fica QUIETO, o escudo aparece uma vez, e a segunda aparicao e menor.
--
-- Regressao causada pela sql/033, e o mecanismo tem duas partes.
--
-- 1) A lista fechada virou cardapio. A 033 disse o que o fundo PODE ter —
-- faixa, filete, trama, textura, granulado, ruido, papel rasgado, bloco de cor,
-- degrade — e o modelo usou TODOS de uma vez. Antes ele tinha repertorio largo
-- e escolhia poucos elementos; depois passou a ter repertorio curto e a usar a
-- colecao inteira para preencher a mesma area. Faltou dizer que fundo e apoio,
-- nao conteudo. O "na duvida, fundo mais vazio" da 033 e criterio de desempate,
-- nao regra de densidade.
--
-- 2) O escudo virou papel de parede, e isso saiu direto da redacao. A regra diz
-- que os unicos simbolos com significado sao os escudos e a logo; a 033 proibiu
-- todo o resto. Sobrou um simbolo licenciado e um fundo grande para encher, e o
-- escudo do Vasco apareceu tres vezes em tres tamanhos. O modelo seguiu a
-- logica escrita.
--
-- Junto vai o rosto fantasma, que era observacao e virou padrao: apareceu na
-- arte de gol anterior e voltou nesta, desta vez grande o bastante para
-- competir com o rosto principal. A sql/030 so regulava a segunda aparicao em
-- relacao ao TEXTO. Agora ela e regulada em relacao a FIGURA. A composicao com
-- o atleta repetido continua liberada — o usuario gosta dela —, mas subordinada.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$  A lista do que o fundo PODE ter e curta e fechada: faixa, filete, trama de
  linhas, textura, granulado, ruido, recorte de papel rasgado, bloco de cor,
  degrade e sombra do proprio atleta. Se nao esta nesta lista, nao entra.
  Na duvida, fundo mais vazio: espaco limpo e melhor que enfeite inventado.$antigo$,
$novo$  A lista do que o fundo PODE ter e curta e fechada: faixa, filete, trama de
  linhas, textura, granulado, ruido, recorte de papel rasgado, bloco de cor,
  degrade e sombra do proprio atleta. Se nao esta nesta lista, nao entra.
  Essa lista e um TETO, nao um cardapio: o fundo usa UM ou DOIS desses recursos
  na arte inteira, nunca a colecao. Fundo e apoio, nao conteudo — fica quieto,
  secundario, mais apagado que o atleta e que o texto, e com area vazia
  sobrando. Recurso demais brigando entre si polui a arte, e arte poluida e
  defeito tao grave quanto simbolo inventado.
  O ESCUDO NAO E TEXTURA: cada escudo aparece UMA vez na arte inteira. O mesmo
  escudo repetido em tamanhos diferentes pelo quadro e enchimento de espaco,
  nao composicao — se sobrou area, ela fica vazia.
  LETRA TAMBEM NAO E TEXTURA: nenhuma palavra, sigla ou pedaco de palavra entra
  no fundo como enfeite, nem inteira nem cortada pela borda do quadro.
  Segunda aparicao do atleta continua liberada, mas SUBORDINADA: menor, mais
  apagada e claramente atras da principal. Nunca um segundo rosto do mesmo
  tamanho ao lado do primeiro — isso le como duas pessoas, nao como composicao.
  Na duvida, fundo mais vazio: espaco limpo e melhor que enfeite inventado, e
  melhor tambem que muito enfeite abstrato.$novo$
   ),
   atualizado_em = now();
