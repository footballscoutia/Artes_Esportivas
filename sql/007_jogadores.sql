-- ---------------------------------------------------------------------------
-- Elenco.
--
-- A agencia trabalha com uma carteira de atletas, e ate agora a pessoa digitava
-- o nome e subia a foto a cada post. Cadastrando uma vez, gerar arte vira
-- escolher da lista.
--
-- `pedidos.nome_jogador` continua existindo e NAO vira uma leitura do elenco.
-- E denormalizacao proposital: se o atleta trocar de clube ou for removido da
-- carteira, as artes ja geradas tem que continuar contando a verdade do dia em
-- que sairam.
-- ---------------------------------------------------------------------------

create table if not exists jogadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  clube text,
  posicao text,
  /* caminho no bucket privado `fotos-jogadores`, nunca URL publica */
  foto_url text,
  /* arquivar em vez de apagar: pedido antigo aponta para ele */
  ativo boolean not null default true,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists jogadores_ativos on jogadores (nome) where ativo;

create trigger jogadores_touch before update on jogadores
  for each row execute function public.tocar_atualizado_em();

-- de qual atleta da carteira este pedido saiu. nulo para os pedidos antigos,
-- e para quem um dia gerar sem cadastrar
alter table pedidos
  add column if not exists jogador_id uuid references jogadores(id);

-- ---------------------------------------------------------------------------
-- RLS
--
-- O elenco e da equipe inteira, nao de quem cadastrou: qualquer um da agencia
-- gera post de qualquer atleta da carteira. Por isso leitura e escrita para
-- `authenticated`, sem recorte por autor.
-- ---------------------------------------------------------------------------
alter table jogadores enable row level security;

create policy "jogadores: leitura para autenticados"
  on jogadores for select to authenticated using (true);

create policy "jogadores: equipe cadastra"
  on jogadores for insert to authenticated with check (criado_por = auth.uid());

create policy "jogadores: equipe edita"
  on jogadores for update to authenticated using (true) with check (true);

comment on column jogadores.ativo is
  'Arquivado em vez de apagado. Pedido antigo referencia o jogador, e apagar quebraria o historico.';
