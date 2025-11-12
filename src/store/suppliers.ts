import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type PaymentTerms = 'Net 15' | 'Net 30' | 'Net 45' | 'Cash on Delivery' | 'Prepaid'

export type Supplier = {
  id: string
  storeId: string
  supplierName: string
  contactPerson: string
  phone: string
  email: string
  address?: string
  paymentTerms: PaymentTerms
  preferred: boolean
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderStatus = 'Pending' | 'Received' | 'Returned' | 'Cancelled'

export type PurchaseOrder = {
  id: string
  storeId: string
  supplierId: string
  poNumber: string
  items: Array<{
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  totalAmount: number
  status: PurchaseOrderStatus
  dueDate: string
  createdAt: string
  updatedAt: string
}

export type SupplierPayment = {
  id: string
  storeId: string
  supplierId: string
  poId?: string
  amount: number
  paymentDate: string
  notes?: string
  createdAt: string
}

export type SupplierReturn = {
  id: string
  storeId: string
  supplierId: string
  poId?: string
  items: Array<{
    productId: number
    productName: string
    quantity: number
    reason: string
  }>
  totalAmount: number
  returnDate: string
  createdAt: string
}

const LS_SUPPLIERS_PREFIX = 'suppliers_'
const LS_POS_PREFIX = 'purchase_orders_'
const LS_PAYMENTS_PREFIX = 'supplier_payments_'
const LS_RETURNS_PREFIX = 'supplier_returns_'

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [] as Supplier[],
    purchaseOrders: [] as PurchaseOrder[],
    payments: [] as SupplierPayment[],
    returns: [] as SupplierReturn[],
  }),
  getters: {
    suppliersForCurrentStore(state): Supplier[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.suppliers.filter(s => s.storeId === sid)
    },
    preferredSuppliers(state): Supplier[] {
      return this.suppliersForCurrentStore.filter(s => s.preferred)
    },
    purchaseOrdersForCurrentStore(state): PurchaseOrder[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.purchaseOrders.filter(po => po.storeId === sid)
    },
    paymentsForCurrentStore(state): SupplierPayment[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.payments.filter(p => p.storeId === sid)
    },
    returnsForCurrentStore(state): SupplierReturn[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.returns.filter(r => r.storeId === sid)
    },
    outstandingAmount(): number {
      const pos = this.purchaseOrdersForCurrentStore.filter(po => po.status === 'Received')
      const totalPO = pos.reduce((sum, po) => sum + po.totalAmount, 0)
      const totalPaid = this.paymentsForCurrentStore.reduce((sum, p) => sum + p.amount, 0)
      return Math.max(0, totalPO - totalPaid)
    },
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) {
        this.suppliers = []
        this.purchaseOrders = []
        this.payments = []
        this.returns = []
        return
      }

      // Load suppliers
      const suppliersKey = `${LS_SUPPLIERS_PREFIX}${sid}`
      const suppliersRaw = localStorage.getItem(suppliersKey)
      if (suppliersRaw) {
        try {
          this.suppliers = JSON.parse(suppliersRaw)
        } catch {
          this.suppliers = []
        }
      }

      // Load purchase orders
      const posKey = `${LS_POS_PREFIX}${sid}`
      const posRaw = localStorage.getItem(posKey)
      if (posRaw) {
        try {
          this.purchaseOrders = JSON.parse(posRaw)
        } catch {
          this.purchaseOrders = []
        }
      }

      // Load payments
      const paymentsKey = `${LS_PAYMENTS_PREFIX}${sid}`
      const paymentsRaw = localStorage.getItem(paymentsKey)
      if (paymentsRaw) {
        try {
          this.payments = JSON.parse(paymentsRaw)
        } catch {
          this.payments = []
        }
      }

      // Load returns
      const returnsKey = `${LS_RETURNS_PREFIX}${sid}`
      const returnsRaw = localStorage.getItem(returnsKey)
      if (returnsRaw) {
        try {
          this.returns = JSON.parse(returnsRaw)
        } catch {
          this.returns = []
        }
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return

      localStorage.setItem(`${LS_SUPPLIERS_PREFIX}${sid}`, JSON.stringify(this.suppliers))
      localStorage.setItem(`${LS_POS_PREFIX}${sid}`, JSON.stringify(this.purchaseOrders))
      localStorage.setItem(`${LS_PAYMENTS_PREFIX}${sid}`, JSON.stringify(this.payments))
      localStorage.setItem(`${LS_RETURNS_PREFIX}${sid}`, JSON.stringify(this.returns))
    },
    // Supplier CRUD
    addSupplier(supplier: Omit<Supplier, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      const now = new Date().toISOString()
      const newSupplier: Supplier = {
        ...supplier,
        id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        createdAt: now,
        updatedAt: now,
      }
      this.suppliers.push(newSupplier)
      this.persist()
      return newSupplier
    },
    updateSupplier(id: string, patch: Partial<Omit<Supplier, 'id' | 'storeId' | 'createdAt'>>) {
      const idx = this.suppliers.findIndex(s => s.id === id)
      if (idx === -1) return
      this.suppliers[idx] = {
        ...this.suppliers[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      this.persist()
    },
    removeSupplier(id: string) {
      this.suppliers = this.suppliers.filter(s => s.id !== id)
      this.persist()
    },
    // Purchase Order CRUD
    createPO(po: Omit<PurchaseOrder, 'id' | 'storeId' | 'poNumber' | 'createdAt' | 'updatedAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      const pad = (value: number, length: number) => {
        const str = String(value)
        if (str.length >= length) return str
        return `${'0'.repeat(length)}${str}`.slice(-length)
      }

      const now = new Date()
      const nowMonth = pad(now.getMonth() + 1, 2)
      const poNumber = `PO-${now.getFullYear()}${nowMonth}-${pad(this.purchaseOrdersForCurrentStore.length + 1, 4)}`
      const newPO: PurchaseOrder = {
        ...po,
        id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        poNumber,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      this.purchaseOrders.push(newPO)
      this.persist()
      return newPO
    },
    updatePOStatus(id: string, status: PurchaseOrderStatus) {
      const idx = this.purchaseOrders.findIndex(po => po.id === id)
      if (idx === -1) return
      this.purchaseOrders[idx].status = status
      this.purchaseOrders[idx].updatedAt = new Date().toISOString()
      this.persist()
    },
    // Payment
    recordPayment(payment: Omit<SupplierPayment, 'id' | 'storeId' | 'createdAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      const newPayment: SupplierPayment = {
        ...payment,
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        createdAt: new Date().toISOString(),
      }
      this.payments.push(newPayment)
      this.persist()
      return newPayment
    },
    // Return
    recordReturn(returnData: Omit<SupplierReturn, 'id' | 'storeId' | 'createdAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      const newReturn: SupplierReturn = {
        ...returnData,
        id: `ret_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        createdAt: new Date().toISOString(),
      }
      this.returns.push(newReturn)
      this.persist()
      return newReturn
    },
    setCurrentStore() {
      this.load()
    },
  },
})

