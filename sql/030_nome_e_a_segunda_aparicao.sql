-- ---------------------------------------------------------------------------
-- A regra de legibilidade não conhecia a segunda aparição do atleta.
--
-- Duas artes seguidas saíram com "PHILI_E CO__INHO". A sql/029 já tinha colado
-- o limite dentro da própria frase que oferece o recurso, e ainda assim falhou
-- — mas por um motivo que só ficou visível olhando QUEM cobre as letras.
--
-- Não é o atleta em destaque. É a SEGUNDA aparição dele: as composições do
-- acervo colocam o mesmo jogador duas ou três vezes, e a figura de corpo
-- inteiro no meio passa por cima do nome. A instrução falava em "o corpo dele",
-- no singular, escrita pensando num atleta só. A regra simplesmente não sabia
-- que havia mais de um.
--
-- Por isso a correção é de ALCANCE, não de força. Repetir "seja legível" mais
-- alto não resolveria: o modelo estava obedecendo à regra que existia, para o
-- atleta que a regra descrevia.
--
-- A composição com o atleta repetido continua liberada — o usuário já disse
-- que gosta dela. O que muda é que as aparições de apoio não têm licença para
-- entrar na frente do nome.
-- ---------------------------------------------------------------------------

update prompts
   set texto = replace(
     texto,
$antigo$  beirada de algumas letras encoberta pelo corpo — e SO a beirada: toda letra
  precisa continuar reconhecivel, e nenhuma silaba pode desaparecer.$antigo$,
$novo$  beirada de algumas letras encoberta pelo corpo — e SO a beirada: toda letra
  precisa continuar reconhecivel, e nenhuma silaba pode desaparecer. Isso vale
  para QUALQUER aparicao do atleta: se ele aparecer duas ou tres vezes na
  composicao, as figuras de apoio nao entram na frente do nome. Elas ficam ao
  lado, atras ou abaixo dele — quem pode encostar no nome, e so pela beirada, e
  a figura principal.$novo$
   ),
   atualizado_em = now()
 where tipo = 'matchday';

-- Nos outros sete a regra geral tambem falava so em "o atleta", no singular.
update prompts
   set texto = replace(
     texto,
$antigo$  liberado, mas so enquanto TODA palavra continua legivel: o atleta pode comer
  a beirada das letras — com o corpo, o braco, a MAO, o cabelo ou a bola,
  qualquer parte dele —, nunca uma letra inteira nem uma silaba.$antigo$,
$novo$  liberado, mas so enquanto TODA palavra continua legivel: o atleta pode comer
  a beirada das letras — com o corpo, o braco, a MAO, o cabelo ou a bola,
  qualquer parte dele —, nunca uma letra inteira nem uma silaba. Se o atleta
  aparecer mais de uma vez na composicao, so a figura PRINCIPAL pode encostar
  no texto; as de apoio ficam ao lado, atras ou abaixo, nunca por cima.$novo$
   ),
   atualizado_em = now();
