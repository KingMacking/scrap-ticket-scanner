-- Add sale_price column to ticket_items
alter table ticket_items add column sale_price numeric(10,2) not null default 0;

-- Update summary function to include sale_price profit
create or replace function get_material_summary(user_id uuid, from_date timestamptz, to_date timestamptz)
returns table (
  material_name text,
  total_weight numeric,
  total_value numeric,
  avg_price numeric,
  total_profit numeric
) language plpgsql security definer as $$
begin
  return query
  select
    ti.material_name,
    sum(ti.weight)::numeric(12,2) as total_weight,
    sum(ti.subtotal)::numeric(12,2) as total_value,
    case when sum(ti.weight) > 0
      then (sum(ti.subtotal) / sum(ti.weight))::numeric(10,2)
      else 0
    end as avg_price,
    sum((ti.sale_price - ti.price) * ti.weight)::numeric(12,2) as total_profit
  from tickets t
  join ticket_items ti on ti.ticket_id = t.id
  where t.user_id = get_material_summary.user_id
    and t.created_at >= from_date
    and t.created_at < to_date
    and t.status <> 'cancelled'
  group by ti.material_name
  order by total_value desc;
end;
$$;
