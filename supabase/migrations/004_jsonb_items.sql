-- Migrate ticket_items into tickets.items JSONB column, drop old tables
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Add items column
alter table tickets add column if not exists items jsonb not null default '[]'::jsonb;

-- 2. Migrate existing data (if any) from ticket_items
update tickets set items = (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'material_name', ti.material_name,
      'weight', ti.weight,
      'price', ti.price,
      'subtotal', ti.subtotal
    ) order by ti.created_at
  ), '[]'::jsonb)
  from ticket_items ti
  where ti.ticket_id = tickets.id
);

-- 3. Drop old columns on tickets
alter table tickets drop column if exists captured_image_url;
alter table tickets drop column if exists ocr_raw_text;

-- 4. Drop obsolete tables
drop table if exists ticket_items;
drop table if exists scans;
