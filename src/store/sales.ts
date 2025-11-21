import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type DiscountMode = 'flat' | 'percent'

export type SaleItem = {
  id: number
  name: string
  quantity: number
  unitPrice: number
  discountMode: DiscountMode
  discountValue: number
  lineDiscount: number
  lineTotal: number
}

export type Sale = {
  id: string
  invoiceNumber: string
  datetime: string
  items: SaleItem[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  totalDiscount: number
  total: number
  paymentType: 'cash' | 'card' | 'mobile'
  cashier: string
  customerId?: string
  customerName?: string
  dueAmount?: number
}

export const useSalesStore = defineStore('sales', {
  state: () => ({
    sales: [] as Sale[],
    nextInvoiceSeq: 1,
  }),
  getters: {
    todayTotal: (state) => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      return state.sales
        .filter(s => new Date(s.datetime).getTime() >= start)
        .reduce((sum, s) => sum + s.total, 0)
    },
    weekTotal: (state) => {
      const now = new Date()
      const first = new Date(now)
      first.setDate(now.getDate() - 6)
      first.setHours(0,0,0,0)
      const start = first.getTime()
      return state.sales
        .filter(s => new Date(s.datetime).getTime() >= start)
        .reduce((sum, s) => sum + s.total, 0)
    },
    monthTotal: (state) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      return state.sales
        .filter(s => new Date(s.datetime).getTime() >= monthStart)
        .reduce((sum, s) => sum + s.total, 0)
    },
    bestSelling: (state) => {
      const map = new Map<number, { name: string; quantity: number }>()
      state.sales.forEach(s => {
        s.items.forEach(it => {
          const prev = map.get(it.id) ?? { name: it.name, quantity: 0 }
          prev.quantity += it.quantity
          map.set(it.id, prev)
        })
      })
      return Array.from(map.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.quantity - a.quantity)
    }
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      if (!storesStore.stores.length) storesStore.load()
      const key = `sales_${storesStore.currentStoreId}`
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          this.sales = parsed.sales ?? []
          this.nextInvoiceSeq = parsed.nextInvoiceSeq ?? 1
        } catch {
          this.sales = []
          this.nextInvoiceSeq = 1
        }
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const key = `sales_${storesStore.currentStoreId}`
      localStorage.setItem(key, JSON.stringify({ sales: this.sales, nextInvoiceSeq: this.nextInvoiceSeq }))
    },
    generateInvoiceNumber() {
      const pad = (value: number, length: number) => {
        const str = String(value)
        if (str.length >= length) return str
        return `${'0'.repeat(length)}${str}`.slice(-length)
      }
      const now = new Date()
      const y = now.getFullYear()
      const m = pad(now.getMonth() + 1, 2)
      const d = pad(now.getDate(), 2)
      const seq = pad(this.nextInvoiceSeq++, 4)
      const inv = `${y}${m}${d}-${seq}`
      this.persist()
      return inv
    },
    recordSale(s: Omit<Sale, 'id' | 'invoiceNumber'>) {
      const sale: Sale = { id: crypto.randomUUID(), invoiceNumber: this.generateInvoiceNumber(), ...s }
      this.sales.push(sale)
      this.persist()
      return sale
    },
    deleteSale(saleId: string) {
      const idx = this.sales.findIndex(s => s.id === saleId)
      if (idx === -1) return false
      this.sales.splice(idx, 1)
      this.persist()
      return true
    }
  }
})

