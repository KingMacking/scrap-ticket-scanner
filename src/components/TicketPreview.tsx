import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'

interface PreviewItem {
  materialName: string
  weight: number
  price: number
  subtotal: number
}

interface TicketPreviewProps {
  items: PreviewItem[]
  total: number
  visible: boolean
  onToggle: () => void
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export function TicketPreview({ items, total, visible, onToggle }: TicketPreviewProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {visible ? 'Ocultar preview' : 'Ver preview del ticket'}
      </button>

      {visible && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-zinc-900 text-zinc-100 p-4 font-mono text-xs leading-relaxed select-none">
              <div className="text-center mb-2">
                <p className="text-sm font-bold uppercase tracking-wider">Scrap Scanner</p>
                <p className="text-zinc-400">{dateStr}  {timeStr}</p>
              </div>

              <div className="border-t border-dashed border-zinc-600 my-2" />

              <div className="flex justify-between uppercase tracking-wider text-zinc-400 text-[10px] font-bold mb-1">
                <span>MATERIAL</span>
                <span className="text-right">$/KG  TOTAL</span>
              </div>

              <div className="border-t border-dashed border-zinc-600 mb-1" />

              {items.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">Sin materiales</p>
              ) : (
                items.filter((i) => i.weight > 0 && i.price > 0).map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.materialName} ({item.weight} kg)</span>
                    <span className="text-right tabular-nums">{fmt(item.price)}  {fmt(item.subtotal)}</span>
                  </div>
                ))
              )}

              <div className="border-t border-dashed border-zinc-600 my-2" />

              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">$ {fmt(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
