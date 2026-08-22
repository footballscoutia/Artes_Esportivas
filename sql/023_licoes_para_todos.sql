-- ---------------------------------------------------------------------------
-- As lições do matchday valem para os outros sete tipos.
--
-- As sql/015, 018 e 019 foram aprendidas numa categoria só, de propósito: era
-- teste, e propagar antes de ver uma arte lado a lado seria apostar o acervo
-- num palpite. O matchday validou — a arte do Arrascaeta saiu com bloco de
-- informação desenhado, nome tratado, um separador só e um campeonato só.
--
-- Só que agora o acervo é compartilhado: uma referência de contratação gera um
-- matchday e vice-versa. Manter as lições em um tipo só passou a ser incoerente
-- — a mesma imagem produziria arte bem resolvida num tipo e legenda no outro.
--
-- O que vai aqui é o PADRÃO, não a solução. Foi a lição mais cara destes dias:
-- descrever a solução ("barra diagonal, corte ou símbolo") aplica o mesmo
-- desenho a todas as referências e achata a variedade que o acervo existe para
-- dar; descrever a exigência ("é elemento gráfico, não uma letra solta") deixa
-- a forma com a referência. Ser vago demais produz legenda; ser específico
-- demais produz clone. O ponto certo é dizer o padrão e devolver a forma.
--
-- A regra do texto inteiro vai para os OITO: uma arte saiu com "CAMPEONATO
-- BRASILEIR", cortado no meio da palavra por falta de espaço. Diminuir o corpo
-- ou abreviar são saídas; cortar a palavra não é.
-- ---------------------------------------------------------------------------

-- Nos oito: nenhum texto sai pela metade.
update prompts
   set texto = replace(
     texto,
$antigo$Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.$antigo$,
$novo$Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Todo texto pedido aparece INTEIRO. Se nao couber no espaco, diminuir o corpo
ou abreviar — nunca cortar a palavra pela metade nem deixar letra de fora.$novo$
   ),
   atualizado_em = now();

-- Nos sete que ainda tratavam o texto como legenda.
update prompts
   set texto = replace(
     texto,
$antigo$Escrever apenas os textos listados, exatamente como estao entre aspas,$antigo$,
$novo$COMO O TEXTO ENTRA NA ARTE:
Nenhuma dessas linhas e legenda. Cada uma e composta como parte do desenho —
com recipiente, contraste de peso ou entreletra que a distinga das vizinhas.
Varias linhas centralizadas na mesma fonte, diferindo so no tamanho, e
exatamente o que esta arte NAO deve ser.
O nome do atleta tem tratamento proprio: nunca apenas mais uma linha do bloco.
A forma de cada elemento sai da referencia de estilo desta arte, e nao de um
desenho fixo — duas artes nao devem resolver o mesmo elemento do mesmo jeito.
Cada informacao aparece UMA unica vez na arte inteira. Informacao repetida nao
reforca: polui.

Escrever apenas os textos listados, exatamente como estao entre aspas,$novo$
   ),
   atualizado_em = now()
 where tipo <> 'matchday';
