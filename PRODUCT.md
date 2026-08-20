# MatchPost

Ferramenta para agências, empresários e clubes gerarem as artes promocionais
dos seus atletas sem escrever prompt nenhum.

## O que faz

O usuário cadastra uma vez o elenco (atleta + foto), os clubes (escudo, de onde
saem as cores) e as marcas (a logo dele e a dos clientes dele). Depois, gerar um
post é escolher **categoria + atleta** e pronto — a arte volta em alta, pronta
para publicar.

Oito categorias: matchday, contratação, gol, convocado, estreia, craque do jogo,
aniversário, frase.

Dois formatos: feed (1080×1350) e story (1080×1920).

## A tese

**Ninguém escreve prompt.** Cada combinação de categoria e formato já carrega
uma referência curada e um prompt-mãe escrito por quem entende do assunto. O
usuário escolhe o QUE, nunca o COMO. É isso que separa o produto de "usar o
ChatGPT": o resultado sai no padrão certo sem depender da habilidade de quem
pediu.

O escudo e a foto vão para o modelo como IMAGEM, não como descrição — escudo
descrito em texto sai inventado, e escudo inventado parece escudo. A logo é
carimbada por código depois, porque marca tem forma exata e modelo aproxima.

## Quem usa

- **Empresário / agência** — carteira de atletas, poucos usuários, publica no
  perfil da agência e no do atleta. É o caso do cliente número 1.
- **Clube** — elenco grande, marca rígida, mais gente aprovando.
- **Atleta sozinho** — ainda não atendido de propósito: quebra a etapa de
  aprovação (ele é quem aprova) e o ticket é outro. O schema já comporta, como
  uma org de um atleta só.

## Como o trabalho anda

Pedido nasce em `em_revisao`, alguém com papel `aprova` decide, vira `aprovado`
e depois `publicado`. Toda geração fica no histórico, inclusive as recusadas —
cinco recusas seguidas da mesma categoria apontam para o prompt-mãe, não para a
IA.

"Gerar outra" cria uma tentativa nova sem apagar a anterior. Trocar a logo de
canto não gasta geração: recompõe a partir do fundo cru já guardado.

## Restrições que mandam no produto

- **Cada org só enxerga a própria org.** Isolamento é RLS no banco, não `if` em
  TypeScript. Os três buckets são privados; leitura só por URL assinada curta.
- **O acervo de referência nunca aparece para o usuário.** É o que diferencia o
  trabalho; mostrar entregaria de graça.
- **O modelo precisa de projeto com billing ativo.** No tier gratuito o Google
  treina com o que sobe, e contratação não anunciada é informação confidencial
  do cliente.
- **Não existe arte real ainda.** `IMAGE_PROVIDER=mock` até a chave entrar, e o
  acervo atual veio do Pinterest — não pode ser publicado.

## Marca

**MatchPost.** Azul `#2E7CFF`, Anton nos títulos. A logo é tipografia, não
imagem: "MATCH" na cor do tema, "POST" num bloco inclinado azul.
