-- ---------------------------------------------------------------------------
-- O bloco de informação do matchday passa a ter tratamento, não só tamanho.
--
-- Nas artes geradas, o nome do atleta saía composto — peso, corte, camada atrás
-- da foto — e o bloco de confronto saía como legenda: tudo centralizado, mesma
-- fonte, hierarquia só por corpo. Parecia digitado ao lado de algo desenhado.
--
-- O motivo estava no próprio prompt, e o modelo não desobedeceu: obedeceu. O
-- nome do atleta era a ÚNICA linha com instrução de forma ("tipografia pesada,
-- integrada à composição"). Todo o resto era descrito por recato — "pequeno",
-- "discretos e legíveis", "menor de todos". Pedimos discrição e recebemos
-- discrição.
--
-- A correção não é pedir "mais bonito", que não é instrução. É nomear as três
-- alavancas que fazem um bloco de informação parecer desenhado:
--   recipiente        — a informação mora dentro de algo, não flutua;
--   contraste de peso — condensada pesada contra leve, não só corpos diferentes;
--   entreletra aberta — nos rótulos pequenos, o sinal tipográfico mais barato.
--
-- Só matchday. É um teste: o Arrascaeta já existe como termo de comparação, e
-- propagar para os outros seis tipos antes de ver uma arte lado a lado seria
-- apostar o acervo inteiro num palpite meu.
--
-- REVERTER: o mesmo replace com os argumentos trocados de lugar.
-- ---------------------------------------------------------------------------

update referencias
   set prompt_mae = replace(
     prompt_mae,
$antigo$- Confronto: "{{clube}}" x "{{adversario}}" — o par de times e a informacao
  principal depois do atleta.
- Nome do atleta: "{{nome}}" — tipografia pesada, integrada a composicao.
- Campeonato: "{{campeonato}}" — pequeno, acima ou ao lado do confronto.
- Data e hora: "{{data}}" e "{{hora}}" — juntos, discretos e legiveis.
- Estadio: "{{estadio}}" — menor de todos. Omitir se vier vazio.$antigo$,
$novo$- Confronto: "{{clube}}" x "{{adversario}}" — a informacao principal depois do
  atleta. Os dois nomes em tipografia condensada pesada, e o "x" como elemento
  grafico proprio (barra diagonal, corte ou simbolo), nunca uma letra solta.
- Nome do atleta: "{{nome}}" — tipografia pesada, integrada a composicao.
- Campeonato: "{{campeonato}}" — caixa alta, corpo pequeno e entreletra aberta,
  funcionando como sobretitulo do confronto.
- Data e hora: "{{data}}" e "{{hora}}" — juntos, dentro de um recipiente
  grafico: tarja, pilula ou faixa enviesada, com contraste real contra o fundo.
- Estadio: "{{estadio}}" — menor de todos, junto da data. Omitir se vier vazio.

O bloco de informacao NAO e legenda: ele e composto como parte da arte. Deve
ter recipiente, contraste de peso entre as linhas e alinhamento com a geometria
do fundo — nunca varias linhas centralizadas na mesma fonte, diferindo so no
tamanho. Uma cor de destaque do clube entra em um dos elementos do bloco.$novo$
   )
 where tipo = 'matchday';
