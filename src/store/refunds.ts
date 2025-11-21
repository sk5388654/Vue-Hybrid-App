import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type RefundType = 'full_return' | 'partial_return' | 'exchange' | 'cash_refund'

export type RefundItem = {
  id: number
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type RefundRecord = {
  refundId: string
  storeId: string
  saleId: string
  invoiceNumber: string
  refundType: RefundType
  refundReason?: string
  refundedItems: RefundItem[]
  exchangedItems?: RefundItem[]
  totalRefund: number
  refundMethod: string
  paymentMethod: string
  exchangeDifference?: number
  exchangeSaleId?: string
  cashier: string
  createdAt: string
}

type PersistedRefundState = {
  refunds: RefundRecord[]
  nextRefundSeq: number
}

const LS_KEY_PREFIX = 'refunds_'

function generateRefundNumber(seq: number) {
  const padded = `0000${seq}`.slice(-4)
  return `REF-${padded}`
}

export const useRefundsStore = defineStore('refunds', {
  state: () => ({
    refunds: [] as RefundRecord[],
    nextRefundSeq: 1,
  }),
  getters: {
    refundsForCurrentStore(state): RefundRecord[] {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return []
      return state.refunds.filter((r) => r.storeId === sid)
    },
    refundsForSale: (state) => {
      return (saleId: string) => state.refunds.filter((refund) => refund.saleId === saleId)
    },
    totalRefundedForSale: (state) => {
      return (saleId: string) =>
        state.refunds
          .filter((refund) => refund.saleId === saleId)
          .reduce((sum, refund) => sum + refund.totalRefund, 0)
    },
  },
  actions: {
    load() {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) {
        this.refunds = []
        this.nextRefundSeq = 1
        return
      }
      const raw = localStorage.getItem(`${LS_KEY_PREFIX}${sid}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PersistedRefundState | RefundRecord[]
          if (Array.isArray(parsed)) {
            this.refunds = parsed.map((legacy) => ({
              ...legacy,
              refundId:
                (legacy as any).refundId || (legacy as any).id || generateRefundNumber(this.nextRefundSeq++),
              refundType: (legacy as any).type || 'partial_return',
              refundedItems:
                (legacy as any).returnedItems?.map((item: any) => ({
                  id: item.productId ?? item.id,
                  name: item.productName ?? item.name ?? 'Item',
                  quantity: item.quantity,
                  unitPrice: item.unitPrice ?? item.price ?? 0,
                  lineTotal: (item.unitPrice ?? item.price ?? 0) * item.quantity,
                })) ?? [],
              exchangedItems:
                (legacy as any).exchangedItems?.map((item: any) => ({
                  id: item.productId ?? item.id,
                  name: item.productName ?? item.name ?? 'Item',
                  quantity: item.quantity,
                  unitPrice: item.unitPrice ?? item.price ?? 0,
                  lineTotal: (item.unitPrice ?? item.price ?? 0) * item.quantity,
                })) ?? undefined,
              totalRefund: (legacy as any).amount ?? 0,
              refundMethod: (legacy as any).refundMethod ?? 'Original Payment',
              paymentMethod: (legacy as any).paymentMethod ?? 'cash',
              refundReason: (legacy as any).description,
              exchangeDifference: (legacy as any).exchangeDifference,
              exchangeSaleId: (legacy as any).exchangeSaleId,
            }))
            const maxExisting = this.refunds.reduce((max, record) => {
              const numeric = Number(String(record.refundId).replace(/\D/g, ''))  
              return Number.isFinite(numeric) ? Math.max(max, numeric) : max
            }, 0)
            if (maxExisting >= this.nextRefundSeq) {
              this.nextRefundSeq = maxExisting + 1
            }
            this.persist()
            return
          }
          this.refunds = parsed.refunds ?? []
          this.nextRefundSeq = parsed.nextRefundSeq ?? 1
        } catch {
          this.refunds = []
          this.nextRefundSeq = 1
        }
      } else {
        this.refunds = []
        this.nextRefundSeq = 1
      }
    },
    persist() {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return
      const payload: PersistedRefundState = {
        refunds: this.refunds,
        nextRefundSeq: this.nextRefundSeq,
      }
      localStorage.setItem(`${LS_KEY_PREFIX}${sid}`, JSON.stringify(payload))
    },
    recordRefund(refund: Omit<RefundRecord, 'refundId' | 'storeId' | 'createdAt'>) {
      const stores = useStoresStore()
      const sid = stores.currentStoreId
      if (!sid) return null
      const refundId = generateRefundNumber(this.nextRefundSeq++)
      const record: RefundRecord = {
        ...refund,
        refundId,
        storeId: sid,
        createdAt: new Date().toISOString(),
      }
      this.refunds.push(record)
      this.persist()
      return record
    },
    deleteRefund(refundId: string) {
      this.refunds = this.refunds.filter((r) => r.refundId !== refundId)
      this.persist()
    },
    setCurrentStore() {
      this.load()
    },
  },
})
