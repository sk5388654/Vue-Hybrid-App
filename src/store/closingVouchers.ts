import { defineStore } from 'pinia'
import { useSalesStore } from './sales'
import { useExpensesStore } from './expenses'
import { useStoresStore } from './stores'

export type PaymentBreakdown = {
  method: string
  amount: number
}

export type ClosingVoucher = {
  id: string
  storeId: string
  storeName: string
  cashierName: string
  shiftStart: string
  shiftEnd: string
  openingCash: number
  totalSales: number
  paymentBreakdown: PaymentBreakdown[]
  discounts: number
  refunds: number
  expenses: number
  expectedClosingCash: number
  actualClosingCash: number
  difference: number
  remarks?: string
  managerApproved: boolean
  createdAt: string
}

type ActiveShift = {
  start: string
  openingCash: number
  endedAt?: string
}

const VOUCHER_KEY_PREFIX = 'closing_vouchers_'
const SHIFT_KEY_PREFIX = 'closing_shift_'

export const useClosingVoucherStore = defineStore('closingVouchers', {
  state: () => ({
    vouchers: [] as ClosingVoucher[],
    activeShift: null as ActiveShift | null,
  }),
  getters: {
    vouchersForCurrentStore(state) {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return []
      return state.vouchers.filter(v => v.storeId === sid)
    },
    lastVoucher(): ClosingVoucher | undefined {
      const list = this.vouchersForCurrentStore
      return list.length ? list[list.length - 1] : undefined
    },
    isShiftOpen(state): boolean {
      return !!state.activeShift
    },
  },
  actions: {
    load() {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) {
        this.vouchers = []
        this.activeShift = null
        return
      }

      const voucherRaw = localStorage.getItem(`${VOUCHER_KEY_PREFIX}${sid}`)
      if (voucherRaw) {
        try {
          this.vouchers = JSON.parse(voucherRaw) as ClosingVoucher[]
        } catch {
          this.vouchers = []
        }
      }

      const shiftRaw = localStorage.getItem(`${SHIFT_KEY_PREFIX}${sid}`)
      if (shiftRaw) {
        try {
          this.activeShift = JSON.parse(shiftRaw)
        } catch {
          this.activeShift = null
        }
      }
    },
    persistVouchers() {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return
      localStorage.setItem(`${VOUCHER_KEY_PREFIX}${sid}`, JSON.stringify(this.vouchers))
    },
    persistShift() {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return
      if (this.activeShift) {
        localStorage.setItem(`${SHIFT_KEY_PREFIX}${sid}`, JSON.stringify(this.activeShift))
      } else {
        localStorage.removeItem(`${SHIFT_KEY_PREFIX}${sid}`)
      }
    },
    startShift(openingCash: number) {
      const start = new Date()
      this.activeShift = {
        start: start.toISOString(),
        openingCash,
        endedAt: undefined,
      }
      this.persistShift()
    },
    endShift() {
      if (!this.activeShift) return
      this.activeShift.endedAt = new Date().toISOString()
      this.persistShift()
    },
    computeSnapshot({
      openingCash,
      shiftStart,
      shiftEnd,
    }: {
      openingCash: number
      shiftStart: string
      shiftEnd: string
    }) {
      const salesStore = useSalesStore()
      const expensesStore = useExpensesStore()

      const startTime = new Date(shiftStart).getTime()
      const endTime = new Date(shiftEnd).getTime()

      const sales = salesStore.sales.filter(s => {
        const when = new Date(s.datetime).getTime()
        return when >= startTime && when <= endTime
      })

      let totalSales = 0
      let discounts = 0
      let refunds = 0
      const paymentBreakdown = new Map<string, number>()

      sales.forEach(sale => {
        totalSales += sale.total
        paymentBreakdown.set(sale.paymentType, (paymentBreakdown.get(sale.paymentType) || 0) + sale.total)
        if (sale.dueAmount && sale.dueAmount < 0) {
          refunds += Math.abs(sale.dueAmount)
        }
        const gross = sale.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
        discounts += Math.max(0, gross - sale.total)
      })

      const expenses = expensesStore.expensesForCurrentStore
        .filter(exp => {
          const when = new Date(exp.date).getTime()
          return when >= startTime && when <= endTime
        })
        .reduce((sum, exp) => sum + exp.amount, 0)

      const payments = Array.from(paymentBreakdown.entries()).map(([method, amount]) => ({ method, amount }))
      const cashSales = payments.find(p => p.method === 'cash')?.amount || 0
      const expectedClosingCash = openingCash + cashSales - refunds - expenses

      return {
        totalSales,
        paymentBreakdown: payments,
        discounts,
        refunds,
        expenses,
        expectedClosingCash,
      }
    },
    closeShift({
      storeId,
      storeName,
      cashierName,
      openingCash,
      actualClosingCash,
      remarks,
      managerApproved,
    }: {
      storeId: string
      storeName: string
      cashierName: string
      openingCash: number
      actualClosingCash: number
      remarks?: string
      managerApproved: boolean
    }) {
      const shiftStart = this.activeShift?.start ?? new Date().toISOString()
      const shiftEnd = this.activeShift?.endedAt ?? new Date().toISOString()
      const snapshot = this.computeSnapshot({ openingCash, shiftStart, shiftEnd })
      const voucher: ClosingVoucher = {
        id: `close_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId,
        storeName,
        cashierName,
        shiftStart,
        shiftEnd,
        openingCash,
        totalSales: snapshot.totalSales,
        paymentBreakdown: snapshot.paymentBreakdown,
        discounts: snapshot.discounts,
        refunds: snapshot.refunds,
        expenses: snapshot.expenses,
        expectedClosingCash: snapshot.expectedClosingCash,
        actualClosingCash,
        difference: actualClosingCash - snapshot.expectedClosingCash,
        remarks,
        managerApproved,
        createdAt: new Date().toISOString(),
      }
      this.vouchers.push(voucher)
      this.persistVouchers()
      this.activeShift = null
      this.persistShift()
      return voucher
    },
    setCurrentStore() {
      this.load()
    },
  },
})
