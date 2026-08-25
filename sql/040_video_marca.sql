-- ---------------------------------------------------------------------------
-- Qual marca assina o video.
--
-- A tela vinha pegando "a primeira marca ativa da org", que funciona com uma
-- marca cadastrada e mente com duas. E a marca aparece em dois lugares aqui —
-- no canto e na intro —, entao errar significa o video inteiro assinado errado.
--
-- O UNIFORME nao ganha coluna: ele nao e escolha do video, e insumo da CAMADA
-- do atleta, que ja foi gerada e nao muda mais. Guardar o id aqui sugeriria
-- que trocar o uniforme depois faria alguma diferenca — e nao faz: o atleta ja
-- esta desenhado vestindo o que vestiu.
-- ---------------------------------------------------------------------------

alter table videos add column if not exists marca_id uuid references marcas(id);

comment on column videos.marca_id is
  'Qual marca assina este video, no canto e na intro. Nulo = a primeira ativa da org.';
