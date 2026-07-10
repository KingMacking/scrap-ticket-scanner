-- Add missing UPDATE policy for ticket_items
create policy "Users can update items from own tickets"
  on ticket_items for update
  using (
    exists (
      select 1 from tickets
      where tickets.id = ticket_items.ticket_id
        and tickets.user_id = auth.uid()
    )
  );
