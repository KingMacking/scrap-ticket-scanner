import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useTicketDb, type MaterialSummaryItem } from '@/hooks/useTicketDb'
import {
  ArrowLeft, BarChart3, Loader2, ChevronUp, ChevronDown,
} from 'lucide-react'

interface DashboardProps {
  onBack: () => void
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtWeight = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

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

type SortKey = 'materialName' | 'totalWeight' | 'totalValue' | 'avgPrice'
type SortDir = 'asc' | 'desc'

function sortItems(items: MaterialSummaryItem[], key: SortKey, dir: SortDir): MaterialSummaryItem[] {
  const sorted = [...items]
  sorted.sort((a, b) => {
    let cmp: number
    if (key === 'materialName') {
      cmp = a.materialName.localeCompare(b.materialName)
    } else {
      cmp = a[key] - b[key]
    }
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

function formatPeriod(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' }
  const sameDay =
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()

  if (sameDay) {
    return from.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }
  return `${from.toLocaleDateString('es-AR', opts)} – ${to.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}`
}

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'materialName', label: 'Material', numeric: false },
  { key: 'totalWeight', label: 'Peso (kg)', numeric: true },
  { key: 'totalValue', label: 'Total ($)', numeric: true },
  { key: 'avgPrice', label: '$/kg', numeric: true },
]

export function Dashboard({ onBack }: DashboardProps) {
  const [fromDate, setFromDate] = useState(todayStart)
  const [toDate, setToDate] = useState(todayEnd)
  const [summary, setSummary] = useState<MaterialSummaryItem[]>([])
  const [totalTickets, setTotalTickets] = useState(0)
  const { getMaterialSummary, loading, error: dbError } = useTicketDb()
  const [sortKey, setSortKey] = useState<SortKey>('totalValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const from = fromDate.toISOString()
  const to = toDate.toISOString()

  const load = useCallback(async () => {
    const result = await getMaterialSummary(from, to)
    setSummary(result.items)
    setTotalTickets(result.totalTickets)
  }, [from, to, getMaterialSummary])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => sortItems(summary, sortKey, sortDir), [summary, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'materialName' ? 'asc' : 'desc')
    }
  }

  const setToday = () => { setFromDate(todayStart()); setToDate(todayEnd()) }
  const setWeek = () => { setFromDate(weekStart()); setToDate(todayEnd()) }
  const setMonth = () => { setFromDate(monthStart()); setToDate(monthEnd()) }

  const totalValue = summary.reduce((acc, s) => acc + s.totalValue, 0)

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    const active = columnKey === sortKey
    const Icon = active
      ? sortDir === 'asc' ? ChevronUp : ChevronDown
      : ChevronUp
    return <Icon className={`inline size-3.5 ml-0.5 align-text-bottom ${active ? '' : 'invisible'}`} />
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Volver
        </Button>
      </div>

      {/* Selector de período */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setToday}>Hoy</Button>
              <Button variant="outline" size="sm" onClick={setWeek}>Esta semana</Button>
              <Button variant="outline" size="sm" onClick={setMonth}>Este mes</Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Desde</label>
                <input
                  type="date"
                  value={fromDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T00:00:00')
                    if (!isNaN(d.getTime())) setFromDate(d)
                  }}
                  className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Hasta</label>
                <input
                  type="date"
                  value={toDate.toISOString().slice(0, 10)}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T23:59:59')
                    if (!isNaN(d.getTime())) setToDate(d)
                  }}
                  className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{formatPeriod(fromDate, toDate)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading && summary.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : summary.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <BarChart3 className="size-8 opacity-30" />
          <p className="text-sm">No hay tickets para este período</p>
          {dbError && <p className="text-xs text-destructive">{dbError}</p>}
        </div>
      ) : (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor total</p>
                <p className="text-3xl font-bold tabular-nums">$ {fmt(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Tickets</p>
                <p className="text-3xl font-bold tabular-nums">{totalTickets}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Materiales ({summary.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`${col.numeric ? 'text-right' : ''} cursor-pointer select-none hover:bg-muted/50 hover:text-foreground transition-colors`}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((item) => (
                    <TableRow key={item.materialName}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtWeight(item.totalWeight)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">$ {fmt(item.totalValue)}</TableCell>
                      <TableCell className="text-right tabular-nums">$ {fmt(item.avgPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableHeader>
                  <TableRow className="border-t-2 border-primary/30 bg-primary/5 hover:bg-primary/5">
                    <TableHead className="font-bold text-base text-primary">Total</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">{fmtWeight(
                      sorted.reduce((a, i) => a + i.totalWeight, 0)
                    )}</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">$ {fmt(totalValue)}</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">$ {fmt(
                      sorted.reduce((a, i) => a + i.totalWeight, 0) > 0
                        ? totalValue / sorted.reduce((a, i) => a + i.totalWeight, 0)
                        : 0
                    )}</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
