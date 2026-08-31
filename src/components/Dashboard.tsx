import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useTicketDb, type MaterialSummaryItem } from '@/hooks/useTicketDb'
import { usePrices } from '@/hooks/usePrices'
import {
  BarChart3, Loader2, ChevronUp, ChevronDown,
  DollarSign, TrendingUp, FileText, ShoppingCart, Scale,
  Weight,
} from 'lucide-react'
import { Area, AreaChart, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Ticket } from '@/types/ticket'
import { BackButton } from '@/components/BackButton'

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

type SortKey = 'materialName' | 'totalWeight' | 'totalValue' | 'totalProfit' | 'avgPrice'
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

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function StatCard({
  title, value, icon: Icon, color,
}: {
  title: string
  value: string
  icon: typeof DollarSign
  color: string
}) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function IndicatorCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string
  value: string
  icon: typeof DollarSign
  color: string
  sub?: string
}) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-base font-semibold mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'materialName', label: 'Material', numeric: false },
  { key: 'totalWeight', label: 'Peso (kg)', numeric: true },
  { key: 'totalValue', label: 'Total ($)', numeric: true },
  { key: 'avgPrice', label: '$/kg', numeric: true },
  { key: 'totalProfit', label: 'Ganancia ($)', numeric: true },
]

export function Dashboard() {
  const [fromDate, setFromDate] = useState(todayStart)
  const [toDate, setToDate] = useState(todayEnd)
  const [summary, setSummary] = useState<MaterialSummaryItem[]>([])
  const [totalTickets, setTotalTickets] = useState(0)
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [dailyTotals, setDailyTotals] = useState<{ day: string; total: number }[]>([])
  const { getMaterialSummary, getRecentTickets, getDailyTotals, loading, error: dbError } = useTicketDb()
  const { prices } = usePrices()
  const [sortKey, setSortKey] = useState<SortKey>('totalValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const from = fromDate.toISOString()
  const to = toDate.toISOString()

  const load = useCallback(async () => {
    const [summaryResult, recent, daily] = await Promise.all([
      getMaterialSummary(from, to, prices),
      getRecentTickets(10),
      getDailyTotals(from, to),
    ])
    setSummary(summaryResult.items)
    setTotalTickets(summaryResult.totalTickets)
    setRecentTickets(recent)
    setDailyTotals(daily)
  }, [from, to, prices, getMaterialSummary, getRecentTickets, getDailyTotals])

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
  const totalProfit = summary.reduce((acc, s) => acc + s.totalProfit, 0)
  const totalWeight = summary.reduce((acc, s) => acc + s.totalWeight, 0)
  const avgTicket = totalTickets > 0 ? totalValue / totalTickets : 0
  const avgPriceOverall = totalWeight > 0 ? totalValue / totalWeight : 0
  const topMaterial = summary.length > 0 ? summary.reduce((a, b) => a.totalProfit > b.totalProfit ? a : b) : null

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    const active = columnKey === sortKey
    const Icon = active
      ? sortDir === 'asc' ? ChevronUp : ChevronDown
      : ChevronUp
    return <Icon className={`inline size-3.5 ml-0.5 align-text-bottom ${active ? '' : 'invisible'}`} />
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5" />
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="ml-auto"><BackButton /></div>
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
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Valor total"
              value={`$ ${fmt(totalValue)}`}
              icon={DollarSign}
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard
              title="Ganancia"
              value={`$ ${fmt(totalProfit)}`}
              icon={TrendingUp}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <StatCard
              title="Tickets"
              value={String(totalTickets)}
              icon={FileText}
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            />
          </div>

          {/* Indicators */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {topMaterial && (
              <IndicatorCard
                label="Material top"
                value={topMaterial.materialName}
                icon={Scale}
                color="text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400"
                sub={`Ganancia: $ ${fmt(topMaterial.totalProfit)} · ${fmtWeight(topMaterial.totalWeight)} kg`}
              />
            )}
            <IndicatorCard
              label="Kilos totales"
              value={`${fmtWeight(totalWeight)} kg`}
              icon={Weight}
              color="text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
            />
            <IndicatorCard
              label="Ticket promedio"
              value={`$ ${fmt(avgTicket)}`}
              icon={ShoppingCart}
              color="text-amber-500 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Evolución diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTotals}>
                      <defs>
                        <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `$${fmt(v)}`} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                        formatter={(value) => [`$ ${fmt(Number(value))}`, 'Total']}
                      />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#valueGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Materiales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `$${fmt(v)}`} />
                      <YAxis type="category" dataKey="materialName" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-foreground)' }} width={90} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                        formatter={(value) => [`$ ${fmt(Number(value))}`, 'Total']}
                      />
                      <Bar dataKey="totalValue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de materiales */}
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
                        className={`${col.numeric ? 'text-right' : ''} cursor-pointer select-none hover:bg-muted/50 hover:text-foreground transition-colors text-xs uppercase tracking-wider`}
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
                    <TableRow key={item.materialName} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtWeight(item.totalWeight)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">$ {fmt(item.totalValue)}</TableCell>
                      <TableCell className="text-right tabular-nums">$ {fmt(item.avgPrice)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${item.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        $ {fmt(item.totalProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableHeader>
                  <TableRow className="border-t-2 border-primary/30 bg-primary/5 hover:bg-primary/5">
                    <TableHead className="font-bold text-base text-primary">Total</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">{fmtWeight(totalWeight)}</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">$ {fmt(totalValue)}</TableHead>
                    <TableHead className="text-right font-bold text-base tabular-nums text-primary">$ {fmt(avgPriceOverall)}</TableHead>
                    <TableHead className={`text-right font-bold text-base tabular-nums ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      $ {fmt(totalProfit)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </CardContent>
          </Card>

          {/* Últimos tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Últimos tickets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay tickets recientes</p>
              ) : (
                <div className="divide-y">
                  {recentTickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.items.map((i) => i.materialName).slice(0, 2).join(', ')}
                          {t.items.length > 2 && ` +${t.items.length - 2}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.items.reduce((s, i) => s + (i.correctedWeight ?? 0), 0).toFixed(1)} kg · {timeAgo(t.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold tabular-nums">$ {fmt(t.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
