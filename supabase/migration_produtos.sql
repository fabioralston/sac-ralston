-- Migração: cadastro de produtos + vínculo com chamados
-- Execute no SQL Editor do seu projeto Supabase (rode só isto, não precisa rodar o schema.sql de novo).

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table chamados add column if not exists produto_id uuid references produtos(id);
create index if not exists idx_chamados_produto on chamados(produto_id);

alter table produtos enable row level security;
create policy "produtos_all_auth" on produtos for all to authenticated using (true) with check (true);
