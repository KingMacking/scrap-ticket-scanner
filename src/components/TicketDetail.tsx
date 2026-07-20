import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useTicketDb } from '@/hooks/useTicketDb'
import { useQzTray } from '@/hooks/useQzTray'
import type { Ticket } from '@/types/ticket'
import type { PrintItem } from '@/lib/buildEscPos'
import {
  Printer, Loader2, Wifi, WifiOff, History,
} from 'lucide-react'
import { toast } from 'sonner'

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusLabel: Record<string, { label: string; color: 'secondary' | 'default' | 'destructive' }> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  printed: { label: 'Impreso', color: 'default' },
  cancelled: { label: 'Anulado', color: 'destructive' },
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getTicket, updateTicket } = useTicketDb()
  const { status: qzStatus, print: qzPrint, connect: qzConnect } = useQzTray()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const data = await getTicket(id)
    setTicket(data)
    setLoading(false)
  }, [id, getTicket])

  useEffect(() => {
    load()
  }, [load])

  const handleReprint = async () => {
    if (!ticket) return
    setIsPrinting(true)

    const printItems: PrintItem[] = ticket.items.map((i) => ({
      materialName: i.materialName,
      weight: i.correctedWeight ?? 0,
      price: i.price ?? 0,
      subtotal: (i.correctedWeight ?? 0) * (i.price ?? 0),
    }))

    try {
      await qzPrint({
        items: printItems,
        total: ticket.total,
        date: new Date(ticket.createdAt),
      })

      if (ticket.status === 'pending') {
        const updated = await updateTicket(ticket.id, { status: 'printed' })
        if (updated) setTicket(updated)
      }

      toast.success('Ticket reimpreso')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al imprimir'
      toast.error(msg)
    } finally {
      setIsPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
        <History className="size-8 opacity-30" />
        <p className="text-sm">Ticket no encontrado</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/history')}>Volver</Button>
      </div>
    )
  }

  const st = statusLabel[ticket.status] ?? statusLabel.pending

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <History className="size-5" />
        <h1 className="text-xl font-semibold">Detalle del ticket</h1>
        <Badge variant={st.color}>{st.label}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-medium tabular-nums">
              {new Date(ticket.createdAt).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {ticket.client && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{ticket.client}</span>
            </div>
          )}
          {ticket.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notas</span>
              <span className="font-medium italic">{ticket.notes}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums">$ {fmt(ticket.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Materiales ({ticket.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Precio ($/kg)</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticket.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.materialName}</TableCell>
                  <TableCell className="tabular-nums">{item.correctedWeight ?? 0}</TableCell>
                  <TableCell className="tabular-nums">$ {item.price ?? 0}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    $ {fmt((item.correctedWeight ?? 0) * (item.price ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
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

        {ticket.status !== 'cancelled' && (
          <Button onClick={handleReprint} disabled={isPrinting || qzStatus !== 'connected'}>
            {isPrinting
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Imprimiendo...</>
              : <><Printer className="size-4 mr-2" />Reimprimir</>
            }
          </Button>
        )}
      </div>
    </div>
  )
}
