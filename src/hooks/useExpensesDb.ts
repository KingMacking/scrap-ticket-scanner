import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Employee, ExpenseCategory, Expense, ExpenseType,
} from '@/types/expense'

interface EmployeeRow { id: string; name: string }
interface CategoryRow { id: string; name: string }
interface ExpenseRow {
  id: string
  type: ExpenseType
  category: string
  amount: number
  observations: string
  expense_date: string
}

export interface GetExpensesOptions {
  type?: ExpenseType
  from?: string
  to?: string
  category?: string
  limit?: number
  offset?: number
}

export function useExpensesDb() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getEmployees = useCallback(async (): Promise<Employee[]> => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return [] }

    const { data, error: err } = await supabase
      .from('employees')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (err) { setError(err.message); setLoading(false); return [] }
    setLoading(false)
    return (data ?? ([] as EmployeeRow[])).map((r) => ({ id: r.id, name: r.name }))
  }, [])

  const addEmployee = useCallback(async (name: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return false }

    const { error: err } = await supabase
      .from('employees')
      .insert({ user_id: user.id, name: name.trim() })
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const getCategories = useCallback(async (): Promise<ExpenseCategory[]> => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return [] }

    const { data, error: err } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (err) { setError(err.message); setLoading(false); return [] }
    setLoading(false)
    return (data ?? ([] as CategoryRow[])).map((r) => ({ id: r.id, name: r.name }))
  }, [])

  const addCategory = useCallback(async (name: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return false }

    const { error: err } = await supabase
      .from('expense_categories')
      .insert({ user_id: user.id, name: name.trim() })
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const getExpenses = useCallback(async (opts: GetExpensesOptions = {}): Promise<Expense[]> => {
    const { type, from, to, category, limit = 200, offset = 0 } = opts
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return [] }

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)

    if (type) query = query.eq('type', type)
    if (from) query = query.gte('expense_date', from)
    if (to) query = query.lt('expense_date', to)
    if (category) query = query.eq('category', category)

    const { data, error: err } = await query
      .order('expense_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (err) { setError(err.message); setLoading(false); return [] }
    setLoading(false)
    return (data ?? ([] as ExpenseRow[])).map((r) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      amount: Number(r.amount),
      observations: r.observations,
      expenseDate: r.expense_date,
    }))
  }, [])

  const createExpense = useCallback(async (input: {
    type: ExpenseType
    category: string
    amount: number
    observations?: string
    expenseDate: string
  }): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return false }

    const { error: err } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        type: input.type,
        category: input.category,
        amount: input.amount,
        observations: input.observations ?? '',
        expense_date: input.expenseDate,
      })
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const updateExpense = useCallback(async (id: string, input: {
    type: ExpenseType
    category: string
    amount: number
    observations?: string
    expenseDate: string
  }): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('expenses')
      .update({
        type: input.type,
        category: input.category,
        amount: input.amount,
        observations: input.observations ?? '',
        expense_date: input.expenseDate,
      })
      .eq('id', id)
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
    if (err) { setError(err.message); setLoading(false); return false }
    setLoading(false)
    return true
  }, [])

  return {
    loading, error,
    getEmployees, addEmployee, deleteEmployee,
    getCategories, addCategory, deleteCategory,
    getExpenses, createExpense, updateExpense, deleteExpense,
  }
}
