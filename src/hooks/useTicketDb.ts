import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ticket, TicketRow, TicketItemJson, TicketStatus } from '@/types/ticket'
import type { PricesMap } from './usePrices'

export interface MaterialSummaryItem {
  materialName: string
  totalWeight: number
  totalValue: number
  totalProfit: number
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
  client?: string
  notes?: string
}

interface UpdateTicketInput {
  client?: string
  status?: TicketStatus
  total?: number
  notes?: string
}

export type TicketSortKey = 'created_at' | 'total'
export type TicketSortDir = 'asc' | 'desc'

export interface GetTicketsOptions {
  limit?: number
  offset?: number
  from?: string
  to?: string
  material?: string
  sortBy?: TicketSortKey
  sortDir?: TicketSortDir
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

    const itemsJson: TicketItemJson[] = input.items
      .filter((item) => item.weight > 0 && item.price > 0)
      .map((item) => ({
        material_name: item.materialName,
        weight: item.weight,
        price: item.price,
        subtotal: item.weight * item.price,
      }))

    if (itemsJson.length === 0) {
      setError('No valid items')
      setLoading(false)
      return null
    }

    const total = itemsJson.reduce((sum, i) => sum + i.subtotal, 0)

    const { data: ticketRow, error: ticketErr } = await supabase
      .from('tickets')
      .insert({
        user_id: user.id,
        client: input.client ?? '',
        total,
        notes: input.notes ?? '',
        items: itemsJson,
      })
      .select()
      .single()

    if (ticketErr || !ticketRow) {
      setError(ticketErr?.message ?? 'Failed to create ticket')
      setLoading(false)
      return null
    }

    setLoading(false)
    return ticketRow.id
  }, [])

  const getTickets = useCallback(async (opts: GetTicketsOptions = {}): Promise<{ tickets: Ticket[]; total: number }> => {
    const { limit = 50, offset = 0, from, to, material, sortBy = 'created_at', sortDir = 'desc' } = opts
    setLoading(true)
    setError(null)

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lt('created_at', to)
    if (material) query = query.contains('items', [{ material_name: material }])

    const { data: ticketRows, error: ticketsErr, count } = await query
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(offset, offset + limit - 1)

    if (ticketsErr) {
      setError(ticketsErr.message)
      setLoading(false)
      return { tickets: [], total: 0 }
    }

    setLoading(false)
    return {
      tickets: (ticketRows ?? []).map(mapRowToTicket),
      total: count ?? ticketRows?.length ?? 0,
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

    setLoading(false)
    return mapRowToTicket(ticketRow)
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

    setLoading(false)
    return mapRowToTicket(ticketRow)
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
    to: string,
    prices?: PricesMap
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
      .select('items')
      .gte('created_at', from)
      .lt('created_at', to)
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')

    if (err) {
      setError(err.message)
      setLoading(false)
      return { items: [], totalTickets: 0 }
    }

    const matMap = new Map<string, { totalWeight: number; totalValue: number; totalProfit: number }>()

    for (const t of tickets ?? []) {
      const items = (t as any).items as TicketItemJson[] ?? []
      for (const item of items) {
        const prev = matMap.get(item.material_name) ?? { totalWeight: 0, totalValue: 0, totalProfit: 0 }
        prev.totalWeight += item.weight
        prev.totalValue += item.subtotal
        const salePrice = prices?.[item.material_name]?.sale ?? 0
        prev.totalProfit += Math.max(0, salePrice - item.price) * item.weight
        matMap.set(item.material_name, prev)
      }
    }

    const items: MaterialSummaryItem[] = []
    for (const [materialName, data] of matMap) {
      items.push({
        materialName,
        totalWeight: Math.round(data.totalWeight * 100) / 100,
        totalValue: Math.round(data.totalValue * 100) / 100,
        totalProfit: Math.round(data.totalProfit * 100) / 100,
        avgPrice: data.totalWeight > 0 ? Math.round((data.totalValue / data.totalWeight) * 100) / 100 : 0,
      })
    }

    items.sort((a, b) => b.totalValue - a.totalValue)

    setLoading(false)
    return { items, totalTickets: tickets?.length ?? 0 }
  }, [])

  const getRecentTickets = useCallback(async (limit = 10): Promise<Ticket[]> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return []
    }

    const { data: ticketRows, error: err } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (err) {
      setError(err.message)
      setLoading(false)
      return []
    }

    setLoading(false)
    return (ticketRows ?? []).map(mapRowToTicket)
  }, [])

  const getDailyTotals = useCallback(async (from: string, to: string): Promise<{ day: string; total: number }[]> => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return []
    }

    const { data: tickets, error: err } = await supabase
      .from('tickets')
      .select('total, created_at')
      .gte('created_at', from)
      .lt('created_at', to)
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')

    if (err) {
      setError(err.message)
      setLoading(false)
      return []
    }

    const dailyMap = new Map<string, number>()
    for (const t of tickets ?? []) {
      const day = (t as any).created_at.slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + (t as any).total)
    }

    const result: { day: string; total: number }[] = []
    const current = new Date(from)
    const end = new Date(to)
    while (current < end) {
      const key = current.toISOString().slice(0, 10)
      result.push({
        day: String(current.getDate()),
        total: dailyMap.get(key) ?? 0,
      })
      current.setDate(current.getDate() + 1)
    }

    setLoading(false)
    return result
  }, [])

  return { createTicket, getTickets, getTicket, updateTicket, deleteTicket, getMaterialSummary, getRecentTickets, getDailyTotals, loading, error }
}

let itemIdCounter = 0

function mapRowToTicket(t: TicketRow): Ticket {
  const items = (t.items ?? []).map((i) => ({
    id: `item-${++itemIdCounter}`,
    materialName: i.material_name,
    detectedWeight: null,
    correctedWeight: i.weight,
    price: i.price,
  }))

  return {
    id: t.id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    client: t.client,
    status: t.status,
    total: t.total,
    notes: t.notes,
    items,
  }
}
