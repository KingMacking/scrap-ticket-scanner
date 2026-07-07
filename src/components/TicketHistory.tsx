import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTicketDb } from '@/hooks/useTicketDb'
import { useQzTray } from '@/hooks/useQzTray'
import type { Ticket } from '@/types/ticket'
import type { PrintItem } from '@/lib/buildEscPos'
import {
  History, ArrowLeft, Printer, Loader2, Trash2,
  Wifi, WifiOff, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

interface TicketHistoryProps {
  onBack: () => void
  onViewTicket?: (ticketId: string) => void
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusLabel: Record<string, { label: string; color: 'secondary' | 'default' | 'destructive' }> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  printed: { label: 'Impreso', color: 'default' },
  cancelled: { label: 'Anulado', color: 'destructive' },
}

const PAGE_SIZE = 20

export function TicketHistory({ onBack, onViewTicket }: TicketHistoryProps) {
  const { getTickets, deleteTicket, updateTicket, loading } = useTicketDb()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const { status: qzStatus, print: qzPrint, connect: qzConnect } = useQzTray()

  const load = useCallback(async () => {
    const result = await getTickets(PAGE_SIZE, 0)
    setTickets(result.tickets)
    setTotal(result.total)
    setOffset(PAGE_SIZE)
  }, [getTickets])

  useEffect(() => {
    load()
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    const result = await getTickets(PAGE_SIZE, offset)
    setTickets((prev) => [...prev, ...result.tickets])
    setOffset((prev) => prev + PAGE_SIZE)
    setLoadingMore(false)
  }

  const handleReprint = async (t: Ticket) => {
    const printItems: PrintItem[] = t.items.map((i) => ({
      materialName: i.materialName,
      weight: i.correctedWeight ?? 0,
      price: i.price ?? 0,
      subtotal: (i.correctedWeight ?? 0) * (i.price ?? 0),
    }))

    try {
      await qzPrint({
        items: printItems,
        total: t.total,
        date: new Date(t.createdAt),
      })

      if (t.status === 'pending') {
        await updateTicket(t.id, { status: 'printed' })
        setTickets((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, status: 'printed' } : x))
        )
      }

      toast.success('Ticket reimpreso')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir'
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteTicket(id)
    if (ok) {
      setTickets((prev) => prev.filter((t) => t.id !== id))
      toast.success('Ticket eliminado')
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-5" />
          <h1 className="text-xl font-semibold">Historial de tickets</h1>
          <Badge variant="outline">{total} ticket{total !== 1 ? 's' : ''}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Volver
        </Button>
      </div>

      {/* Estado QZ Tray */}
      <div className="flex items-center gap-1.5 text-xs">
        {qzStatus === 'connected' && (
          <><Wifi className="size-3.5 text-green-600" /><span className="text-green-600">Impresora conectada</span></>
        )}
        {qzStatus === 'connecting' && (
          <><Loader2 className="size-3.5 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Conectando...</span></>
        )}
        {(qzStatus === 'disconnected' || qzStatus === 'error') && (
          <button
            type="button"
            onClick={qzConnect}
            className="flex items-center gap-1.5 text-destructive hover:underline"
          >
            <WifiOff className="size-3.5" />
            <span>QZ Tray sin conexión — reintentar</span>
          </button>
        )}
      </div>

      {/* Lista */}
      {loading && tickets.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <History className="size-8 opacity-30" />
          <p className="text-sm">Todavía no hay tickets guardados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const st = statusLabel[t.status] ?? statusLabel.pending
            return (
              <Card
                key={t.id}
                className={`${t.status === 'cancelled' ? 'opacity-60' : ''} ${onViewTicket ? 'cursor-pointer hover:ring-1 hover:ring-ring' : ''}`}
                onClick={() => onViewTicket?.(t.id)}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {new Date(t.createdAt).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </CardTitle>
                    <Badge variant={st.color}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar ticket"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <span>{t.items.length} material{t.items.length !== 1 ? 'es' : ''}</span>
                      {t.client && <div className="block">Cliente: {t.client}</div>}
                      {t.notes && <div className="block italic">{t.notes}</div>}
                      <div className="block">
                        {t.items.map((item) => (
                          <span key={item.id} className="mr-3">
                            {item.materialName}: {item.correctedWeight ?? 0} kg
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold tabular-nums">
                        $ {fmt(t.total)}
                      </span>
                      {t.status !== 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleReprint(t) }}
                          disabled={qzStatus !== 'connected'}
                        >
                          <Printer className="size-3.5 mr-1" />
                          Reimprimir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {tickets.length > 0 && tickets.length < total && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ChevronDown className="size-4 mr-2" />}
            Cargar más ({total - tickets.length} restantes)
          </Button>
        </div>
      )}
    </div>
  )
}
