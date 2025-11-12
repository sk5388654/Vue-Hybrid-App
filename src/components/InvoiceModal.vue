<script setup lang="ts">
import { ref } from 'vue'
import InvoicePrint from '@/components/InvoicePrint.vue'
import { exportInvoicePdf, printWindow } from '@/utils/print'

type DiscountMode = 'flat' | 'percent'

const props = defineProps<{
  shopName?: string
  shopLogoUrl?: string
  invoiceNumber: string
  datetime: string
  items: { name: string; quantity: number; unitPrice: number; lineDiscount: number; lineTotal: number }[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  total: number
  paymentType: string
  cashier: string
  customerName?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const printRef = ref<InstanceType<typeof InvoicePrint> | null>(null)

async function onDownloadPdf() {
  const barcodeDataUrl = await printRef.value?.getBarcodePngDataUrl()
  exportInvoicePdf({
    shopName: props.shopName || 'Shop POS',
    invoiceNumber: props.invoiceNumber,
    datetime: props.datetime,
    items: props.items,
    subtotal: props.subtotal,
    productDiscountTotal: props.productDiscountTotal,
    invoiceDiscountMode: props.invoiceDiscountMode,
    invoiceDiscountValue: props.invoiceDiscountValue,
    invoiceDiscountAmount: props.invoiceDiscountAmount,
    total: props.total,
    paymentType: props.paymentType,
    cashier: props.cashier,
    customerName: props.customerName,
    barcodeDataUrl,
  })
}

function onPrint() {
  printWindow()
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @keydown.ctrl.p.prevent.stop="onPrint">
    <div class="w-full max-w-3xl rounded-lg bg-white shadow-lg">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h3 class="text-base font-semibold text-gray-900">Invoice</h3>
        <button class="text-gray-500 hover:text-gray-700" @click="emit('close')">✕</button>
      </div>
      <div class="max-h-[70vh] overflow-auto p-4">
        <InvoicePrint
          ref="printRef"
          :shopName="shopName"
          :shopLogoUrl="shopLogoUrl"
          :invoiceNumber="invoiceNumber"
          :datetime="datetime"
          :items="items"
          :subtotal="subtotal"
          :productDiscountTotal="productDiscountTotal"
          :invoiceDiscountMode="invoiceDiscountMode"
          :invoiceDiscountValue="invoiceDiscountValue"
          :invoiceDiscountAmount="invoiceDiscountAmount"
          :total="total"
          :paymentType="paymentType"
          :cashier="cashier"
          :customerName="customerName"
        />
      </div>
      <div class="flex justify-end gap-2 border-t px-4 py-3">
        <button class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="emit('close')">Close</button>
        <button class="rounded-md border border-gray-300 px-4 py-2 text-sm" @click="onDownloadPdf">Download PDF</button>
        <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white" @click="onPrint">Print Invoice</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

