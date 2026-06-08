export interface TicketItem {
  id: string
  materialName: string
  detectedWeight: number | null
  correctedWeight: number | null
  price: number | null
}

export interface Ticket {
  id: string
  createdAt: Date
  items: TicketItem[]
  capturedImageUrl: string | null
}

export type OcrStatus = 'idle' | 'processing' | 'done' | 'error'

export interface OcrResult {
  items: Pick<TicketItem, 'materialName' | 'detectedWeight'>[]
  rawText: string
}
