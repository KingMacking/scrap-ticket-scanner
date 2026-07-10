export interface TicketItem {
  id: string
  materialName: string
  detectedWeight: number | null
  correctedWeight: number | null
  price: number | null
  salePrice?: number | null
}

export type TicketStatus = 'pending' | 'printed' | 'cancelled'

export interface Ticket {
  id: string
  createdAt: string
  updatedAt: string
  items: TicketItem[]
  capturedImageUrl: string | null
  ocrRawText: string | null
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
  captured_image_url: string | null
  ocr_raw_text: string | null
  created_at: string
  updated_at: string
}

export interface TicketItemRow {
  id: string
  ticket_id: string
  material_name: string
  weight: number
  price: number
  sale_price: number
  subtotal: number
  created_at: string
}

export type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export interface OcrResult {
  items: Pick<TicketItem, 'materialName' | 'detectedWeight'>[]
  rawText: string
}
