import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTicketDb, type TicketSortKey, type TicketSortDir } from '@/hooks/useTicketDb'
import { useQzTray } from '@/hooks/useQzTray'
import { usePrices } from '@/hooks/usePrices'
import type { Ticket } from '@/types/ticket'
import type { PrintItem } from '@/lib/buildEscPos'
import {
  History, Printer, Loader2, Trash2,
  Wifi, WifiOff, ChevronDown, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const statusLabel: Record<string, { label: string; color: 'secondary' | 'default' | 'destructive' }> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  printed: { label: 'Impreso', color: 'default' },
  cancelled: { label: 'Anulado', color: 'destructive' },
}

const PAGE_SIZE = 20

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function todayEnd(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}
function weekStart(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function monthStart(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}
function monthEnd(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}
function noFilter(): { from: Date | null; to: Date | null } {
  return { from: null, to: null }
}

const sortOptions: { key: TicketSortKey; dir: TicketSortDir; label: string }[] = [
  { key: 'created_at', dir: 'desc', label: 'Más recientes' },
  { key: 'created_at', dir: 'asc', label: 'Más antiguos' },
  { key: 'total', dir: 'desc', label: 'Boleta más cara' },
  { key: 'total', dir: 'asc', label: 'Boleta más barata' },
]

export function TicketHistory() {
  const navigate = useNavigate()
  const { getTickets, deleteTicket, updateTicket, loading } = useTicketDb()
  const { allMaterials } = usePrices()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const { status: qzStatus, print: qzPrint, connect: qzConnect } = useQzTray()

  const [fromDate, setFromDate] = useState<Date | null>(todayStart())
  const [toDate, setToDate] = useState<Date | null>(todayEnd())
  const [material, setMaterial] = useState('all')
  const [sortIdx, setSortIdx] = useState(0)

  const preset = (mode: 'today' | 'week' | 'month' | 'all') => {
    if (mode === 'all') {
      const { from, to } = noFilter()
      setFromDate(from)
      setToDate(to)
      return
    }
    if (mode === 'today') {
      setFromDate(todayStart())
      setToDate(todayEnd())
      return
    }
    if (mode === 'week') {
      setFromDate(weekStart())
      setToDate(todayEnd())
      return
    }
    setFromDate(monthStart())
    setToDate(monthEnd())
  }

  const load = useCallback(async () => {
    const from = fromDate ? fromDate.toISOString() : undefined
    const to = toDate ? toDate.toISOString() : undefined
    const result = await getTickets({
      limit: PAGE_SIZE,
      offset: 0,
      from,
      to,
      material: material === 'all' ? undefined : material,
      sortBy: sortOptions[sortIdx].key,
      sortDir: sortOptions[sortIdx].dir,
    })
    setTickets(result.tickets)
    setTotal(result.total)
    setOffset(PAGE_SIZE)
  }, [getTickets, fromDate, toDate, material, sortIdx])

  useEffect(() => {
    load()
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    const from = fromDate ? fromDate.toISOString() : undefined
    const to = toDate ? toDate.toISOString() : undefined
    const result = await getTickets({
      limit: PAGE_SIZE,
      offset,
      from,
      to,
      material: material === 'all' ? undefined : material,
      sortBy: sortOptions[sortIdx].key,
      sortDir: sortOptions[sortIdx].dir,
    })
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

  const resetFilters = () => {
    setFromDate(null)
    setToDate(null)
    setMaterial('all')
    setSortIdx(0)
  }

  const hasActiveFilters = fromDate !== null || toDate !== null || material !== 'all' || sortIdx !== 0

  const inputCls =
    'text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <History className="size-5" />
        <h1 className="text-xl font-semibold">Historial de tickets</h1>
        <Badge variant="outline">{total} ticket{total !== 1 ? 's' : ''}</Badge>
      </div>

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

      {/* Filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => preset('today')}>Hoy</Button>
                <Button variant="outline" size="sm" onClick={() => preset('week')}>Esta semana</Button>
                <Button variant="outline" size="sm" onClick={() => preset('month')}>Este mes</Button>
                <Button variant="outline" size="sm" onClick={() => preset('all')}>Todo</Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Limpiar
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Desde</label>
                <input
                  type="date"
                  value={fromDate ? fromDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (!e.target.value) { setFromDate(null); return }
                    const d = new Date(e.target.value + 'T00:00:00')
                    if (!isNaN(d.getTime())) setFromDate(d)
                  }}
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Hasta</label>
                <input
                  type="date"
                  value={toDate ? toDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (!e.target.value) { setToDate(null); return }
                    const d = new Date(e.target.value + 'T23:59:59')
                    if (!isNaN(d.getTime())) setToDate(d)
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Ordenar</label>
                <select
                  value={sortIdx}
                  onChange={(e) => setSortIdx(Number(e.target.value))}
                  className={inputCls}
                >
                  {sortOptions.map((o, i) => (
                    <option key={o.label} value={i}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className={inputCls}
                >
                  <option value="all">Todos</option>
                  {allMaterials.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && tickets.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <History className="size-8 opacity-30" />
          <p className="text-sm">
            {hasActiveFilters ? 'No hay tickets que coincidan con los filtros' : 'Todavía no hay tickets guardados'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const st = statusLabel[t.status] ?? statusLabel.pending
            return (
              <Card
                key={t.id}
                className={`${t.status === 'cancelled' ? 'opacity-60' : ''} cursor-pointer hover:ring-1 hover:ring-ring`}
                onClick={() => navigate(`/ticket/${t.id}`)}
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
