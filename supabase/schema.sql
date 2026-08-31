-- Sistema de Gestão de SAC - Ralston
-- Execute este script no SQL Editor do seu projeto Supabase (https://app.supabase.com)

create extension if not exists "pgcrypto";

-- Perfis dos atendentes (estende auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  cargo text not null default 'atendente' check (cargo in ('atendente','admin')),
  created_at timestamptz not null default now()
);

-- Clientes atendidos pelo SAC
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  documento text,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Categorias de chamado
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null default '#B23A2E'
);

insert into categorias (nome, cor) values
  ('Reclamação', '#B23A2E'),
  ('Dúvida', '#3B6EA5'),
  ('Sugestão', '#4C7A3B'),
  ('Elogio', '#E8912B'),
  ('Solicitação', '#6B5B95')
on conflict (nome) do nothing;

-- Chamados (tickets)
create table if not exists chamados (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  cliente_id uuid references clientes(id),
  categoria_id uuid references categorias(id),
  atendente_id uuid references auth.users(id),
  titulo text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  status text not null default 'aberto' check (status in ('aberto','em_andamento','aguardando_cliente','resolvido','fechado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_chamados_status on chamados(status);
create index if not exists idx_chamados_cliente on chamados(cliente_id);

-- Histórico de interações de cada chamado
create table if not exists interacoes (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  autor_id uuid references auth.users(id),
  mensagem text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interacoes_chamado on interacoes(chamado_id);

-- Atualiza updated_at e resolved_at automaticamente
create or replace function set_chamado_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status in ('resolvido','fechado') and old.status not in ('resolvido','fechado') then
    new.resolved_at = now();
  elsif new.status not in ('resolvido','fechado') then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chamado_timestamps on chamados;
create trigger trg_chamado_timestamps
  before update on chamados
  for each row execute function set_chamado_timestamps();

-- Cria um profile automaticamente quando um usuário se cadastra
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email));
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS: qualquer usuário autenticado (atendente da empresa) pode ler/escrever
alter table profiles enable row level security;
alter table clientes enable row level security;
alter table categorias enable row level security;
alter table chamados enable row level security;
alter table interacoes enable row level security;

create policy "profiles_select_auth" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid());

create policy "clientes_all_auth" on clientes for all to authenticated using (true) with check (true);
create policy "categorias_all_auth" on categorias for all to authenticated using (true) with check (true);
create policy "chamados_all_auth" on chamados for all to authenticated using (true) with check (true);
create policy "interacoes_all_auth" on interacoes for all to authenticated using (true) with check (true);
