import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ticket, TicketRow, TicketItemRow, TicketStatus } from '@/types/ticket'

export interface MaterialSummaryItem {
  materialName: string
  totalWeight: number
  totalValue: number
  avgPrice: number
}

export interface MaterialSummaryResult {
  items: MaterialSummaryItem[]
  totalTickets: number
}

interface CreateItemInput {
  materialName: string
  weight: number
  price: number
}

interface CreateTicketInput {
  items: CreateItemInput[]
  total: number
  capturedImageUrl: string | null
  ocrRawText: string | null
  client?: string
  notes?: string
}

interface UpdateTicketInput {
  client?: string
  status?: TicketStatus
  total?: number
  notes?: string
}

export function useTicketDb() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTicket = useCallback(async (input: CreateTicketInput): Promise<string | null> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return null
    }

    const { data: ticketRow, error: ticketErr } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        client: input.client ?? '',
        total: input.total,
        notes: input.notes ?? '',
        captured_image_url: input.capturedImageUrl,
        ocr_raw_text: input.ocrRawText,
      })
      .select()
      .single()

    if (ticketErr || !ticketRow) {
      setError(ticketErr?.message ?? 'Failed to create ticket')
      setLoading(false)
      return null
    }

    const itemRows = input.items.map((item) => ({
      ticket_id: ticketRow.id,
      material_name: item.materialName,
      weight: item.weight,
      price: item.price,
      subtotal: item.weight * item.price,
    }))

    const { error: itemsErr } = await supabase
      .from('ticket_items')
      .insert(itemRows)

    if (itemsErr) {
      setError(itemsErr.message)
      setLoading(false)
      return null
    }

    setLoading(false)
    return ticketRow.id
  }, [])

  const getTickets = useCallback(async (limit = 50, offset = 0): Promise<{ tickets: Ticket[]; total: number }> => {
    setLoading(true)
    setError(null)

    const { data: ticketRows, error: ticketsErr, count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (ticketsErr) {
      setError(ticketsErr.message)
      setLoading(false)
      return { tickets: [], total: 0 }
    }

    if (!ticketRows || ticketRows.length === 0) {
      setLoading(false)
      return { tickets: [], total: count ?? 0 }
    }

    const ticketIds = ticketRows.map((t: TicketRow) => t.id)

    const { data: itemRows, error: itemsErr } = await supabase
      .from('ticket_items')
      .select('*')
      .in('ticket_id', ticketIds)

    if (itemsErr) {
      setError(itemsErr.message)
      setLoading(false)
      return { tickets: [], total: count ?? 0 }
    }

    const itemsByTicketId = new Map<string, TicketItemRow[]>()
    for (const item of itemRows ?? []) {
      const existing = itemsByTicketId.get(item.ticket_id) ?? []
      existing.push(item)
      itemsByTicketId.set(item.ticket_id, existing)
    }

    setLoading(false)
    return {
      tickets: ticketRows.map((t: TicketRow) => {
        const items = itemsByTicketId.get(t.id) ?? []
        return mapRowToTicket(t, items)
      }),
      total: count ?? ticketRows.length,
    }
  }, [])

  const getTicket = useCallback(async (id: string): Promise<Ticket | null> => {
    setLoading(true)
    setError(null)

    const { data: ticketRow, error: ticketErr } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketErr || !ticketRow) {
      setError(ticketErr?.message ?? 'Ticket not found')
      setLoading(false)
      return null
    }

    const { data: itemRows } = await supabase
      .from('ticket_items')
      .select('*')
      .eq('ticket_id', id)

    setLoading(false)
    return mapRowToTicket(ticketRow, itemRows ?? [])
  }, [])

  const updateTicket = useCallback(async (id: string, input: UpdateTicketInput): Promise<Ticket | null> => {
    setLoading(true)
    setError(null)

    const { data: ticketRow, error: ticketErr } = await supabase
      .from('tickets')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (ticketErr || !ticketRow) {
      setError(ticketErr?.message ?? 'Failed to update ticket')
      setLoading(false)
      return null
    }

    const { data: itemRows } = await supabase
      .from('ticket_items')
      .select('*')
      .eq('ticket_id', id)

    setLoading(false)
    return mapRowToTicket(ticketRow, itemRows ?? [])
  }, [])

  const deleteTicket = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    const { error: err } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return false
    }

    setLoading(false)
    return true
  }, [])

  const getMaterialSummary = useCallback(async (
    from: string,
    to: string
  ): Promise<MaterialSummaryResult> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return { items: [], totalTickets: 0 }
    }

    const { data: tickets, error: err } = await supabase
      .from('tickets')
      .select('id, ticket_items!inner(material_name, weight, subtotal)')
      .gte('created_at', from)
      .lt('created_at', to)
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')

    if (err) {
      setError(err.message)
      setLoading(false)
      return { items: [], totalTickets: 0 }
    }

    const matMap = new Map<string, { totalWeight: number; totalValue: number }>()

    for (const t of tickets ?? []) {
      const items = (t as any).ticket_items ?? []
      for (const item of items) {
        const prev = matMap.get(item.material_name) ?? { totalWeight: 0, totalValue: 0 }
        prev.totalWeight += item.weight
        prev.totalValue += item.subtotal
        matMap.set(item.material_name, prev)
      }
    }

    const items: MaterialSummaryItem[] = []
    for (const [materialName, data] of matMap) {
      items.push({
        materialName,
        totalWeight: Math.round(data.totalWeight * 100) / 100,
        totalValue: Math.round(data.totalValue * 100) / 100,
        avgPrice: data.totalWeight > 0 ? Math.round((data.totalValue / data.totalWeight) * 100) / 100 : 0,
      })
    }

    items.sort((a, b) => b.totalValue - a.totalValue)

    setLoading(false)
    return { items, totalTickets: tickets?.length ?? 0 }
  }, [])

  return { createTicket, getTickets, getTicket, updateTicket, deleteTicket, getMaterialSummary, loading, error }
}

function mapRowToTicket(t: TicketRow, items: TicketItemRow[]): Ticket {
  return {
    id: t.id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    client: t.client,
    status: t.status,
    total: t.total,
    notes: t.notes,
    capturedImageUrl: t.captured_image_url,
    ocrRawText: t.ocr_raw_text,
    items: items.map((i) => ({
      id: i.id,
      materialName: i.material_name,
      detectedWeight: null,
      correctedWeight: i.weight,
      price: i.price,
    })),
  }
}
