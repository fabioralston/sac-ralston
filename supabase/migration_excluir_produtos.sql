-- Permite excluir produtos: chamados antigos vinculados ficam sem produto (não são apagados).
-- Execute no SQL Editor do seu projeto Supabase.

alter table chamados drop constraint if exists chamados_produto_id_fkey;
alter table chamados
  add constraint chamados_produto_id_fkey
  foreign key (produto_id) references produtos(id) on delete set null;
