export interface TicketItemJson {
  material_name: string
  weight: number
  price: number
  subtotal: number
}

export interface TicketItem {
  id: string
  materialName: string
  detectedWeight: number | null
  correctedWeight: number | null
  price: number | null
}

export type TicketStatus = 'pending' | 'printed' | 'cancelled'

export interface Ticket {
  id: string
  createdAt: string
  updatedAt: string
  items: TicketItem[]
  client: string
  status: TicketStatus
  total: number
  notes: string
}

export interface TicketRow {
  id: string
  user_id: string
  client: string
  status: TicketStatus
  total: number
  notes: string
  items: TicketItemJson[]
  created_at: string
  updated_at: string
}

export type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export interface OcrResult {
  items: Pick<TicketItem, 'materialName' | 'detectedWeight'>[]
  rawText: string
}
