<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RefundReceiptModal from './RefundReceiptModal.vue'
import ExchangeModal from './ExchangeModal.vue'
import { useSalesStore } from '@/store/sales'
import { useRefundsStore, type RefundRecord, type RefundType } from '@/store/refunds'
import { useProductsStore } from '@/store/products'
import { useRefunds } from '@/composables/useRefunds'

const route = useRoute()
const router = useRouter()
const salesStore = useSalesStore()
const refundsStore = useRefundsStore()
const productsStore = useProductsStore()

const {
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
} = useRefunds()

const invoiceQuery = ref('')
const showDropdown = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)
const showReceiptModal = ref(false)
const showExchangeModal = ref(false)
const processedRefund = ref<RefundRecord | null>(null)
const isConfirming = ref(false)

const saleOptions = computed(() =>
  [...salesStore.sales].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
)

const filteredSales = computed(() => {
  const query = invoiceQuery.value.trim().toLowerCase()
  if (!query) return saleOptions.value
  return saleOptions.value.filter((sale) => {
    const invoiceMatch = sale.invoiceNumber.toLowerCase().includes(query)
    const customerMatch = sale.customerName?.toLowerCase().includes(query)
    const itemMatch = sale.items.some((item) => item.name.toLowerCase().includes(query))
    return invoiceMatch || customerMatch || itemMatch
  })
})

const refundTypeOptions: { label: string; value: RefundType }[] = [
  { label: 'Full Return', value: 'full_return' },
  { label: 'Partial Return', value: 'partial_return' },
  { label: 'Exchange', value: 'exchange' },
  { label: 'Cash Refund', value: 'cash_refund' },
]

const refundType = computed({
  get: () => state.refundType,
  set: (val: RefundType) => setRefundType(val),
})

const refundReason = computed({
  get: () => state.reason,
  set: (val: string) => {
    state.reason = val
  },
})

const canSubmit = computed(() => {
  if (!sale.value) return false
  if (state.isProcessing) return false
  switch (state.refundType) {
    case 'full_return':
      return state.returnQuantities.size > 0
    case 'partial_return':
    case 'cash_refund':
      return state.returnQuantities.size > 0
    case 'exchange':
      return state.exchangeReturnQuantities.size > 0 && state.exchangeNewQuantities.size > 0
    default:
      return false
  }
})

const refundsList = computed(() => refundsStore.refundsForCurrentStore.slice().reverse())

function closeDropdown(e?: MouseEvent) {
  if (!dropdownRef.value) return
  if (e && dropdownRef.value.contains(e.target as Node)) return
  showDropdown.value = false
}

function handleSelectSale(id: string) {
  selectSale(id)
  const invoice = saleOptions.value.find((s) => s.id === id)
  invoiceQuery.value = invoice?.invoiceNumber ?? ''
  showDropdown.value = false
}

function handleQuantityInput(productId: number, value: string) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  setReturnQuantity(productId, numeric)
}

function handleExchangeQuantity(productId: number, value: string) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  setReturnQuantity(productId, numeric)
}

function handleExchangeNewQuantity(productId: number, value: string) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return
  setExchangeNewQuantity(productId, numeric)
}

function resetForm() {
  invoiceQuery.value = ''
  processedRefund.value = null
  showReceiptModal.value = false
  resetState()
}

function confirmMessage(): string {
  if (!sale.value) return 'Confirm refund?'
  const invoice = sale.value.invoiceNumber
  if (state.refundType === 'exchange') {
    if (summary.value.balanceToCustomer > 0) {
      return `Confirm exchange for invoice #${invoice}? Refund ₹${summary.value.balanceToCustomer.toFixed(2)} to customer.`
    }
    if (summary.value.balanceFromCustomer > 0) {
      return `Confirm exchange for invoice #${invoice}? Customer must pay ₹${summary.value.balanceFromCustomer.toFixed(2)}.`
    }
    return `Confirm exchange for invoice #${invoice}?`
  }
  return `Are you sure you want to refund ${summary.value.totalReturnQuantity} item(s) from invoice #${invoice}?`
}

async function submitRefund() {
  if (!canSubmit.value || isConfirming.value) return
  const ok = window.confirm(confirmMessage())
  if (!ok) return
  isConfirming.value = true
  const result = await processRefund()
  if (result?.refundRecord) {
    processedRefund.value = result.refundRecord
    showReceiptModal.value = true
    selectSale(result.refundRecord.saleId)
    success.value = result.message
  }
  isConfirming.value = false
}

function handleReceiptClose() {
  showReceiptModal.value = false
  processedRefund.value = null
}

function openExchangeModal() {
  if (!sale.value) {
    error.value = 'Please select an invoice first.'
    return
  }
  showExchangeModal.value = true
}

function handleExchangeConfirm(data: {
  returnedItems: any[]
  exchangedItems: any[]
  refundReason: string
  refundMethod: 'cash' | 'store_credit' | 'wallet'
  paymentType: 'cash' | 'card' | 'mobile'
}) {
  isConfirming.value = true
  processExchangeRefund(
    data.returnedItems,
    data.exchangedItems,
    data.refundReason || undefined,
    data.refundMethod,
    data.paymentType
  ).then((result) => {
    if (result?.success) {
      // Find the refund record that was created
      refundsStore.load()
      const latestRefund = refundsStore.refundsForCurrentStore
        .filter((r) => r.saleId === sale.value?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      
      if (latestRefund) {
        processedRefund.value = latestRefund
        showReceiptModal.value = true
      }
      showExchangeModal.value = false
    }
    isConfirming.value = false
  })
}

function handleExchangeClose() {
  showExchangeModal.value = false
}

function prefillFromRoute() {
  const invoiceId = route.query.invoice as string | undefined
  if (!invoiceId) return
  const match = salesStore.sales.find((sale) => sale.invoiceNumber === invoiceId || sale.id === invoiceId)
  if (match) {
    handleSelectSale(match.id)
    autoSelectFullReturn()
  }
}

onMounted(() => {
  salesStore.load()
  productsStore.load()
  refundsStore.load()
  document.addEventListener('click', closeDropdown)
  // Clear invoice query on mount (refresh)
  invoiceQuery.value = ''
  prefillFromRoute()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})

watch(
  () => route.query.invoice,
  () => prefillFromRoute(),
)
</script>

<template>
  <div class="space-y-6">
    <!-- Steps -->
    <section class="grid gap-4 lg:grid-cols-3">
      <div class="glass-panel space-y-2 border border-blue-100 bg-blue-50/60 dark:bg-[rgba(14,23,32,0.6)] dark:border-blue-900">
        <div class="subtle-label dark:text-slate-400 text-slate-600">Step 1</div>
        <h2 class="section-heading dark:text-slate-100">Select invoice</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Search invoices, customers, or items to start a refund workflow.</p>
      </div>
      <div class="glass-panel space-y-2 border border-emerald-100 bg-emerald-50/70 dark:bg-[rgba(14,23,32,0.6)] dark:border-emerald-900">
        <div class="subtle-label dark:text-slate-400 text-slate-600">Step 2</div>
        <h2 class="section-heading dark:text-slate-100">Choose refund type</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Switch between full, partial, exchange, or cash refunds anytime.</p>
      </div>
      <div class="glass-panel space-y-2 border border-amber-100 bg-amber-50/70 dark:bg-[rgba(14,23,32,0.6)] dark:border-amber-900">
        <div class="subtle-label dark:text-slate-400 text-slate-600">Step 3</div>
        <h2 class="section-heading dark:text-slate-100">Review & confirm</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Totals, balances, and inventory updates stay in sync automatically.</p>
      </div>
    </section>

    <!-- Main form -->
    <section class="glass-panel space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="section-heading dark:text-slate-100">Refund Details</h3>
        <button class="quick-filter text-xs" type="button" @click="resetForm">Reset</button>
      </div>

      <div v-if="error" class="rounded-2xl border border-red-100 bg-red-50/80 dark:bg-red-900/40 dark:border-red-700 px-4 py-2 text-sm text-red-700 dark:text-red-300">
        {{ error }}
      </div>
      <div v-if="success" class="rounded-2xl border border-emerald-100 bg-emerald-50/80 dark:bg-emerald-900/30 dark:border-emerald-700 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-200">
        {{ success }}
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <!-- Invoice selector -->
        <div class="relative lg:col-span-2" ref="dropdownRef">
          <label class="subtle-label dark:text-slate-400">Invoice</label>
          <input
            v-model="invoiceQuery"
            type="search"
            placeholder="Search invoice, customer, or product"
            class="input-field dark:bg-slate-800 dark:text-slate-100"
            @focus="showDropdown = true"
            @input="showDropdown = true"
          />
          <div
            v-if="showDropdown && filteredSales.length"
            class="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 invoice-dropdown"
          >
            <button
              v-for="inv in filteredSales"
              :key="inv.id"
              type="button"
              class="flex w-full items-start justify-between px-4 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-900/40"
              @click="handleSelectSale(inv.id)"
            >
              <span>
                <span class="inv-number font-semibold">#{{ inv.invoiceNumber }}</span>
                <span class="ml-2 text-slate-500 dark:text-slate-300">₹{{ inv.total.toFixed(2) }}</span>
                <span class="block inv-date">{{ new Date(inv.datetime).toLocaleString() }}</span>
              </span>
              <span class="ml-2 text-slate-400 dark:text-slate-300 payment-type">{{ inv.paymentType }}</span>
            </button>
          </div>
        </div>

        <!-- Refund type -->
        <div>
          <label class="subtle-label dark:text-slate-400">Refund Type</label>
          <select
            v-model="refundType"
            class="input-field dark:bg-slate-800 dark:text-slate-100"
          >
            <option v-for="option in refundTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <!-- Refund method -->
        <div>
          <label class="subtle-label dark:text-slate-400">Refund Method</label> 
          <div class="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            {{ summary.refundMethod }}
          </div>
        </div>

        <!-- Refund reason -->
        <div>
          <label class="subtle-label dark:text-slate-400">Refund Reason</label>
          <input
            v-model="refundReason"
            type="text"
            placeholder="Damaged item, wrong size, etc."
            class="input-field dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <!-- Selected sale summary -->
      <div v-if="sale" class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:bg-slate-800 dark:border-slate-700">
        <div class="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
          <div><span class="font-semibold text-slate-900 dark:text-slate-100">Invoice:</span> #{{ sale.invoiceNumber }}</div>
          <div><span class="font-semibold text-slate-900 dark:text-slate-100">Date:</span> {{ new Date(sale.datetime).toLocaleString() }}</div>
          <div><span class="font-semibold text-slate-900 dark:text-slate-100">Payment:</span> {{ sale.paymentType }}</div>
          <div v-if="sale.customerName"><span class="font-semibold text-slate-900 dark:text-slate-100">Customer:</span> {{ sale.customerName }}</div>
          <div><span class="font-semibold text-slate-900 dark:text-slate-100">Total:</span> ₹{{ sale.total.toFixed(2) }}</div>
        </div>
      </div>

      <!-- Refund items & tables -->
      <div v-if="sale" class="mt-6 space-y-6">
        <div v-if="refundType !== 'exchange'" class="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700">
          <table class="table-modern w-full">
            <thead class="bg-white dark:bg-slate-800">
              <tr>
                <th class="text-left">Item</th>
                <th class="text-right">Purchased</th>
                <th class="text-right">Refunded</th>
                <th class="text-right">Available</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Return Qty</th>
                <th class="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in refundableItems" :key="item.productId">
                <td class="font-medium text-slate-900 dark:text-slate-100">{{ item.name }}</td>
                <td class="text-right text-slate-400 dark:text-slate-300">{{ item.purchasedQty }}</td>
                <td class="text-right text-slate-500 dark:text-slate-400">{{ item.refundedQty }}</td>
                <td class="text-right text-slate-400 dark:text-slate-300">{{ item.remainingQty }}</td>
                <td class="text-right text-slate-400 dark:text-slate-300">₹{{ item.unitPrice.toFixed(2) }}</td>
                <td class="text-right">
                  <input
                    :disabled="refundType === 'full_return'"
                    :value="state.returnQuantities.get(item.productId) ?? item.remainingQty"
                    :max="item.remainingQty"
                    min="0"
                    type="number"
                    class="input-field w-24 rounded-full text-right disabled:bg-slate-100 dark:disabled:bg-slate-700"
                    @input="handleQuantityInput(item.productId, ($event.target as HTMLInputElement).value)"
                  />
                </td>
                <td class="text-right font-semibold text-slate-900 dark:text-slate-100">
                  ₹{{
                    ((state.returnQuantities.get(item.productId) ?? item.remainingQty) * item.unitPrice).toFixed(2)
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Exchange layout -->
        <div v-else class="grid gap-4 lg:grid-cols-2">
          <div class="overflow-hidden rounded-lg border border-transparent">
            <div class="dark-panel px-4 py-2 text-sm font-semibold text-slate-200">Items Being Returned</div>
            <div class="max-h-72 overflow-auto">
              <table class="min-w-full text-xs">
                <thead class="sticky top-0 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">Item</th>
                    <th class="px-3 py-2 text-right font-medium">Available</th>
                    <th class="px-3 py-2 text-right font-medium">Return Qty</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr v-for="item in refundableItems" :key="item.productId">
                    <td class="px-3 py-2 font-medium text-slate-100 dark:text-slate-100">{{ item.name }}</td>
                    <td class="px-3 py-2 text-right text-slate-300 dark:text-slate-300">{{ item.remainingQty }}</td>
                    <td class="px-3 py-2 text-right">
                      <input
                        :value="state.exchangeReturnQuantities.get(item.productId) ?? 0"
                        :max="item.remainingQty"
                        min="0"
                        type="number"
                        class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-right text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-slate-800 dark:text-slate-100"
                        @input="handleExchangeQuantity(item.productId, ($event.target as HTMLInputElement).value)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-transparent">
            <div class="dark-panel px-4 py-2 text-sm font-semibold text-slate-200">Replacement Items</div>
            <div class="max-h-72 overflow-auto">
              <table class="min-w-full text-xs">
                <thead class="sticky top-0 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">Product</th>
                    <th class="px-3 py-2 text-right font-medium">Stock</th>
                    <th class="px-3 py-2 text-right font-medium">Exchange Qty</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr v-for="product in productsStore.products" :key="product.id">
                    <td class="px-3 py-2 font-medium text-slate-100 dark:text-slate-100">{{ product.name }}</td>
                    <td class="px-3 py-2 text-right text-slate-300 dark:text-slate-300">{{ product.stock }}</td>
                    <td class="px-3 py-2 text-right">
                      <input
                        :value="state.exchangeNewQuantities.get(product.id) ?? 0"
                        :max="product.stock"
                        min="0"
                        type="number"
                        class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-right text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-slate-800 dark:text-slate-100"
                        @input="handleExchangeNewQuantity(product.id, ($event.target as HTMLInputElement).value)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="rounded-lg border border-transparent p-4 dark:bg-slate-800 dark:border-slate-700">
          <h4 class="text-base font-semibold text-slate-100">Refund Summary</h4>
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
              <div class="font-medium uppercase tracking-wide text-xs text-orange-600 dark:text-orange-300">Items Refunded</div>
              <div class="text-lg font-semibold">{{ summary.totalReturnQuantity }}</div>
            </div>
            <div class="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
              <div class="font-medium uppercase tracking-wide text-xs text-orange-600 dark:text-orange-300">Refund Amount</div>
              <div class="text-lg font-semibold">₹{{ summary.totalReturnValue.toFixed(2) }}</div>
            </div>
            <div v-if="refundType === 'exchange'" class="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              <div class="font-medium uppercase tracking-wide text-xs text-blue-600 dark:text-blue-300">Replacement Value</div>
              <div class="text-lg font-semibold">₹{{ summary.totalExchangeValue.toFixed(2) }}</div>
            </div>
            <div
              v-if="refundType === 'exchange' && summary.balanceToCustomer > 0"
              class="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200"
            >
              <div class="font-medium uppercase tracking-wide text-xs text-green-600 dark:text-green-300">Refund To Customer</div>
              <div class="text-lg font-semibold">₹{{ summary.balanceToCustomer.toFixed(2) }}</div>
            </div>
            <div
              v-if="refundType === 'exchange' && summary.balanceFromCustomer > 0"
              class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
            >
              <div class="font-medium uppercase tracking-wide text-xs text-red-600 dark:text-red-300">Customer Pays</div>
              <div class="text-lg font-semibold">₹{{ summary.balanceFromCustomer.toFixed(2) }}</div>
            </div>
          </div>
          <div v-if="summary.reason" class="mt-3 text-sm text-slate-300 dark:text-slate-300">
            <span class="font-medium text-slate-200 dark:text-slate-200">Reason:</span> {{ summary.reason }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            class="rounded-md border border-[rgba(255,255,255,0.06)] px-4 py-2 text-sm text-slate-200 hover:dark-panel dark:border-slate-700"
            type="button"
            @click="resetForm"
          >
            Cancel
          </button>
          <button
            v-if="refundType === 'exchange'"
            :disabled="!sale"
            class="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            type="button"
            @click="openExchangeModal"
          >
            Start Exchange Process
          </button>
          <button
            v-else
            :disabled="!canSubmit || state.isProcessing"
            class="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-gray-600"
            type="button"
            @click="submitRefund"
          >
            {{ state.isProcessing ? 'Processing...' : 'Process Refund' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Refund History -->
    <section class="glass-panel p-4 refund-history">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 title">Refund History</h3>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-300 subtitle">Most recent refunds for this store.</p>

      <div v-if="refundsList.length === 0" class="mt-4 text-sm text-slate-600 dark:text-slate-400">No refunds recorded yet.</div>

      <ul v-else class="mt-4 max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 text-sm">
        <li v-for="refund in refundsList" :key="refund.refundId" class="py-3">
          <div class="flex flex-wrap justify-between gap-2">
            <div class="pr-4">
              <div class="font-semibold text-slate-900 dark:text-slate-100 title">
                {{ refund.refundType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) }}
                • {{ refund.refundId }}
              </div>
              <div class="text-xs text-slate-400 dark:text-slate-300 meta">
                {{ new Date(refund.createdAt).toLocaleString() }} • Invoice #{{ refund.invoiceNumber }}
              </div>
              <div class="mt-1 text-xs text-slate-400 dark:text-slate-300 meta">Cashier: {{ refund.cashier }}</div>
              <div v-if="refund.refundReason" class="mt-1 text-xs text-slate-400 dark:text-slate-300 meta">Reason: {{ refund.refundReason }}</div>
            </div>

            <div class="text-right">
              <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 amount">₹{{ refund.totalRefund.toFixed(2) }}</div>
              <div v-if="refund.exchangeDifference" class="text-xs text-slate-400 dark:text-slate-300">
                Net Δ ₹{{ refund.exchangeDifference.toFixed(2) }}
              </div>
              <div class="text-xs text-slate-400 dark:text-slate-300">{{ refund.refundMethod }}</div>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>

  <RefundReceiptModal
    v-if="showReceiptModal && processedRefund && sale"
    :refund="processedRefund"
    :sale="sale"
    :existingRefunds="existingRefunds"
    @close="handleReceiptClose"
  />

  <ExchangeModal
    v-if="showExchangeModal"
    :original-sale="sale"
    :show="showExchangeModal"
    @close="handleExchangeClose"
    @confirm="handleExchangeConfirm"
  />
</template>

<style>
/* Theme-aware overrides for RefundManager. Use CSS variables defined in `src/assets/main.css` so
  these rules follow the `:root` / `:root.dark` semantic variables rather than relying on
  Tailwind's `dark:` utilities (which may be configured for media queries). */
.refund-history { color: var(--text-primary); }
.refund-history .title { color: var(--text-primary); }
.refund-history .subtitle,
.refund-history .meta { color: var(--text-secondary); }
.refund-history .amount { color: var(--text-primary); }

.invoice-dropdown { background: var(--panel); color: var(--text-primary); border: 1px solid var(--border-color); }
.invoice-dropdown button { color: var(--text-primary); }
.invoice-dropdown .payment-type { color: var(--text-secondary); }
.invoice-dropdown .inv-date { color: var(--text-primary); font-size: 0.78rem; }
.invoice-dropdown .inv-number { color: var(--text-primary); }

/* Hover style: use semantic hover color when available, fallback to subtle tint.
   This avoids Tailwind's `hover:bg-blue-50` making a bright white hover in dark mode. */
.invoice-dropdown button:hover {
  background: var(--hover-bg, rgba(0,0,0,0.04));
  color: var(--text-primary);
}

/* Make sure list separators remain subtle in both themes */
.refund-history ul li { border-color: rgba(255,255,255,0.03); }
</style>

<style scoped>
/* If you want to centralize dark colors later, create utility classes (dark-panel, etc.) in a global stylesheet.
  For now we've used inline utility classes to ensure dark mode correctness everywhere. */
</style>
