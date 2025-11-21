<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSalesStore, type Sale } from '@/store/sales'
import { useProductsStore } from '@/store/products'
import { useRefundsStore, type RefundItem } from '@/store/refunds'
import { calculateExchangeDifference, validateExchange, type ExchangeCalculation } from '@/utils/exchangeProcessor'

const props = defineProps<{
  originalSale: Sale | null
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [data: {
    returnedItems: RefundItem[]
    exchangedItems: RefundItem[]
    refundReason: string
    refundMethod: 'cash' | 'store_credit' | 'wallet'
    paymentType: 'cash' | 'card' | 'mobile'
  }]
}>()

const salesStore = useSalesStore()
const productsStore = useProductsStore()
const refundsStore = useRefundsStore()

// Step tracking
const currentStep = ref(1)
const totalSteps = 5

// Step 1: Select items to return
const returnQuantities = ref<Map<number, number>>(new Map())

// Step 2: Select items to exchange
const exchangeQuantities = ref<Map<number, number>>(new Map())
// Step 2: Discount for new items (per-item discounts)
const exchangeItemDiscounts = ref<Map<number, { mode: 'flat' | 'percent'; value: number }>>(new Map())
// Step 2: Global/invoice-level discount for new items
const exchangeInvoiceDiscount = ref<{ mode: 'flat' | 'percent'; value: number }>({ mode: 'flat', value: 0 })

// Step 3: Review calculation
const calculation = ref<ExchangeCalculation | null>(null)
const validation = ref<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)

// Step 4: Payment/Refund selection
const refundReason = ref('')
const refundMethod = ref<'cash' | 'store_credit' | 'wallet'>('cash')
const paymentType = ref<'cash' | 'card' | 'mobile'>('cash')

// Step 5: Confirmation
const isProcessing = ref(false)

const refundableItems = computed(() => {
  if (!props.originalSale) return []
  const existingRefunds = refundsStore.refundsForSale(props.originalSale.id)
  const refundedMap = new Map<number, number>()
  
  existingRefunds.forEach((refund) => {
    refund.refundedItems.forEach((item) => {
      refundedMap.set(item.id, (refundedMap.get(item.id) || 0) + item.quantity)
    })
  })

  return props.originalSale.items.map((item) => {
    const refundedQty = refundedMap.get(item.id) || 0
    const remainingQty = Math.max(0, item.quantity - refundedQty)
    return {
      productId: item.id,
      name: item.name,
      purchasedQty: item.quantity,
      refundedQty,
      remainingQty,
      // original unit price before any discounts (stored in sale item as unitPrice)
      originalUnitPrice: item.unitPrice,
      // per-unit price actually paid after discounts (lineTotal / quantity)
      unitPrice: item.lineTotal ? item.lineTotal / item.quantity : item.unitPrice,
      lineTotal: item.lineTotal ?? (item.unitPrice * item.quantity),
    }
  })
})

const availableProducts = computed(() => {
  return productsStore.products.filter((p) => (p.stock || 0) > 0)
})

const returnedItems = computed((): RefundItem[] => {
  const items: RefundItem[] = []
  returnQuantities.value.forEach((qty, productId) => {
    if (qty <= 0) return
    const item = refundableItems.value.find((it) => it.productId === productId)
    if (!item) return
    items.push({
      id: productId,
      name: item.name,
      quantity: qty,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * qty,
    })
  })
  return items
})

const exchangedItems = computed((): RefundItem[] => {
  const items: RefundItem[] = []
  const newItemsSubtotal = Array.from(exchangeQuantities.value.entries()).reduce((sum, [productId, qty]) => {
    if (qty <= 0) return sum
    const product = productsStore.products.find((p) => p.id === productId)
    if (!product) return sum
    return sum + product.price * qty
  }, 0)

  exchangeQuantities.value.forEach((qty, productId) => {
    if (qty <= 0) return
    const product = productsStore.products.find((p) => p.id === productId)
    if (!product) return

    // Calculate per-item discount
    const discount = exchangeItemDiscounts.value.get(productId) || { mode: 'flat', value: 0 }
    const grossLineTotal = product.price * qty
    let itemDiscount = 0
    if (discount.mode === 'percent') {
      itemDiscount = (grossLineTotal * Math.min(discount.value, 100)) / 100
    } else {
      itemDiscount = Math.min(discount.value, grossLineTotal)
    }
    const afterItemDiscount = Math.max(0, grossLineTotal - itemDiscount)

    // Calculate proportional invoice-level discount
    let invoiceDiscount = 0
    if (newItemsSubtotal > 0 && (exchangeInvoiceDiscount.value.mode || exchangeInvoiceDiscount.value.value > 0)) {
      const proportion = grossLineTotal / newItemsSubtotal
      if (exchangeInvoiceDiscount.value.mode === 'percent') {
        invoiceDiscount = (afterItemDiscount * Math.min(exchangeInvoiceDiscount.value.value, 100)) / 100
      } else {
        invoiceDiscount = (exchangeInvoiceDiscount.value.value * proportion)
      }
    }

    const netLineTotal = Math.max(0, afterItemDiscount - invoiceDiscount)
    const netUnitPrice = qty > 0 ? netLineTotal / qty : 0

    items.push({
      id: productId,
      name: product.name,
      quantity: qty,
      unitPrice: netUnitPrice,
      lineTotal: netLineTotal,
    })
  })
  return items
})

// Watch for changes to recalculate
watch([returnQuantities, exchangeQuantities, exchangeItemDiscounts, exchangeInvoiceDiscount], () => {
  if (returnedItems.value.length > 0 && exchangedItems.value.length > 0) {
    calculation.value = calculateExchangeDifference(returnedItems.value, exchangedItems.value)
    validation.value = validateExchange(props.originalSale, returnedItems.value, exchangedItems.value, productsStore)
  } else {
    calculation.value = null
    validation.value = null
  }
}, { deep: true })

function setReturnQuantity(productId: number, qty: number) {
  const item = refundableItems.value.find((it) => it.productId === productId)
  if (!item) return
  const safeQty = Math.min(Math.max(qty, 0), item.remainingQty)
  if (safeQty <= 0) {
    returnQuantities.value.delete(productId)
  } else {
    returnQuantities.value.set(productId, safeQty)
  }
}

function setExchangeQuantity(productId: number, qty: number) {
  const product = productsStore.products.find((p) => p.id === productId)
  if (!product) return
  const safeQty = Math.min(Math.max(qty, 0), product.stock || 0)
  if (safeQty <= 0) {
    exchangeQuantities.value.delete(productId)
    exchangeItemDiscounts.value.delete(productId)
  } else {
    exchangeQuantities.value.set(productId, safeQty)
  }
}

function setExchangeItemDiscount(productId: number, mode: 'flat' | 'percent', value: number) {
  const qty = exchangeQuantities.value.get(productId)
  if (!qty || qty <= 0) return
  
  const product = productsStore.products.find((p) => p.id === productId)
  if (!product) return

  const grossLineTotal = product.price * qty
  let safeValue = Math.max(value, 0)
  
  if (mode === 'percent') {
    safeValue = Math.min(safeValue, 100)
  } else {
    safeValue = Math.min(safeValue, grossLineTotal)
  }

  if (safeValue <= 0) {
    exchangeItemDiscounts.value.delete(productId)
  } else {
    exchangeItemDiscounts.value.set(productId, { mode, value: safeValue })
  }
}

function setExchangeInvoiceDiscount(mode: 'flat' | 'percent', value: number) {
  let safeValue = Math.max(value, 0)
  
  if (mode === 'percent') {
    safeValue = Math.min(safeValue, 100)
  }

  exchangeInvoiceDiscount.value = { mode, value: safeValue }
}

function nextStep() {
  if (currentStep.value === 1) {
    if (returnedItems.value.length === 0) {
      alert('Please select at least one item to return.')
      return
    }
  } else if (currentStep.value === 2) {
    if (exchangedItems.value.length === 0) {
      alert('Please select at least one item for exchange.')
      return
    }
    // Recalculate on step 3
    calculation.value = calculateExchangeDifference(returnedItems.value, exchangedItems.value)
    validation.value = validateExchange(props.originalSale, returnedItems.value, exchangedItems.value, productsStore)
    if (!validation.value.valid) {
      alert(`Validation errors:\n${validation.value.errors.join('\n')}`)
      return
    }
  } else if (currentStep.value === 3) {
    if (!validation.value?.valid) {
      alert(`Please fix validation errors before proceeding.`)
      return
    }
  }
  
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function handleConfirm() {
  if (!validation.value?.valid) {
    alert('Please fix validation errors before confirming.')
    return
  }
  
  isProcessing.value = true
  emit('confirm', {
    returnedItems: returnedItems.value,
    exchangedItems: exchangedItems.value,
    refundReason: refundReason.value.trim(),
    refundMethod: refundMethod.value,
    paymentType: paymentType.value,
  })
}

function handleClose() {
  currentStep.value = 1
  returnQuantities.value.clear()
  exchangeQuantities.value.clear()
  exchangeItemDiscounts.value.clear()
  exchangeInvoiceDiscount.value = { mode: 'flat', value: 0 }
  calculation.value = null
  validation.value = null
  refundReason.value = ''
  refundMethod.value = 'cash'
  paymentType.value = 'cash'
  isProcessing.value = false
  emit('close')
}

watch(() => props.show, (show) => {
  if (!show) {
    handleClose()
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-4xl rounded-lg dark-panel">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-transparent px-6 py-4">
        <div>
          <h2 class="text-xl font-semibold text-slate-100">Exchange Process</h2>
          <p class="mt-1 text-sm text-slate-400">
            Step {{ currentStep }} of {{ totalSteps }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md p-2 text-slate-400 hover:dark-panel hover:text-slate-300"
          @click="handleClose"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="border-b border-transparent px-6 py-3">
        <div class="flex items-center justify-between">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="flex flex-1 items-center"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
              :class="
                step < currentStep
                  ? 'bg-green-500 text-white'
                  : step === currentStep
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-slate-300'
              "
            >
              {{ step }}
            </div>
            <div
              v-if="step < totalSteps"
              class="h-1 flex-1"
              :class="step < currentStep ? 'bg-green-500' : 'bg-gray-200'"
            />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
        <!-- Step 1: Select Items to Return -->
        <div v-if="currentStep === 1" class="space-y-4">
          <h3 class="text-lg font-semibold text-slate-100">Step 1: Select Items to Return</h3>
          <p class="text-sm text-slate-300">Select the items from the original invoice that the customer wants to return.</p>
          
          <div v-if="originalSale" class="rounded-lg border border-transparent">
            <div class="dark-panel px-4 py-2 text-sm font-semibold text-slate-200">
              Original Invoice: #{{ originalSale.invoiceNumber }}
            </div>
            <table class="min-w-full text-sm">
              <thead class="dark-panel">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-slate-200">Item</th>
                  <th class="px-4 py-2 text-right font-medium text-slate-200">Purchased</th>
                  <th class="px-4 py-2 text-right font-medium text-slate-200">Refunded</th>
                  <th class="px-4 py-2 text-right font-medium text-slate-200">Available</th>
                  <th class="px-4 py-2 text-right font-medium text-slate-200">Unit Price</th>
                  <th class="px-4 py-2 text-right font-medium text-slate-200">Return Qty</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="item in refundableItems" :key="item.productId">
                  <td class="px-4 py-2 font-medium text-slate-100">{{ item.name }}</td>
                  <td class="px-4 py-2 text-right">{{ item.purchasedQty }}</td>
                  <td class="px-4 py-2 text-right text-slate-400">{{ item.refundedQty }}</td>
                  <td class="px-4 py-2 text-right">{{ item.remainingQty }}</td>
                  <td class="px-4 py-2 text-right">
                    <div class="flex flex-col items-end">
                      <span class="text-xs line-through text-slate-400">₹{{ item.originalUnitPrice.toFixed(2) }}</span>
                      <span class="text-sm font-semibold text-slate-100">₹{{ item.unitPrice.toFixed(2) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <input
                      :value="returnQuantities.get(item.productId) || 0"
                      :max="item.remainingQty"
                      min="0"
                      type="number"
                      class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-right text-sm"
                      @input="setReturnQuantity(item.productId, Number(($event.target as HTMLInputElement).value))"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Step 2: Select Items to Exchange -->
        <div v-if="currentStep === 2" class="space-y-4">
          <h3 class="text-lg font-semibold text-slate-100">Step 2: Select Items for Exchange</h3>
          <p class="text-sm text-slate-300">Select the new items the customer wants in exchange. Apply discounts if needed.</p>
          
          <div class="space-y-3">
            <div class="rounded-lg border border-transparent">
              <div class="dark-panel px-4 py-2 text-sm font-semibold text-slate-200">
                Available Products
              </div>
              <table class="min-w-full text-xs">
                <thead class="dark-panel">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-slate-200">Item</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Stock</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Unit Price</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Qty</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Discount Type</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Discount Value</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Net Rate</th>
                    <th class="px-3 py-2 text-right font-medium text-slate-200">Net Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="product in availableProducts" :key="product.id">
                    <td class="px-3 py-2 font-medium text-slate-100">{{ product.name }}</td>
                    <td class="px-3 py-2 text-right">{{ product.stock }}</td>
                    <td class="px-3 py-2 text-right">₹{{ product.price.toFixed(2) }}</td>
                    <td class="px-3 py-2 text-right">
                      <input
                        :value="exchangeQuantities.get(product.id) || 0"
                        :max="product.stock"
                        min="0"
                        type="number"
                        class="w-16 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-right text-xs"
                        @input="setExchangeQuantity(product.id, Number(($event.target as HTMLInputElement).value))"
                      />
                    </td>
                    <td class="px-3 py-2 text-right">
                      <select
                        v-if="exchangeQuantities.get(product.id)"
                        :value="exchangeItemDiscounts.get(product.id)?.mode || 'flat'"
                        class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-xs"
                        @change="setExchangeItemDiscount(product.id, ($event.target as HTMLSelectElement).value as 'flat' | 'percent', exchangeItemDiscounts.get(product.id)?.value || 0)"
                      >
                        <option value="flat">₹</option>
                        <option value="percent">%</option>
                      </select>
                    </td>
                    <td class="px-3 py-2 text-right">
                      <input
                        v-if="exchangeQuantities.get(product.id)"
                        :value="exchangeItemDiscounts.get(product.id)?.value || 0"
                        min="0"
                        type="number"
                        class="w-16 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-right text-xs"
                        @input="setExchangeItemDiscount(product.id, exchangeItemDiscounts.get(product.id)?.mode || 'flat', Number(($event.target as HTMLInputElement).value))"
                      />
                    </td>
                    <td v-if="exchangeQuantities.get(product.id)" class="px-3 py-2 text-right text-slate-100">
                      <span class="text-xs font-semibold">
                        ₹{{ (exchangedItems.find(it => it.id === product.id)?.lineTotal ?? 0 / (exchangeQuantities.get(product.id) || 1)).toFixed(2) }}
                      </span>
                    </td>
                    <td v-if="exchangeQuantities.get(product.id)" class="px-3 py-2 text-right text-slate-100">
                      <span class="text-xs font-semibold">
                        ₹{{ (exchangedItems.find(it => it.id === product.id)?.lineTotal ?? 0).toFixed(2) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Invoice-level discount for new items -->
            <div class="rounded-lg border border-transparent dark-panel p-3">
              <div class="text-sm font-semibold text-slate-200 mb-2">Global Discount (for new items)</div>
              <div class="flex items-center gap-2">
                <select
                  :value="exchangeInvoiceDiscount.mode"
                  class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm"
                  @change="setExchangeInvoiceDiscount(($event.target as HTMLSelectElement).value as 'flat' | 'percent', exchangeInvoiceDiscount.value)"
                >
                  <option value="flat">Flat (₹)</option>
                  <option value="percent">Percent (%)</option>
                </select>
                <input
                  :value="exchangeInvoiceDiscount.value"
                  min="0"
                  type="number"
                  class="w-24 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm"
                  @input="setExchangeInvoiceDiscount(exchangeInvoiceDiscount.mode, Number(($event.target as HTMLInputElement).value))"
                />
                <span class="text-xs text-slate-400">{{ exchangeInvoiceDiscount.mode === 'percent' ? '%' : '₹' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review Calculation -->
        <div v-if="currentStep === 3" class="space-y-4">
          <h3 class="text-lg font-semibold text-slate-100">Step 3: Review Exchange Calculation</h3>
          
          <div v-if="calculation" class="space-y-4">
            <!-- Returned Items Summary -->
            <div class="rounded-lg border border-transparent p-3">
              <div class="text-sm font-semibold text-slate-200 mb-2">Returned Items Value</div>
              <table class="min-w-full text-xs">
                <thead class="dark-panel">
                  <tr>
                    <th class="px-2 py-1 text-left">Item</th>
                    <th class="px-2 py-1 text-right">Qty</th>
                    <th class="px-2 py-1 text-right">Unit Price</th>
                    <th class="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in returnedItems" :key="item.id">
                    <td class="px-2 py-1">{{ item.name }}</td>
                    <td class="px-2 py-1 text-right">{{ item.quantity }}</td>
                    <td class="px-2 py-1 text-right">₹{{ item.unitPrice.toFixed(2) }}</td>
                    <td class="px-2 py-1 text-right font-semibold">₹{{ item.lineTotal.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-2 pt-2 border-t border-transparent text-right">
                <span class="text-sm font-semibold text-slate-100">
                  Subtotal: ₹{{ returnedItems.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2) }}
                </span>
              </div>
            </div>

            <!-- New Items Summary with Discounts -->
            <div class="rounded-lg border border-transparent p-3">
              <div class="text-sm font-semibold text-slate-200 mb-2">New Items Value (after discounts)</div>
              <table class="min-w-full text-xs">
                <thead class="dark-panel">
                  <tr>
                    <th class="px-2 py-1 text-left">Item</th>
                    <th class="px-2 py-1 text-right">Qty</th>
                    <th class="px-2 py-1 text-right">Unit Price</th>
                    <th class="px-2 py-1 text-right">Net Rate</th>
                    <th class="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in exchangedItems" :key="item.id">
                    <td class="px-2 py-1">{{ item.name }}</td>
                    <td class="px-2 py-1 text-right">{{ item.quantity }}</td>
                    <td class="px-2 py-1 text-right">
                      ₹{{ (productsStore.products.find(p => p.id === item.id)?.price ?? 0).toFixed(2) }}
                    </td>
                    <td class="px-2 py-1 text-right font-semibold">₹{{ (item.lineTotal / item.quantity).toFixed(2) }}</td>
                    <td class="px-2 py-1 text-right font-semibold">₹{{ item.lineTotal.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-2 pt-2 border-t border-transparent text-right">
                <span class="text-sm font-semibold text-slate-100">
                  Subtotal: ₹{{ exchangedItems.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2) }}
                </span>
              </div>
            </div>

            <!-- Exchange Summary -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg border border-transparent dark-panel p-3">
                <div class="text-xs text-slate-300">Returned Value</div>
                <div class="mt-1 text-lg font-semibold text-slate-100">₹{{ calculation.returnValue.toFixed(2) }}</div>
              </div>
              <div class="rounded-lg border border-transparent dark-panel p-3">
                <div class="text-xs text-slate-300">New Items Value</div>
                <div class="mt-1 text-lg font-semibold text-slate-100">₹{{ calculation.exchangeValue.toFixed(2) }}</div>
              </div>
            </div>

            <!-- Difference Display -->
            <div
              v-if="calculation.difference < 0"
              class="rounded-lg border border-orange-200 bg-orange-50 p-4"
            >
              <div class="text-sm font-semibold text-orange-800">Customer Pays (Difference)</div>
              <div class="mt-1 text-2xl font-bold text-orange-900">₹{{ calculation.customerPays.toFixed(2) }}</div>
              <div class="mt-2 text-xs text-orange-700">New items cost more. Customer must pay the difference.</div>
            </div>

            <div
              v-else-if="calculation.difference > 0"
              class="rounded-lg border border-green-200 bg-green-50 p-4"
            >
              <div class="text-sm font-semibold text-green-800">Customer Receives (Refund)</div>
              <div class="mt-1 text-2xl font-bold text-green-900">₹{{ calculation.customerReceives.toFixed(2) }}</div>
              <div class="mt-2 text-xs text-green-700">Returned items worth more. Customer will receive a refund.</div>
            </div>

            <div
              v-else
              class="rounded-lg border border-blue-200 bg-blue-50 p-4"
            >
              <div class="text-sm font-semibold text-blue-800">Even Exchange</div>
              <div class="mt-1 text-2xl font-bold text-blue-900">₹0.00</div>
              <div class="mt-2 text-xs text-blue-700">No balance due. Exchange is even.</div>
            </div>

            <div v-if="validation && validation.warnings.length > 0" class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div class="text-sm font-semibold text-yellow-800">Warnings</div>
              <ul class="mt-1 list-disc list-inside text-xs text-yellow-700">
                <li v-for="warning in validation.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>

            <div v-if="validation && !validation.valid" class="rounded-lg border border-red-200 bg-red-50 p-3">
              <div class="text-sm font-semibold text-red-800">Validation Errors</div>
              <ul class="mt-1 list-disc list-inside text-xs text-red-700">
                <li v-for="error in validation.errors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Step 4: Payment/Refund Selection -->
        <div v-if="currentStep === 4" class="space-y-4">
          <h3 class="text-lg font-semibold text-slate-100">Step 4: Payment & Refund Details</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-200">Refund Reason</label>
              <input
                v-model="refundReason"
                type="text"
                placeholder="e.g., Damaged item, wrong size, etc."
                class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div v-if="calculation && calculation.difference < 0">
              <label class="block text-sm font-medium text-slate-200">Payment Method</label>
              <select v-model="paymentType" class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Payment</option>
              </select>
              <p class="mt-1 text-xs text-slate-400">Customer will pay ₹{{ calculation.customerPays.toFixed(2) }} via this method.</p>
            </div>

            <div v-if="calculation && calculation.difference > 0">
              <label class="block text-sm font-medium text-slate-200">Refund Method</label>
              <select v-model="refundMethod" class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
                <option value="cash">Cash Refund</option>
                <option value="store_credit">Store Credit</option>
                <option value="wallet">Credit to Wallet</option>
              </select>
              <p class="mt-1 text-xs text-slate-400">Customer will receive ₹{{ calculation.customerReceives.toFixed(2) }} via this method.</p>
            </div>
          </div>
        </div>

        <!-- Step 5: Confirmation -->
        <div v-if="currentStep === 5" class="space-y-4">
          <h3 class="text-lg font-semibold text-slate-100">Step 5: Confirm Exchange</h3>
          
          <div class="rounded-lg border border-transparent dark-panel p-4">
            <div class="space-y-2 text-sm">
              <div><span class="font-semibold">Original Invoice:</span> #{{ originalSale?.invoiceNumber }}</div>
              <div><span class="font-semibold">Items Returning:</span> {{ returnedItems.length }} item(s)</div>
              <div><span class="font-semibold">Items Exchanging:</span> {{ exchangedItems.length }} item(s)</div>
              <div v-if="calculation">
                <span class="font-semibold">Difference:</span>
                <span :class="calculation.difference < 0 ? 'text-orange-600' : calculation.difference > 0 ? 'text-green-600' : 'text-blue-600'">
                  {{ calculation.difference < 0 ? `Customer pays ₹${calculation.customerPays.toFixed(2)}` : calculation.difference > 0 ? `Customer receives ₹${calculation.customerReceives.toFixed(2)}` : 'Even exchange - No balance' }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p class="text-sm text-yellow-800">
              <strong>Please confirm:</strong> This action will update inventory, create new invoices, and process payments/refunds.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-transparent px-6 py-4">
        <button
          v-if="currentStep > 1"
          type="button"
          class="rounded-md border border-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-slate-200 hover:dark-panel"
          @click="prevStep"
        >
          Previous
        </button>
        <div v-else />

        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-slate-200 hover:dark-panel"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            v-if="currentStep < totalSteps"
            type="button"
            class="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            @click="nextStep"
          >
            Next
          </button>
          <button
            v-else
            type="button"
            :disabled="isProcessing || !validation?.valid"
            class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            @click="handleConfirm"
          >
            {{ isProcessing ? 'Processing...' : 'Confirm Exchange' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

