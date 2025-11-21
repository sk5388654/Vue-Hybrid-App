<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { exportInvoicePdf, exportRefundPdf } from '@/utils/print'
import type { RefundRecord } from '@/store/refunds'
import type { Sale } from '@/store/sales'
import { useSalesStore } from '@/store/sales'
import { useStoresStore } from '@/store/stores'

const props = defineProps<{
  refund: RefundRecord
  sale: Sale
  existingRefunds: RefundRecord[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const storesStore = useStoresStore()
const salesStore = useSalesStore()

onMounted(() => {
  if (!storesStore.stores.length) {
    storesStore.load()
  }
  if (!salesStore.sales.length) {
    salesStore.load()
  }
})

const storeName = computed(() => {
  const store = storesStore.stores.find((s) => s.id === props.refund.storeId)
  return store?.name ?? 'Store POS'
})

const priorRefunds = computed(() =>
  props.existingRefunds.filter((record) => record.refundId !== props.refund.refundId),
)

const totalRefunded = computed(() =>
  props.existingRefunds.reduce((sum, record) => sum + record.totalRefund, 0),
)

const exchangeDifferenceLabel = computed(() => {
  if (!props.refund.exchangeDifference || props.refund.exchangeDifference === 0) return null
  if (props.refund.exchangeDifference > 0) {
    return `Balance refunded to customer: ₹${props.refund.exchangeDifference.toFixed(2)}`
  }
  return `Customer paid difference: ₹${Math.abs(props.refund.exchangeDifference).toFixed(2)}`
})

const exchangeSale = computed(() => {
  if (!props.refund.exchangeSaleId) return null
  return salesStore.sales.find((record) => record.id === props.refund.exchangeSaleId) ?? null
})

function handlePrint() {
  if (props.refund.refundType === 'exchange' && exchangeSale.value) {
    const saleRecord = exchangeSale.value
    exportInvoicePdf({
      shopName: storeName.value,
      invoiceNumber: saleRecord.invoiceNumber,
      datetime: saleRecord.datetime,
      items: saleRecord.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
      })),
      subtotal: saleRecord.subtotal,
      productDiscountTotal: saleRecord.productDiscountTotal,
      invoiceDiscountMode: saleRecord.invoiceDiscountMode,
      invoiceDiscountValue: saleRecord.invoiceDiscountValue,
      invoiceDiscountAmount: saleRecord.invoiceDiscountAmount,
      total: saleRecord.total,
      paymentType: saleRecord.paymentType,
      cashier: saleRecord.cashier,
      customerName: saleRecord.customerName,
    })
    return
  }

  exportRefundPdf({
    storeName: storeName.value,
    refundId: props.refund.refundId,
    invoiceNumber: props.refund.invoiceNumber,
    refundType: props.refund.refundType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    refundMethod: props.refund.refundMethod,
    refundReason: props.refund.refundReason,
    cashier: props.refund.cashier,
    refundDate: props.refund.createdAt,
    refundedItems: props.refund.refundedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    exchangedItems: props.refund.exchangedItems?.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    totalRefund: props.refund.totalRefund,
    exchangeDifference: props.refund.exchangeDifference,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-3xl rounded-lg dark-panel">
      <div class="flex items-center justify-between border-b border-transparent px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">Refund Receipt</h2>
          <p class="text-xs text-slate-400">Refund {{ refund.refundId }} • Invoice #{{ refund.invoiceNumber }}</p>
        </div>
        <button
          class="rounded-md border border-transparent px-3 py-1 text-xs text-slate-300 hover:dark-panel"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="px-6 py-4 text-sm text-slate-200">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Store</div>
            <div class="font-semibold text-slate-100">{{ storeName }}</div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Refund Date</div>
            <div>{{ new Date(refund.createdAt).toLocaleString() }}</div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Cashier</div>
            <div>{{ refund.cashier }}</div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Refund Type</div>
            <div class="font-semibold text-slate-100">
              {{ refund.refundType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) }}
            </div>
          </div>
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400">Method</div>
            <div>{{ refund.refundMethod }}</div>
          </div>
          <div v-if="refund.refundReason">
            <div class="text-xs uppercase tracking-wide text-slate-400">Reason</div>
            <div>{{ refund.refundReason }}</div>
          </div>
        </div>

        <div class="mt-6 overflow-hidden rounded-lg border border-transparent">
          <div class="dark-panel px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Refunded Items
          </div>
          <table class="min-w-full text-sm">
            <thead class="bg-white text-slate-400">
              <tr>
                <th class="px-4 py-2 text-left font-medium">Item</th>
                <th class="px-4 py-2 text-right font-medium">Qty</th>
                <th class="px-4 py-2 text-right font-medium">Unit Price</th>
                <th class="px-4 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="item in refund.refundedItems" :key="`${item.id}-${item.quantity}`">
                <td class="px-4 py-2 text-slate-100">{{ item.name }}</td>
                <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-right">₹{{ item.unitPrice.toFixed(2) }}</td>
                <td class="px-4 py-2 text-right font-medium">₹{{ item.lineTotal.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="refund.exchangedItems && refund.exchangedItems.length"
          class="mt-6 overflow-hidden rounded-lg border border-transparent"
        >
          <div class="bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Replacement Items
          </div>
          <table class="min-w-full text-sm">
            <thead class="bg-white text-slate-400">
              <tr>
                <th class="px-4 py-2 text-left font-medium">Item</th>
                <th class="px-4 py-2 text-right font-medium">Qty</th>
                <th class="px-4 py-2 text-right font-medium">Unit Price</th>
                <th class="px-4 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="item in refund.exchangedItems" :key="`${item.id}-${item.quantity}`">
                <td class="px-4 py-2 text-slate-100">{{ item.name }}</td>
                <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-right">₹{{ item.unitPrice.toFixed(2) }}</td>
                <td class="px-4 py-2 text-right font-medium">₹{{ item.lineTotal.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6 rounded-lg border border-transparent dark-panel px-4 py-3 text-sm text-slate-200">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-100">Refund Total</span>
            <span class="text-lg font-semibold text-slate-100">₹{{ refund.totalRefund.toFixed(2) }}</span>
          </div>
          <div v-if="exchangeDifferenceLabel" class="mt-2 text-sm text-slate-300">
            {{ exchangeDifferenceLabel }}
          </div>
          <div class="mt-2 text-xs text-slate-400">
            Total refunded for this invoice so far: ₹{{ totalRefunded.toFixed(2) }}
          </div>
          <div v-if="priorRefunds.length" class="mt-2 text-xs text-slate-400">
            Previous refunds:
            <span class="font-medium text-slate-200">
              {{ priorRefunds.map((r) => r.refundId).join(', ') }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-transparent dark-panel px-6 py-4">
        <p class="text-xs text-slate-400">Keep this receipt for audit and closing voucher summaries.</p>
        <button
          class="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700"
          type="button"
          @click="handlePrint"
        >
          Print Refund Receipt
        </button>
      </div>
    </div>
  </div>
</template>

