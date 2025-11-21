<script setup lang="ts">
type DiscountMode = 'flat' | 'percent'

type CartItem = {
  id: number
  name: string
  gross: number
  lineDiscount: number
  lineTotal: number
  quantity: number
}

const props = defineProps<{
  items: CartItem[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  grandTotal: number
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div class="w-full max-w-lg rounded-lg dark-panel">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h3 class="text-base font-semibold text-slate-100">Receipt</h3>
        <button class="text-slate-400 hover:text-slate-200" @click="emit('cancel')">✕</button>
      </div>

      <div class="max-h-[60vh] overflow-y-auto p-4">
        <div class="text-sm text-slate-300">Date/Time: {{ new Date().toLocaleString() }}</div>
        <ul class="mt-3 divide-y divide-gray-100">
          <li v-for="item in props.items" :key="item.id" class="py-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-200">{{ item.name }} × {{ item.quantity }}</span>
              <span class="font-medium text-slate-100">Rs {{ item.lineTotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-xs text-slate-400">
              <span>Gross: Rs {{ item.gross.toFixed(2) }}</span>
              <span>Discount: Rs {{ item.lineDiscount.toFixed(2) }}</span>
            </div>
          </li>
        </ul>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-slate-300">Subtotal</span>
            <span class="font-medium text-slate-100">Rs {{ subtotal.toFixed(2) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-300">Product Discounts</span>
            <span class="font-medium text-slate-100">Rs {{ productDiscountTotal.toFixed(2) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-300">
              Invoice Discount
              ({{ invoiceDiscountMode === 'percent' ? `${invoiceDiscountValue}%` : `Rs ${invoiceDiscountValue}` }})
            </span>
            <span class="font-medium text-slate-100">Rs {{ invoiceDiscountAmount.toFixed(2) }}</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between border-t pt-3">
          <span class="text-sm font-medium text-slate-200">Grand Total</span>
          <span class="text-base font-semibold text-slate-100">Rs {{ grandTotal.toFixed(2) }}</span>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t px-4 py-3">
        <button class="rounded-md border border-[rgba(255,255,255,0.06)] px-4 py-2 text-sm text-slate-200 hover:dark-panel" @click="emit('cancel')">Cancel</button>
        <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="emit('confirm')">Confirm</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

