<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSalesStore, type Sale } from '@/store/sales'
import InvoiceModal from '@/components/InvoiceModal.vue'

type InvoiceData = {
  invoiceNumber: string
  datetime: string
  items: { name: string; quantity: number; unitPrice: number; lineDiscount: number; lineTotal: number }[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: 'flat' | 'percent'
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  total: number
  paymentType: string
  cashier: string
  customerName?: string
}

const salesStore = useSalesStore()
const selected = ref<InvoiceData | null>(null)
const showInvoice = ref(false)

onMounted(() => {
  salesStore.load()
})

function openInvoice(sale: Sale) {
  const items = sale.items.map((item) => {
    const lineTotal = item.unitPrice * item.quantity
    return {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: 0,
      lineTotal,
    }
  })
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const discount = Math.max(0, subtotal - sale.total)
  selected.value = {
    invoiceNumber: sale.invoiceNumber,
    datetime: sale.datetime,
    items,
    subtotal,
    productDiscountTotal: 0,
    invoiceDiscountMode: 'flat',
    invoiceDiscountValue: discount,
    invoiceDiscountAmount: discount,
    total: sale.total,
    paymentType: sale.paymentType,
    cashier: sale.cashier,
    customerName: sale.customerName,
  }
  showInvoice.value = true
}
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <h2 class="mb-3 text-lg font-semibold text-gray-800">Sales History</h2>
    <div v-if="salesStore.sales.length === 0" class="text-sm text-gray-500">No invoices yet.</div>
    <ul v-else class="divide-y divide-gray-100">
      <li v-for="s in salesStore.sales" :key="s.id" class="flex items-center justify-between py-2 text-sm">
        <div>
          <div class="font-medium text-gray-900">#{{ s.invoiceNumber }}</div>
          <div class="text-gray-600">{{ new Date(s.datetime).toLocaleString() }} • ₹{{ s.total.toFixed(2) }} • {{ s.paymentType }}</div>
        </div>
        <button class="rounded-md border border-gray-300 px-3 py-1 text-xs" @click="openInvoice(s)">View/Print</button>
      </li>
    </ul>
  </div>

  <InvoiceModal
    v-if="showInvoice && selected"
    :invoiceNumber="selected.invoiceNumber"
    :datetime="selected.datetime"
    :items="selected.items"
    :subtotal="selected.subtotal"
    :productDiscountTotal="selected.productDiscountTotal"
    :invoiceDiscountMode="selected.invoiceDiscountMode"
    :invoiceDiscountValue="selected.invoiceDiscountValue"
    :invoiceDiscountAmount="selected.invoiceDiscountAmount"
    :total="selected.total"
    :paymentType="selected.paymentType"
    :cashier="selected.cashier"
    :customerName="selected.customerName"
    @close="showInvoice = false"
  />
</template>

<style scoped>
</style>

