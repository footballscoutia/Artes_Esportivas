-- ---------------------------------------------------------------------------
-- Duas correções que a abertura do acervo tornou urgentes.
--
-- 1. O CONTEÚDO DA REFERÊNCIA ESTAVA VAZANDO.
--
-- Com o sorteio preso ao tipo, isso quase não aparecia: matchday puxava
-- referência de matchday, e o que vazasse era do mesmo assunto. Agora que
-- qualquer imagem serve a qualquer tipo, o vazamento ficou visível — um
-- matchday nascido de uma referência de contratação saiu com "WELCOME" em
-- letra gigante, uma linha em árabe e uma barra de patrocinadores no rodapé.
-- Nada disso foi pedido; tudo estava na imagem de referência.
--
-- O prompt já dizia "nao copie o conteudo dela". Genérico demais: o modelo
-- entende "conteúdo" como o assunto, não como as palavras escritas. Agora a
-- lista é nominal — palavras, idioma, logotipos, patrocinadores, escudos,
-- outras pessoas.
--
-- 2. DATA E HORA SE SEPARAM.
--
-- O código passou a derrubar o item inteiro quando um campo chega vazio, que é
-- o que impede o modelo de inventar glifo no lugar do buraco (saiu
-- "VS ≡≡ X FLAMENGO" e '" | "VASCO"' quando o clube veio nulo). Só que data e
-- hora dividiam um item: sem a hora, a data ia junto. Separados, cada um cai
-- sozinho.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.$antigo$,
$novo$Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas.
NADA do conteudo dela entra na arte: nem as palavras escritas nela, nem o
idioma em que estao, nem logotipos, patrocinadores, escudos ou pessoas que
aparecam nela. Se a referencia traz texto, ele NAO e reaproveitado — os
unicos textos da arte sao os listados abaixo.$novo$
   ),
   atualizado_em = now();

update prompts
   set texto = replace(
     texto,
$antigo$- Data e hora: "{{data}}" e "{{hora}}" — juntos, dentro de um recipiente
  grafico: tarja, pilula ou faixa enviesada, com contraste real contra o fundo.$antigo$,
$novo$- Data: "{{data}}" — dentro de um recipiente grafico: tarja, pilula ou faixa
  enviesada, com contraste real contra o fundo.
- Hora: "{{hora}}" — no mesmo recipiente da data, menor que ela.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';
