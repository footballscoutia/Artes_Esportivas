-- ---------------------------------------------------------------------------
-- Categorias novas.
--
-- Roda SOZINHO: o Postgres nao deixa usar um valor de enum na mesma transacao
-- em que ele foi criado. O resto da mudanca esta no 006.
-- ---------------------------------------------------------------------------
alter type tipo_post add value if not exists 'matchday';
alter type tipo_post add value if not exists 'convocado';
