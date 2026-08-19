-- ---------------------------------------------------------------------------
-- O texto passa a ser trabalho do modelo.
--
-- Ate aqui o prompt-mae mandava o contrario — "nao gerar texto" — porque nome e
-- rotulo entravam como camada de codigo por cima da arte. Texto chapado por
-- cima nao acompanha a perspectiva nem a luz da cena, e a decisao foi deixar o
-- Nano Banana desenhar a arte inteira.
--
-- A logo continua sendo camada, e por outro motivo: a marca da agencia tem
-- forma exata e o modelo nao a conhece. Por isso o prompt pede canto inferior
-- direito limpo.
--
-- Os marcadores {{nome}}, {{clube}}, {{frase}} e {{rotulo}} sao trocados pelos
-- dados do pedido antes de a chamada sair (src/lib/gerar.ts). Escreve-los aqui
-- e o que da ao curador controle sobre COMO o nome entra na cena.
--
-- Idempotente: so mexe em quem ainda tem o prompt antigo.
-- ---------------------------------------------------------------------------

update referencias
set
  prompt_mae =
    'Arte promocional esportiva vertical, o atleta da foto de referencia em destaque' || chr(10) ||
    'sobre cenario com a identidade visual da agencia. Iluminacao dramatica de estadio,' || chr(10) ||
    'particulas de luz, profundidade de campo. Preservar fielmente rosto, tom de pele e' || chr(10) ||
    'biotipo do atleta da foto — nao idealizar nem rejuvenescer.' || chr(10) ||
    chr(10) ||
    'Contexto: ' || case tipo
      when 'contratacao' then 'anuncio de chegada do atleta ao novo clube'
      when 'gol'         then 'comemoracao de gol marcado na partida'
      when 'estreia'     then 'primeira partida com a camisa do clube'
      when 'mvp'         then 'destaque da partida, melhor em campo'
      when 'aniversario' then 'felicitacao de aniversario do atleta'
      when 'frase'       then 'declaracao do atleta em destaque na arte'
    end || '.' || chr(10) ||
    chr(10) ||
    'TEXTO NA ARTE — escrever exatamente como esta entre aspas, respeitando' || chr(10) ||
    'acentuacao e maiusculas. Nao traduzir, nao abreviar, nao inventar palavra' || chr(10) ||
    'nenhuma alem destas:' || chr(10) ||
    '- Nome do atleta: "{{nome}}" — tipografia pesada e condensada, o maior' || chr(10) ||
    '  elemento de texto, no terco inferior esquerdo.' || chr(10) ||
    '- Etiqueta: "{{rotulo}}" — pequena, acima do nome, com espacamento largo' || chr(10) ||
    '  entre letras.' || chr(10) ||
    '- Clube: "{{clube}}" — discreto, alinhado a direita na mesma altura da' || chr(10) ||
    '  etiqueta. Omitir se vier vazio.' || chr(10) ||
    '- Frase do atleta: "{{frase}}" — em italico, acima da etiqueta. Omitir se' || chr(10) ||
    '  vier vazio.' || chr(10) ||
    chr(10) ||
    'Nao gerar escudo de clube, patrocinador, marca dagua nem numero de camisa' || chr(10) ||
    'inventado. Deixar o canto inferior direito limpo, sem texto e sem elemento' || chr(10) ||
    'grafico: a logo da agencia entra ali por cima, no codigo.',
  versao = versao + 1
where prompt_mae like '%Nao gerar texto%';

comment on column geracoes.fundo_url is
  'Caminho no storage do que o modelo devolveu antes do corte e da logo. Serve para separar erro do modelo de erro do acabamento, e para reaproveitar a arte se a logo mudar de lugar.';
