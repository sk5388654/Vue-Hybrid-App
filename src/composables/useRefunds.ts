import { computed, nextTick, reactive, ref } from 'vue'
import { useSalesStore, type Sale } from '@/store/sales'
import { useRefundsStore, type RefundRecord, type RefundType, type RefundItem } from '@/store/refunds'
import { useProductsStore } from '@/store/products'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'
import { processExchange, type ExchangeResult } from '@/utils/exchangeProcessor'

type RefundModeState = {
  saleId: string | null
  refundType: RefundType
  reason: string
  returnQuantities: Map<number, number>
  exchangeReturnQuantities: Map<number, number>
  exchangeNewQuantities: Map<number, number>
  isProcessing: boolean
}

type ProcessRefundResult = {
  refundRecord: RefundRecord
  exchangeSale?: Sale
  message: string
}

export function useRefunds() {
  const salesStore = useSalesStore()
  const refundsStore = useRefundsStore()
  const productsStore = useProductsStore()
  const authStore = useAuthStore()
  const router = useRouter()

  const state = reactive<RefundModeState>({
    saleId: null,
    refundType: 'full_return',
    reason: '',
    returnQuantities: new Map(),
    exchangeReturnQuantities: new Map(),
    exchangeNewQuantities: new Map(),
    isProcessing: false,
  })

  const error = ref<string | null>(null)
  const success = ref<string | null>(null)

  const sale = computed(() => {
    if (!state.saleId) return null
    return salesStore.sales.find((s) => s.id === state.saleId) ?? null
  })

  const existingRefunds = computed(() => {
    if (!sale.value) return []
    return refundsStore.refundsForSale(sale.value.id)
  })

  const refundedQuantitiesByProduct = computed(() => {
    const map = new Map<number, number>()
    existingRefunds.value.forEach((record) => {
      record.refundedItems.forEach((item) => {
        map.set(item.id, (map.get(item.id) || 0) + item.quantity)
      })
    })
    return map
  })

  const refundableItems = computed(() => {
    if (!sale.value) return []
    // Allocate invoice-level discount proportionally across items, then expose per-unit paid price
    const subtotal = sale.value.subtotal || 0
    const invoiceDiscountAmount = sale.value.invoiceDiscountAmount || 0
    return sale.value.items.map((item) => {
      const refundedQty = refundedQuantitiesByProduct.value.get(item.id) || 0
      const remainingQty = Math.max(0, item.quantity - refundedQty)

      const itemLineTotal = item.lineTotal ?? (item.unitPrice * item.quantity)
      // proportion of invoice discount this item should carry
      const itemInvoiceDiscountShare = subtotal > 0 ? (itemLineTotal / subtotal) * invoiceDiscountAmount : 0
      const perUnitInvoiceDiscount = item.quantity > 0 ? itemInvoiceDiscountShare / item.quantity : 0
      // per-unit price actually paid (after product-level and allocated invoice-level discounts)
      const unitPaid = item.quantity > 0 ? itemLineTotal / item.quantity - perUnitInvoiceDiscount : 0

      return {
        productId: item.id,
        name: item.name,
        purchasedQty: item.quantity,
        refundedQty,
        remainingQty,
        // original unit price before any discounts
        originalUnitPrice: item.unitPrice,
        // expose the per-unit paid amount (what customer actually paid per unit)
        unitPrice: unitPaid,
        // total paid for the full original quantity (for reference)
        lineTotal: itemLineTotal - itemInvoiceDiscountShare,
      }
    })
  })

  const totalReturnQuantity = computed(() => {
    const activeMap =
      state.refundType === 'exchange' ? state.exchangeReturnQuantities : state.returnQuantities
    let total = 0
    activeMap.forEach((qty) => {
      total += qty
    })
    return total
  })

  const totalReturnValue = computed(() => {
    let total = 0
    const items = state.refundType === 'exchange' ? state.exchangeReturnQuantities : state.returnQuantities
    items.forEach((qty, productId) => {
      const item = refundableItems.value.find((it) => it.productId === productId)
      if (!item) return
      total += item.unitPrice * qty
    })
    return total
  })

  const totalExchangeValue = computed(() => {
    let total = 0
    state.exchangeNewQuantities.forEach((qty, productId) => {
      const product = productsStore.products.find((p) => p.id === productId)
      if (!product) return
      total += product.price * qty
    })
    return total
  })

  const exchangeDifference = computed(() => {
    if (state.refundType !== 'exchange') return 0
    return totalReturnValue.value - totalExchangeValue.value
  })

  const balanceToCustomer = computed(() => Math.max(0, exchangeDifference.value))
  const balanceFromCustomer = computed(() => Math.max(0, -exchangeDifference.value))

  const refundMethod = computed(() => {
    if (!sale.value) return 'Original Payment'
    if (state.refundType === 'cash_refund') return 'Cash Refund'
    return `Original - ${sale.value.paymentType.toUpperCase()}`
  })

  const summary = computed(() => ({
    refundType: state.refundType,
    reason: state.reason.trim(),
    totalReturnQuantity: totalReturnQuantity.value,
    totalReturnValue: totalReturnValue.value,
    totalExchangeValue: totalExchangeValue.value,
    balanceToCustomer: balanceToCustomer.value,
    balanceFromCustomer: balanceFromCustomer.value,
    refundMethod: refundMethod.value,
  }))

  function resetQuantities() {
    state.returnQuantities.clear()
    state.exchangeReturnQuantities.clear()
    state.exchangeNewQuantities.clear()
  }

  function resetState() {
    state.saleId = null
    state.refundType = 'full_return'
    state.reason = ''
    resetQuantities()
    state.isProcessing = false
    error.value = null
    success.value = null
  }

  function selectSale(saleId: string | null) {
    state.saleId = saleId
    resetQuantities()
    error.value = null
    success.value = null
    if (!saleId) return
    if (state.refundType === 'full_return') {
      autoSelectFullReturn()
    } else if (state.refundType === 'partial_return' || state.refundType === 'cash_refund') {
      // Initialize with default values matching what the UI shows
      // Use nextTick to ensure refundableItems is computed
      nextTick(() => {
        for (const item of refundableItems.value) {
          if (item.remainingQty > 0) {
            // Initialize with the default value that the UI shows
            state.returnQuantities.set(item.productId, item.remainingQty)
          }
        }
      })
    }
  }

  function setRefundType(type: RefundType) {
    state.refundType = type
    resetQuantities()
    if (type === 'full_return') {
      autoSelectFullReturn()
    } else if (type === 'partial_return' || type === 'cash_refund') {
      // Initialize with default values when switching to partial/cash refund
      if (sale.value) {
        nextTick(() => {
          for (const item of refundableItems.value) {
            if (item.remainingQty > 0) {
              state.returnQuantities.set(item.productId, item.remainingQty)
            }
          }
        })
      }
    }
  }

  function autoSelectFullReturn() {
    if (!sale.value) return
    resetQuantities()
    for (const item of refundableItems.value) {
      if (item.remainingQty <= 0) {
        error.value = 'This invoice has already been refunded fully.'
        state.refundType = 'partial_return'
        return
      }
      state.returnQuantities.set(item.productId, item.remainingQty)
    }
  }

  function setReturnQuantity(productId: number, quantity: number) {
    if (!sale.value) return
    const targetMap = state.refundType === 'exchange' ? state.exchangeReturnQuantities : state.returnQuantities
    const item = refundableItems.value.find((it) => it.productId === productId)
    if (!item) return
    const safeQty = Math.min(Math.max(quantity, 0), item.remainingQty)
    if (safeQty <= 0) {
      targetMap.delete(productId)
    } else {
      targetMap.set(productId, safeQty)
    }
  }

  function setExchangeNewQuantity(productId: number, quantity: number) {
    const product = productsStore.products.find((p) => p.id === productId)
    if (!product) return
    const safeQty = Math.min(Math.max(quantity, 0), product.stock)
    if (safeQty <= 0) {
      state.exchangeNewQuantities.delete(productId)
    } else {
      state.exchangeNewQuantities.set(productId, safeQty)
    }
  }

  function validate() {
    error.value = null
    if (!sale.value) {
      error.value = 'Select an invoice before processing a refund.'
      return false
    }
    if (state.refundType === 'full_return') {
      if (state.returnQuantities.size === 0) {
        error.value = 'All items in the invoice have already been refunded.'
        return false
      }
    }
    if (state.refundType === 'partial_return' || state.refundType === 'cash_refund') {
      if (state.returnQuantities.size === 0) {
        error.value = 'Select at least one item to refund.'
        return false
      }
    }
    if (state.refundType === 'exchange') {
      if (state.exchangeReturnQuantities.size === 0) {
        error.value = 'Select the items being returned.'
        return false
      }
      if (state.exchangeNewQuantities.size === 0) {
        error.value = 'Select the replacement items for the exchange.'
        return false
      }
    }
    return true
  }

  function buildRefundItems(map: Map<number, number>): RefundItem[] {
    const items: RefundItem[] = []
    map.forEach((qty, productId) => {
      if (!sale.value) return
      const item = sale.value.items.find((it) => it.id === productId)
      if (!item) return
      // compute per-unit paid amount including invoice-level discount allocation
      const subtotal = sale.value.subtotal || 0
      const invoiceDiscountAmount = sale.value.invoiceDiscountAmount || 0
      const itemLineTotal = item.lineTotal ?? (item.unitPrice * item.quantity)
      const itemInvoiceDiscountShare = subtotal > 0 ? (itemLineTotal / subtotal) * invoiceDiscountAmount : 0
      const perUnitInvoiceDiscount = item.quantity > 0 ? itemInvoiceDiscountShare / item.quantity : 0
      const unitPaid = item.quantity > 0 ? itemLineTotal / item.quantity - perUnitInvoiceDiscount : 0
      const lineTotalForQty = unitPaid * qty

      items.push({
        id: productId,
        name: item.name,
        quantity: qty,
        unitPrice: unitPaid,
        lineTotal: lineTotalForQty,
      })
    })
    return items
  }

  function buildExchangeItems(): RefundItem[] {
    const items: RefundItem[] = []
    state.exchangeNewQuantities.forEach((qty, productId) => {
      const product = productsStore.products.find((p) => p.id === productId)
      if (!product) return
      items.push({
        id: product.id,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
        lineTotal: product.price * qty,
      })
    })
    return items
  }

  function restoreStock(items: RefundItem[]) {
    items.forEach((item) => {
      const product = productsStore.products.find((p) => p.id === item.id)
      if (!product) return
      productsStore.update(product.id, { stock: (product.stock ?? 0) + item.quantity })
    })
  }

  function consumeStock(items: RefundItem[]) {
    if (!items.length) return
    productsStore.decrementStock(items.map((item) => ({ id: item.id, quantity: item.quantity })))
  }

  function confirmNavigationToPos() {
    if (router.currentRoute.value.path !== '/pos') {
      router.push('/pos')
    }
  }

  /**
   * Process exchange using the new exchange processor module
   * This handles proper invoice creation and payment/refund processing
   */
  async function processExchangeRefund(
    returnedItems: RefundItem[],
    exchangedItems: RefundItem[],
    refundReason: string | undefined,
    refundMethod: 'cash' | 'store_credit' | 'wallet',
    paymentType: 'cash' | 'card' | 'mobile'
  ): Promise<ExchangeResult | null> {
    if (!sale.value) {
      error.value = 'No sale selected for exchange.'
      return null
    }

    state.isProcessing = true
    try {
      const result = await processExchange(
        sale.value,
        returnedItems,
        exchangedItems,
        refundReason,
        refundMethod,
        paymentType,
        salesStore,
        productsStore,
        refundsStore,
        authStore
      )

      if (result.success) {
        success.value = result.message
        resetQuantities()
        state.reason = ''
      } else {
        error.value = result.message
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unexpected error during exchange processing.'
      return null
    } finally {
      state.isProcessing = false
    }
  }

  async function processRefund(): Promise<ProcessRefundResult | null> {
    if (state.isProcessing) return null
    const valid = validate()
    if (!valid || !sale.value) return null
    state.isProcessing = true
    try {
      let refundedItems: RefundItem[] = []
      let exchangedItems: RefundItem[] | undefined
      let totalRefund = 0
      let exchangeSale: Sale | undefined
      let difference = 0

      if (state.refundType === 'exchange') {
        refundedItems = buildRefundItems(state.exchangeReturnQuantities)
        exchangedItems = buildExchangeItems()
        difference = exchangeDifference.value
        totalRefund = difference > 0 ? difference : 0
      } else {
        refundedItems = buildRefundItems(state.returnQuantities)
        totalRefund = totalReturnValue.value
      }

      restoreStock(refundedItems)

      if (state.refundType === 'exchange' && exchangedItems?.length) {
        consumeStock(exchangedItems)
        exchangeSale = salesStore.recordSale({
          datetime: new Date().toISOString(),
          items: exchangedItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountMode: 'flat',
            discountValue: 0,
            lineDiscount: 0,
            lineTotal: item.lineTotal,
          })),
          subtotal: totalExchangeValue.value,
          productDiscountTotal: 0,
          invoiceDiscountMode: 'flat',
          invoiceDiscountValue: 0,
          invoiceDiscountAmount: 0,
          totalDiscount: 0,
          total: totalExchangeValue.value,
          paymentType: difference < 0 ? 'cash' : sale.value.paymentType,
          cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
          customerId: sale.value.customerId,
          customerName: sale.value.customerName,
        })
      }

      const record = refundsStore.recordRefund({
        saleId: sale.value.id,
        invoiceNumber: sale.value.invoiceNumber,
        refundType: state.refundType,
        refundReason: state.reason.trim() || undefined,
        refundedItems,
        exchangedItems,
        totalRefund,
        refundMethod: refundMethod.value,
        paymentMethod: sale.value.paymentType,
        exchangeDifference: difference !== 0 ? difference : undefined,
        exchangeSaleId: exchangeSale?.id,
        cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
      })

      if (!record) {
        throw new Error('Unable to record refund. Please ensure a store is selected.')
      }

      let message = 'Refund processed successfully.'
      if (state.refundType === 'exchange') {
        if (difference > 0) {
          message = `Exchange complete. Refund ₹${difference.toFixed(2)} to customer.`
        } else if (difference < 0) {
          message = `Exchange complete. Customer pays ₹${Math.abs(difference).toFixed(2)}.`
          confirmNavigationToPos()
        } else {
          message = 'Exchange complete. No balance due.'
        }
      } else if (state.refundType === 'cash_refund') {
        message = `Cash refund of ₹${totalRefund.toFixed(2)} recorded.`
      } else if (state.refundType === 'full_return') {
        message = `Full refund of ₹${totalRefund.toFixed(2)} recorded.`
      } else if (state.refundType === 'partial_return') {
        message = `Partial refund of ₹${totalRefund.toFixed(2)} recorded.`
      }

      success.value = message
      resetQuantities()
      state.reason = ''
      return {
        refundRecord: record,
        exchangeSale,
        message,
      }
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Unexpected error while processing the refund.'
      return null
    } finally {
      state.isProcessing = false
    }
  }

  return {
    state,
    sale,
    existingRefunds,
    refundableItems,
    summary,
    error,
    success,
    selectSale,
    setRefundType,
    setReturnQuantity,
    setExchangeNewQuantity,
    processRefund,
    processExchangeRefund,
    resetState,
    autoSelectFullReturn,
  }
}

