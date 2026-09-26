-- Anexos (arquivos e fotos) nos chamados.
-- Execute no SQL Editor do seu projeto Supabase.

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

create policy "anexos_select_auth" on storage.objects
  for select to authenticated using (bucket_id = 'anexos');

create policy "anexos_insert_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'anexos');

create policy "anexos_delete_auth" on storage.objects
  for delete to authenticated using (bucket_id = 'anexos');

create table if not exists chamado_anexos (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  nome_arquivo text not null,
  caminho text not null,
  tamanho bigint,
  tipo text,
  created_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists idx_chamado_anexos_chamado on chamado_anexos(chamado_id);

alter table chamado_anexos enable row level security;
create policy "chamado_anexos_all_auth" on chamado_anexos for all to authenticated using (true) with check (true);
