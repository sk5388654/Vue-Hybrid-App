import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type Customer = {
  id: string
  storeId: string
  fullName: string
  phone: string
  email?: string
  address?: string
  totalPurchases: number
  totalDue: number
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

const LS_KEY_PREFIX = 'customers_'

export const useCustomersStore = defineStore('customers', {
  state: () => ({
    customers: [] as Customer[],
  }),
  getters: {
    customersForCurrentStore(state): Customer[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.customers.filter(c => c.storeId === sid)
    },
    customerByPhone: (state) => {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      const map = new Map<string, Customer>()
      state.customers
        .filter(c => c.storeId === sid)
        .forEach(c => map.set(c.phone, c))
      return map
    },
    totalCustomers(): number {
      return this.customersForCurrentStore.length
    },
    totalDues(): number {
      return this.customersForCurrentStore.reduce((sum, c) => sum + c.totalDue, 0)
    },
    customersWithDues(): Customer[] {
      return this.customersForCurrentStore.filter(c => c.totalDue > 0)
    },
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) {
        this.customers = []
        return
      }
      const key = `${LS_KEY_PREFIX}${sid}`
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          this.customers = JSON.parse(raw)
        } catch {
          this.customers = []
        }
      } else {
        this.customers = []
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return
      const key = `${LS_KEY_PREFIX}${sid}`
      localStorage.setItem(key, JSON.stringify(this.customers))
    },
    add(customer: Omit<Customer, 'id' | 'storeId' | 'totalPurchases' | 'totalDue' | 'createdAt' | 'updatedAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      // Check if phone already exists for this store
      const existing = this.customersForCurrentStore.find(c => c.phone === customer.phone)
      if (existing) {
        throw new Error('Customer with this phone number already exists')
      }

      const now = new Date().toISOString()
      const newCustomer: Customer = {
        ...customer,
        id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        totalPurchases: 0,
        totalDue: 0,
        createdAt: now,
        updatedAt: now,
      }
      this.customers.push(newCustomer)
      this.persist()
      return newCustomer
    },
    update(id: string, patch: Partial<Omit<Customer, 'id' | 'storeId' | 'createdAt'>>) {
      const idx = this.customers.findIndex(c => c.id === id)
      if (idx === -1) return

      // If phone is being updated, check for duplicates
      if (patch.phone) {
        const storesStore = useStoresStore()
        const sid = storesStore.currentStoreId
        const existing = this.customers
          .filter(c => c.storeId === sid && c.id !== id)
          .find(c => c.phone === patch.phone)
        if (existing) {
          throw new Error('Customer with this phone number already exists')
        }
      }

      this.customers[idx] = {
        ...this.customers[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      this.persist()
    },
    remove(id: string) {
      this.customers = this.customers.filter(c => c.id !== id)
      this.persist()
    },
    recordPurchase(customerId: string, amount: number, dueAmount: number = 0) {
      const customer = this.customers.find(c => c.id === customerId)
      if (!customer) return

      customer.totalPurchases += amount
      customer.totalDue += dueAmount
      customer.updatedAt = new Date().toISOString()
      this.persist()
    },
    updateDue(customerId: string, amount: number) {
      const customer = this.customers.find(c => c.id === customerId)
      if (!customer) return

      customer.totalDue = Math.max(0, customer.totalDue + amount)
      customer.updatedAt = new Date().toISOString()
      this.persist()
    },
    setCurrentStore() {
      // Reload customers when store changes
      this.load()
    },
  },
})

