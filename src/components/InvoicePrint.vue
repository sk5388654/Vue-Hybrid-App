<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BarcodeDisplay from '@/components/BarcodeDisplay.vue'

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

const grandTotal = computed(() => props.total)

onMounted(() => {
  // ensure barcode is rendered before PDF export
})

defineExpose({
  async getBarcodePngDataUrl(): Promise<string | undefined> {
    const svgElement = document.querySelector('#invoice-print svg') as SVGSVGElement | null
    if (!svgElement) return
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    const dataUrl: string = await new Promise((resolve) => {
      img.onload = function () {
        const canvas = document.createElement('canvas')
        canvas.width = (svgElement as any).width?.baseVal?.value || 300
        canvas.height = (svgElement as any).height?.baseVal?.value || 80
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const url = canvas.toDataURL('image/png')
        resolve(url)
      }
      img.src = url
    })
    URL.revokeObjectURL(url)
    return dataUrl
  }
})
</script>

<template>
  <div id="invoice-print" class="mx-auto w-full max-w-2xl rounded-lg bg-white p-6 text-gray-900 print:rounded-none print:p-0">
    <div class="flex items-center gap-3 border-b pb-4">
      <img v-if="shopLogoUrl" :src="shopLogoUrl" alt="logo" class="h-10 w-10 rounded object-cover" />
      <div>
        <div class="text-lg font-semibold">{{ shopName || 'Shop POS' }}</div>
        <div class="text-xs text-gray-500">Invoice #{{ invoiceNumber }}</div>
      </div>
      <div class="ml-auto text-right text-sm text-gray-600">
        <div>{{ new Date(datetime).toLocaleString() }}</div>
        <div v-if="customerName">Customer: {{ customerName }}</div>
        <div>Cashier: {{ cashier }}</div>
      </div>
    </div>

    <div class="mt-4 overflow-hidden rounded border">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-gray-700">Item</th>
            <th class="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
            <th class="px-3 py-2 text-right font-medium text-gray-700">Unit</th>
            <th class="px-3 py-2 text-right font-medium text-gray-700">Discount</th>
            <th class="px-3 py-2 text-right font-medium text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(it, idx) in items" :key="idx">
            <td class="px-3 py-2">{{ it.name }}</td>
            <td class="px-3 py-2 text-right">{{ it.quantity }}</td>
            <td class="px-3 py-2 text-right">₹{{ it.unitPrice.toFixed(2) }}</td>
            <td class="px-3 py-2 text-right">₹{{ it.lineDiscount.toFixed(2) }}</td>
            <td class="px-3 py-2 text-right">₹{{ it.lineTotal.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 space-y-1 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-gray-600">Subtotal</span>
        <span class="font-medium text-gray-900">₹{{ subtotal.toFixed(2) }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">Product Discounts</span>
        <span class="font-medium text-gray-900">₹{{ productDiscountTotal.toFixed(2) }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">
          Invoice Discount
          ({{ invoiceDiscountMode === 'percent' ? `${invoiceDiscountValue}%` : `₹${invoiceDiscountValue.toFixed(2)}` }})
        </span>
        <span class="font-medium text-gray-900">₹{{ invoiceDiscountAmount.toFixed(2) }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-600">Payment</span>
        <span class="font-medium text-gray-900">{{ paymentType }}</span>
      </div>
      <div class="flex items-center justify-between text-base font-semibold">
        <span>Grand Total</span>
        <span>₹{{ grandTotal.toFixed(2) }}</span>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-center">
      <BarcodeDisplay ref="barcodeSvgRef" :value="invoiceNumber" />
    </div>

    <div class="mt-6 text-center text-sm text-gray-600">Thank you for your purchase!</div>
  </div>
</template>

<style scoped>
@media print {
  :global(body) {
    background: white !important;
  }
}
</style>

