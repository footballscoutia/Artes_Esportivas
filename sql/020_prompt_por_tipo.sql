-- ---------------------------------------------------------------------------
-- O prompt sai da referencia e passa a ser do TIPO.
--
-- O codigo ja dizia a tese, no sortearReferencia: "a referencia da o ESTILO, o
-- prompt-mae da a mensagem". So que o prompt estava guardado DENTRO de cada
-- referencia, e por isso o sorteio precisava casar o tipo — pegar a imagem de
-- uma contratacao para um matchday traria junto o prompt de contratacao, e a
-- arte sairia sem confronto, sem data, sem nada do jogo. A trava nao existia
-- porque a imagem precisava ser do tipo; existia porque o texto vinha grudado.
--
-- Separando os dois, o acervo vira o que ele sempre foi: um banco de ESTILO. E
-- o sorteio deixa de escolher entre 6 imagens de matchday feed para escolher
-- entre as 22 daquele formato.
--
-- De quebra, os 78 prompt_mae eram 5 textos duplicados 78 vezes: toda correcao
-- destes dias foi um replace em 59 linhas. Agora sao 8 linhas, uma por tipo.
--
-- OS CINCO EXISTENTES sao copiados byte a byte do que esta no banco, para nao
-- perder as correcoes das sql/015, 018 e 019.
--
-- OS TRES QUE FALTAVAM — estreia, mvp e frase — nunca tiveram prompt proprio.
-- Eles caiam no "qualquer referencia ativa" e herdavam o texto de outro tipo:
-- uma arte de frase saia pedindo confronto e data. Nasceram agora do mesmo
-- esqueleto, trocando o Contexto e o bloco de TEXTO. Sao os unicos textos deste
-- arquivo escritos por mim, e merecem sua revisao antes de virarem rotina.
-- ---------------------------------------------------------------------------

create table if not exists prompts (
  tipo tipo_post primary key,
  texto text not null,
  atualizado_em timestamptz not null default now()
);

comment on table prompts is
  'A mensagem de cada categoria. O ESTILO vem da imagem sorteada em referencias; a mensagem vem daqui. Um por tipo, e nao um por referencia.';

insert into prompts (tipo, texto) values
  ('contratacao', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: anuncio de contratacao. O acervo mostra o padrao — o atleta ja com a
camisa do novo clube, a palavra de boas-vindas dominando a arte, e o nome logo
abaixo.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — o maior elemento de texto da arte.
- Nome do atleta: "{{nome}}" — logo abaixo da chamada, pesado.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('convocado', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: convocacao para a selecao nacional. O acervo usa cores e simbolos do
pais como pano de fundo, com o atleta em primeiro plano.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — grande, no alto.
- Nome do atleta: "{{nome}}".
- Selecao ou clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('aniversario', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: felicitacao de aniversario. Tom celebrativo, atleta sorrindo quando a
foto permitir.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — grande.
- Nome do atleta: "{{nome}}" — o maior elemento.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('gol', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: comemoracao de gol. Energia alta, atleta em celebracao, cor saturada.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — dominante, ocupando a largura da arte.
- Nome do atleta: "{{nome}}".
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('matchday', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: anuncio do proximo jogo. E o formato mais comum do acervo — arte de
story, atleta em destaque, e os dados da partida organizados num bloco legivel.

TEXTO NA ARTE:
- Confronto: "{{clube}}" x "{{adversario}}" — a informacao principal depois do
  atleta. Os dois nomes em tipografia condensada pesada, NA MESMA LINHA, com UM
  unico separador entre eles. O separador nao e uma letra solta: e elemento
  grafico. A forma dele sai da referencia de estilo desta arte, e nao de um
  desenho fixo — duas artes nao devem trazer o mesmo separador.
- Nome do atleta: "{{nome}}" — o maior elemento tipografico da arte depois do
  confronto. Caixa alta condensada, ATRAS do atleta ou atravessando ele, com
  parte das letras encoberta pelo corpo. Nunca empilhado junto do cabecalho,
  nunca do mesmo tamanho das linhas de informacao.
- Campeonato: "{{campeonato}}" — caixa alta, corpo pequeno e entreletra aberta,
  como sobretitulo do confronto. Aparece UMA vez na arte inteira.
- Data e hora: "{{data}}" e "{{hora}}" — juntos, dentro de um recipiente
  grafico: tarja, pilula ou faixa enviesada, com contraste real contra o fundo.
- Estadio: "{{estadio}}" — menor de todos, junto da data. Omitir se vier vazio.

O bloco de informacao NAO e legenda: ele e composto como parte da arte. Deve
ter recipiente, contraste de peso entre as linhas e alinhamento com a geometria
do fundo — nunca varias linhas centralizadas na mesma fonte, diferindo so no
tamanho. Uma cor de destaque do clube entra em um dos elementos do bloco.

Cada informacao aparece UMA unica vez na arte inteira. Nao repetir o
campeonato, o nome do atleta, o separador do confronto, a data nem os escudos
em mais de um lugar. Informacao repetida nao reforca: polui.

Omitir qualquer campo que chegue vazio, sem deixar rotulo orfao nem espaco
reservado.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('estreia', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: estreia do atleta pela camisa do clube. Tom de comeco, expectativa,
primeira vez — nao de conquista.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — o maior elemento de texto da arte.
- Nome do atleta: "{{nome}}" — pesado, integrado a composicao.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('mvp', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: o atleta foi o destaque da partida. Tom de consagracao, luz forte
sobre ele, o resto da cena recuado.

TEXTO NA ARTE:
- Chamada: "{{rotulo}}" — o maior elemento de texto da arte.
- Nome do atleta: "{{nome}}" — pesado, integrado a composicao.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$),
  ('frase', $prompt$Arte promocional esportiva de altissima qualidade, no padrao de designer
profissional de clube de futebol. Use a imagem de referencia como guia de
ESTILO — composicao, paleta, tratamento tipografico, recortes e camadas —
nao copie o conteudo dela.

O atleta da foto enviada e o unico protagonista. Preservar fielmente rosto,
tom de pele, cabelo e biotipo. Nao idealizar, nao rejuvenescer, nao trocar a
etnia. Recorte limpo, iluminacao dramatica de estadio, profundidade de campo.

Contexto: uma declaracao do proprio atleta em destaque. Aqui quem manda na
arte e o TEXTO da frase, nao a chamada — o atleta acompanha, nao domina.

TEXTO NA ARTE:
- Frase do atleta: "{{frase}}" — o maior elemento da arte, entre aspas, em
  italico ou tipografia editorial. Quebrar em varias linhas se for longa.
- Nome do atleta: "{{nome}}" — abaixo da frase, como assinatura dela.
- Chamada: "{{rotulo}}" — pequena, acima da frase.
- Clube: "{{clube}}" — discreto. Omitir se vier vazio.

Escrever apenas os textos listados, exatamente como estao entre aspas,
respeitando acentuacao e maiusculas. Nao inventar palavra, numero, escudo de
clube nem patrocinador que nao tenha sido pedido.

Deixar o canto inferior direito limpo, sem texto e sem elemento grafico: a
logo da agencia entra ali por cima.$prompt$)
on conflict (tipo) do update set texto = excluded.texto, atualizado_em = now();

comment on column referencias.prompt_mae is
  'LEGADO: a fonte da verdade e a tabela prompts, por tipo. Mantido para historico das geracoes antigas, que apontam para a referencia e nao para o prompt.';
