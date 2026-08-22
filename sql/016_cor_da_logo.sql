-- ---------------------------------------------------------------------------
-- Cor da logo.
--
-- A logo entra com as cores do arquivo original, e o arquivo original foi feito
-- para um fundo que não é o desta arte. Logo escura sobre arte escura some;
-- logo clara sobre céu claro some igual. A assinatura da agência é justamente
-- o elemento que não pode sumir.
--
-- Guarda o que foi PEDIDO, não o que foi usado: em 'auto' a cor efetiva depende
-- da imagem, e gravar o resultado faria a mesma escolha parecer duas diferentes
-- em duas gerações do mesmo pedido. Nulo = as cores do arquivo, como sempre foi.
-- ---------------------------------------------------------------------------

alter table geracoes add column if not exists logo_cor text;

comment on column geracoes.logo_cor is
  'Cor pedida para a logo: nulo/original = o arquivo como está, auto = claro ou escuro decidido pela luminância do lugar onde ela cai, ou um hex #RRGGBB. A forma vem do alfa do arquivo; só o RGB é trocado.';
