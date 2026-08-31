import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useExpensesDb } from '@/hooks/useExpensesDb'
import type { Employee, ExpenseCategory, Expense, ExpenseType } from '@/types/expense'
import {
  Wallet, Users, Wrench, Loader2, Plus, Trash2, Pencil, X, Settings2, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

const fmt = (n: number) =>
  Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function todayDate(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const inputCls =
  'text-sm border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

type Tab = 'operativo' | 'empleado'

interface FormState {
  categoryId: string
  amount: string
  observations: string
  date: string
}

const emptyForm: FormState = { categoryId: '', amount: '', observations: '', date: todayDate() }

export function Expenses() {
  const {
    loading, error,
    getEmployees, addEmployee, deleteEmployee,
    getCategories, addCategory, deleteCategory,
    getExpenses, createExpense, updateExpense, deleteExpense,
  } = useExpensesDb()

  const [tab, setTab] = useState<Tab>('operativo')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showManage, setShowManage] = useState(false)
  const [newName, setNewName] = useState('')
  const [from, setFrom] = useState(todayDate)
  const [to, setTo] = useState(todayDate)
  const [filterCategory, setFilterCategory] = useState('all')

  const isEmployeeTab = tab === 'empleado'
  const list = isEmployeeTab ? employees : categories

  const loadLists = useCallback(async () => {
    const [emps, cats] = await Promise.all([getEmployees(), getCategories()])
    setEmployees(emps)
    setCategories(cats)
  }, [getEmployees, getCategories])

  const loadExpenses = useCallback(async () => {
    const cat = filterCategory === 'all' ? undefined : filterCategory
    const result = await getExpenses({
      type: tab,
      from: from || undefined,
      to: to ? to + 'T23:59:59.999' : undefined,
      category: cat,
    })
    setExpenses(result)
  }, [getExpenses, tab, from, to, filterCategory])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const submit = async () => {
    const name = list.find((e) => e.id === form.categoryId)?.name
    if (!name) { toast.error('Seleccioná un ' + (isEmployeeTab ? 'empleado' : 'categoría')); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Ingresá un monto válido'); return }
    if (!form.date) { toast.error('Ingresá una fecha'); return }

    const input = {
      type: tab as ExpenseType,
      category: name,
      amount,
      observations: form.observations,
      expenseDate: form.date + 'T12:00:00.000',
    }

    let ok: boolean
    if (editingId) {
      ok = await updateExpense(editingId, input)
    } else {
      ok = await createExpense(input)
    }

    if (ok) {
      toast.success(editingId ? 'Gasto actualizado' : 'Gasto cargado')
      setForm(emptyForm)
      setEditingId(null)
      await loadExpenses()
    } else if (error) {
      toast.error(error)
    }
  }

  const startEdit = (e: Expense) => {
    const id = list.find((x) => x.name === e.category)?.id
    setEditingId(e.id)
    setForm({
      categoryId: id ?? '',
      amount: String(e.amount),
      observations: e.observations,
      date: e.expenseDate.slice(0, 10),
    })
    setShowManage(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id: string) => {
    const ok = await deleteExpense(id)
    if (ok) {
      toast.success('Gasto eliminado')
      await loadExpenses()
    } else if (error) {
      toast.error(error)
    }
  }

  const addListItem = async () => {
    const name = newName.trim()
    if (!name) { toast.error('Ingresá un nombre'); return }
    let ok: boolean
    if (isEmployeeTab) ok = await addEmployee(name)
    else ok = await addCategory(name)
    if (ok) {
      toast.success(isEmployeeTab ? 'Empleado agregado' : 'Categoría agregada')
      setNewName('')
      await loadLists()
    } else if (error) {
      toast.error(error)
    }
  }

  const removeListItem = async (id: string) => {
    let ok: boolean
    if (isEmployeeTab) ok = await deleteEmployee(id)
    else ok = await deleteCategory(id)
    if (ok) {
      toast.success(isEmployeeTab ? 'Empleado eliminado' : 'Categoría eliminada')
      await loadLists()
    } else if (error) {
      toast.error(error)
    }
  }

  const resetFilters = () => {
    setFrom('')
    setTo('')
    setFilterCategory('all')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const summary = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const e of expenses) {
      const prev = map.get(e.category) ?? { total: 0, count: 0 }
      prev.total += e.amount
      prev.count += 1
      map.set(e.category, prev)
    }
    return [...map.entries()]
      .map(([category, v]) => ({ category, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
  }, [expenses])

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <Wallet className="size-5" />
        <h1 className="text-xl font-semibold">Gastos</h1>
        <Badge variant="outline">{expenses.length} registro{expenses.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'empleado' ? 'default' : 'outline'}
          onClick={() => { setTab('empleado'); setEditingId(null); setForm(emptyForm); setShowManage(false) }}
        >
          <Users className="size-4 mr-1.5" />
          Empleados
        </Button>
        <Button
          variant={tab === 'operativo' ? 'default' : 'outline'}
          onClick={() => { setTab('operativo'); setEditingId(null); setForm(emptyForm); setShowManage(false) }}
        >
          <Wrench className="size-4 mr-1.5" />
          Gastos operativos
        </Button>
      </div>

      {/* Formulario de carga/edición */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {editingId
              ? (isEmployeeTab ? 'Editar pago a empleado' : 'Editar gasto operativo')
              : (isEmployeeTab ? 'Registrar pago a empleado' : 'Registrar gasto operativo')}
          </CardTitle>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="size-3.5 mr-1" />
              Cancelar
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0 w-28">
              {isEmployeeTab ? 'Empleado' : 'Categoría'}
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={inputCls + ' flex-1'}
            >
              <option value="" disabled>Seleccionar...</option>
              {list.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0 w-28">Monto ($)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0 w-28">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputCls + ' flex-1'}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0 w-28">Observaciones</label>
            <Input
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              placeholder="Opcional"
              className="flex-1"
            />
          </div>

          <Button onClick={submit} disabled={loading} className="mt-1 self-end">
            {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            {editingId ? 'Guardar cambios' : (isEmployeeTab ? 'Registrar pago' : 'Cargar gasto')}
          </Button>
        </CardContent>
      </Card>

      {/* Gestión de empleados / categorías */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowManage((v) => !v)}
          >
            <Settings2 className="size-4" />
            Gestionar {isEmployeeTab ? 'empleados' : 'categorías'}
            <span className="text-xs opacity-70">({list.length})</span>
          </button>
        </CardHeader>
        {showManage && (
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={isEmployeeTab ? 'Nombre del empleado' : 'Nueva categoría'}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addListItem() } }}
              />
              <Button variant="outline" onClick={addListItem} disabled={loading}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {list.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  {isEmployeeTab ? 'No hay empleados todavía' : 'No hay categorías todavía'}
                </span>
              )}
              {list.map((x) => (
                <span
                  key={x.id}
                  className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2 py-1 bg-background"
                >
                  {x.name}
                  <button
                    type="button"
                    onClick={() => removeListItem(x.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Eliminar ${x.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Filtrar</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={inputCls}
                  >
                    <option value="all">Todos</option>
                    {list.map((x) => (
                      <option key={x.id} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && expenses.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Wallet className="size-8 opacity-30" />
          <p className="text-sm">No hay gastos para los filtros seleccionados</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{e.category}</p>
                      <Badge variant="secondary">{formatDate(e.expenseDate)}</Badge>
                    </div>
                    {e.observations && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{e.observations}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base font-semibold tabular-nums">$ {fmt(e.amount)}</span>
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Editar gasto"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Eliminar gasto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-4 py-2 border-t bg-muted/30">
              <span className="text-sm font-medium text-muted-foreground">Total del filtro</span>
              <span className="text-base font-bold tabular-nums">$ {fmt(total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen por empleado/categoría */}
      {summary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Resumen por {isEmployeeTab ? 'empleado' : 'categoría'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {summary.map((s) => (
              <div key={s.category} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {s.category} <span className="text-xs opacity-70">({s.count})</span>
                </span>
                <span className="font-semibold tabular-nums">$ {fmt(s.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
