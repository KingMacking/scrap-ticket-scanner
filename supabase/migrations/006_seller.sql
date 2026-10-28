-- ============================================================
-- Seller data (DNI) on tickets for scrap-scaner
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================
-- Datos opcionales del vendedor. La direccion se guarda como texto libre,
-- tal cual aparece en el dorso del DNI.

alter table public.tickets
  add column if not exists seller_dni text not null default '',
  add column if not exists seller_name text not null default '',
  add column if not exists seller_address text not null default '',
  add column if not exists seller_captured_at timestamptz;

-- Busqueda por DNI dentro de cada usuario
create index if not exists tickets_user_seller_dni_idx
  on public.tickets (user_id, seller_dni);
