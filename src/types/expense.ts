export type ExpenseType = 'operativo' | 'empleado'

export interface Employee {
  id: string
  name: string
}

export interface ExpenseCategory {
  id: string
  name: string
}

export interface Expense {
  id: string
  type: ExpenseType
  category: string
  amount: number
  observations: string
  expenseDate: string
}

export interface ExpenseSummaryByCategory {
  category: string
  total: number
  count: number
}
