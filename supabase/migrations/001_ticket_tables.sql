-- ============================================================
-- Ticket tables for scrap-scaner
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Tickets
create table tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client text not null default '',
  status text not null default 'pending' check (status in ('pending', 'printed', 'cancelled')),
  total numeric(12,2) not null default 0,
  notes text not null default '',
  captured_image_url text,
  ocr_raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Ticket items
create table ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  material_name text not null,
  weight numeric(10,2) not null,
  price numeric(10,2) not null,
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- 3. Scans (audit trail)
create table scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_image_url text,
  raw_text text,
  success boolean not null default false,
  ticket_id uuid references tickets(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index tickets_user_id_idx on tickets(user_id);
create index tickets_created_at_idx on tickets(created_at desc);
create index ticket_items_ticket_id_idx on ticket_items(ticket_id);
create index scans_user_id_idx on scans(user_id);
create index scans_ticket_id_idx on scans(ticket_id);

-- RLS: tickets
alter table tickets enable row level security;

create policy "Users can view own tickets"
  on tickets for select
  using (auth.uid() = user_id);

create policy "Users can insert own tickets"
  on tickets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tickets"
  on tickets for update
  using (auth.uid() = user_id);

create policy "Users can delete own tickets"
  on tickets for delete
  using (auth.uid() = user_id);

-- RLS: ticket_items
alter table ticket_items enable row level security;

create policy "Users can view own ticket items"
  on ticket_items for select
  using (
    exists (
      select 1 from tickets
      where tickets.id = ticket_items.ticket_id
        and tickets.user_id = auth.uid()
    )
  );

create policy "Users can insert items to own tickets"
  on ticket_items for insert
  with check (
    exists (
      select 1 from tickets
      where tickets.id = ticket_items.ticket_id
        and tickets.user_id = auth.uid()
    )
  );

create policy "Users can delete items from own tickets"
  on ticket_items for delete
  using (
    exists (
      select 1 from tickets
      where tickets.id = ticket_items.ticket_id
        and tickets.user_id = auth.uid()
    )
  );

-- RLS: scans
alter table scans enable row level security;

create policy "Users can view own scans"
  on scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on scans for insert
  with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_updated_at
  before update on tickets
  for each row
  execute function update_updated_at_column();
