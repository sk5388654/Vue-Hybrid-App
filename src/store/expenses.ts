import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type ExpenseCategory = 'Rent' | 'Supplies' | 'Utilities' | 'Salary' | 'Misc'

export type Expense = {
  id: string
  storeId: string
  expenseTitle: string
  expenseCategory: ExpenseCategory
  amount: number
  date: string // ISO date string
  notes?: string
  addedBy: string
  createdAt: string // ISO timestamp
}

const LS_KEY_PREFIX = 'expenses_'

export const useExpensesStore = defineStore('expenses', {
  state: () => ({
    expenses: [] as Expense[],
  }),
  getters: {
    expensesForCurrentStore(state): Expense[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.expenses.filter(e => e.storeId === sid)
    },
    totalExpenses(): number {
      return this.expensesForCurrentStore.reduce((sum, e) => sum + e.amount, 0)
    },
    expensesByCategory(): Record<ExpenseCategory, number> {
      const result: Record<string, number> = {
        Rent: 0,
        Supplies: 0,
        Utilities: 0,
        Salary: 0,
        Misc: 0,
      }
      this.expensesForCurrentStore.forEach(e => {
        result[e.expenseCategory] = (result[e.expenseCategory] || 0) + e.amount
      })
      return result as Record<ExpenseCategory, number>
    },
    expensesToday(): number {
      const today = new Date().toISOString().split('T')[0]
      return this.expensesForCurrentStore
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + e.amount, 0)
    },
    expensesThisWeek(): number {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return this.expensesForCurrentStore
        .filter(e => new Date(e.date) >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0)
    },
    expensesThisMonth(): number {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return this.expensesForCurrentStore
        .filter(e => new Date(e.date) >= monthStart)
        .reduce((sum, e) => sum + e.amount, 0)
    },
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) {
        this.expenses = []
        return
      }
      const key = `${LS_KEY_PREFIX}${sid}`
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          this.expenses = JSON.parse(raw)
        } catch {
          this.expenses = []
        }
      } else {
        this.expenses = []
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return
      const key = `${LS_KEY_PREFIX}${sid}`
      localStorage.setItem(key, JSON.stringify(this.expenses))
    },
    add(expense: Omit<Expense, 'id' | 'storeId' | 'createdAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null
      const newExpense: Expense = {
        ...expense,
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        createdAt: new Date().toISOString(),
      }
      this.expenses.push(newExpense)
      this.persist()
      return newExpense
    },
    update(id: string, patch: Partial<Omit<Expense, 'id' | 'storeId' | 'createdAt'>>) {
      const idx = this.expenses.findIndex(e => e.id === id)
      if (idx === -1) return
      this.expenses[idx] = { ...this.expenses[idx], ...patch }
      this.persist()
    },
    remove(id: string) {
      this.expenses = this.expenses.filter(e => e.id !== id)
      this.persist()
    },
    setCurrentStore() {
      // Reload expenses when store changes
      this.load()
    },
  },
})

