-- ============================================================
-- Expenses tables for scrap-scaner
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Employees (gestionable: lista de empleados)
create table employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- 2. Expense categories (gestionable: categorías de gastos operativos)
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- 3. Expenses (registros de gasto: empleado u operativo)
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('operativo', 'empleado')),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  observations text not null default '',
  expense_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index employees_user_id_idx on employees(user_id);
create index expense_categories_user_id_idx on expense_categories(user_id);
create index expenses_user_id_idx on expenses(user_id);
create index expenses_type_idx on expenses(user_id, type);
create index expenses_date_idx on expenses(user_id, expense_date desc);
create index expenses_category_idx on expenses(user_id, category);

-- RLS: employees
alter table employees enable row level security;

create policy "Users can view own employees"
  on employees for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own employees"
  on employees for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own employees"
  on employees for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own employees"
  on employees for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- RLS: expense_categories
alter table expense_categories enable row level security;

create policy "Users can view own expense categories"
  on expense_categories for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own expense categories"
  on expense_categories for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own expense categories"
  on expense_categories for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own expense categories"
  on expense_categories for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- RLS: expenses
alter table expenses enable row level security;

create policy "Users can view own expenses"
  on expenses for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert own expenses"
  on expenses for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update own expenses"
  on expenses for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete own expenses"
  on expenses for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists expenses_updated_at on expenses;
create trigger expenses_updated_at
  before update on expenses
  for each row
  execute function update_updated_at_column();
