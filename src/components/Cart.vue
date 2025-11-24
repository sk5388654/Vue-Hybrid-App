<template>
  <div class="rounded-lg p-4 dark-panel">
    <h2 class="mb-4 text-lg font-semibold text-slate-100">Cart</h2>

    <div v-if="isEmpty" class="text-sm text-slate-400">Your cart is empty.</div>

    <ul v-else class="-mx-2 divide-y divide-gray-100 dark:divide-slate-700">
      <li
        v-for="item in props.items"
        :key="item.id"
        class="flex flex-col gap-2 px-2 py-3 rounded-md transition-colors"
        :class="selectedId === item.id
          ? 'dark:bg-[rgba(59,130,246,0.18)] dark:ring-2 dark:ring-indigo-500 bg-[rgba(59,130,246,0.08)] ring-2 ring-indigo-300'
          : ''"
        @click="emit('select', item.id)"
      >
        <div class="flex items-center gap-3">
          <img :src="item.image" :alt="item.name" class="h-12 w-12 rounded object-cover" />
          <div class="flex-1">
            <div class="text-sm font-medium text-slate-100">{{ item.name }}</div>
            <div class="text-xs text-slate-400">Price Rs {{ item.price.toFixed(2) }} × Qty {{ item.quantity }}</div>
            <div class="text-xs text-slate-400">Line Discount Rs {{ item.lineDiscount.toFixed(2) }}</div>
            <div class="text-xs font-semibold text-slate-100">Line Total Rs {{ item.lineTotal.toFixed(2) }}</div>
          </div>
          <div class="flex flex-col items-end gap-2">
            <input
              type="number"
              min="1"
              :max="item.stock"
              :value="item.quantity"
              @click.stop
              @input="emit('updateQty', item.id, Number(($event.target as HTMLInputElement).value))"
              class="w-20 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600/60 dark:bg-slate-700/50 dark:text-slate-100"
              :disabled="props.disabled"
            />
            <button
              @click.stop="emit('remove', item.id)"
              class="rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-xs text-slate-200 hover:dark-panel dark:border-slate-600/60 dark:text-slate-200 dark:hover:bg-slate-700/40"
              title="Delete"
              :disabled="props.disabled"
            >
              Remove
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-slate-300 dark:text-slate-300">Discount Type</label>
            <select
              :value="item.discountMode"
              @click.stop
              @change="onItemModeChange(item.id, ($event.target as HTMLSelectElement).value)"
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600/60 dark:bg-slate-700/50 dark:text-slate-100"
              :disabled="props.disabled"
            >
              <option value="flat">Flat</option>
              <option value="percent">Percent</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-300 dark:text-slate-300">Discount Value</label>
            <input
              :value="item.discountValue"
              type="number"
              min="0"
              step="0.01"
              @click.stop
              @input="onItemDiscountValue(item.id, ($event.target as HTMLInputElement).value)"
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600/60 dark:bg-slate-700/50 dark:text-slate-100"
              :disabled="props.disabled"
            />
          </div>
        </div>
      </li>
    </ul>

    <div class="mt-4 space-y-3 rounded-lg p-4 dark-panel" v-if="!isEmpty">
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-300 dark:text-slate-300">Subtotal</span>
        <span class="font-medium text-slate-100 dark:text-slate-100">Rs {{ subtotal.toFixed(2) }}</span>
      </div>
      <div class="rounded-md p-3 dark-panel">
        <div class="flex items-center justify-between gap-4 text-sm">
          <span class="text-slate-300 dark:text-slate-300">Invoice Discount</span>
          <div class="flex items-center gap-2">
            <select
              :value="invoiceDiscountMode"
              @change="onInvoiceModeChange($event)"
              class="rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600/60 dark:bg-slate-700/50 dark:text-slate-100"
              :disabled="props.disabled"
            >
              <option value="flat">Flat</option>
              <option value="percent">Percent</option>
            </select>
            <input
              :value="invoiceDiscountValue"
              type="number"
              min="0"
              step="0.01"
              @input="onInvoiceValueChange($event)"
              class="w-24 rounded-md border border-[rgba(255,255,255,0.06)] px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600/60 dark:bg-slate-700/50 dark:text-slate-100"
              :disabled="props.disabled"
            />
          </div>
        </div>
        <div class="mt-2 text-right text-xs text-slate-400">Discount Amount: Rs {{ invoiceDiscountAmount.toFixed(2) }}</div>
      </div>
      <div class="flex items-center justify-between text-base font-semibold text-slate-100 dark:text-slate-100">
        <span>Grand Total</span>
        <span>Rs {{ grandTotal.toFixed(2) }}</span>
      </div>
    </div>

    <button
      :disabled="isEmpty || props.disabled"
      @click="emit('checkout')"
      class="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:bg-gray-600"
      title="Checkout"
    >
      Checkout
    </button>
    <button
      :disabled="isEmpty || props.disabled"
      @click="emit('hold')"
      class="mt-2 w-full rounded-md border border-transparent px-4 py-2 text-sm font-medium text-slate-200 hover:bg-[rgba(255,255,255,0.02)] disabled:cursor-not-allowed disabled:opacity-60"
      title="Hold Sale"
    >
      Hold Sale
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type DiscountMode = 'flat' | 'percent'

type CartItem = {
  id: number
  name: string
  price: number
  quantity: number
  stock: number
  image: string
  discountMode: DiscountMode
  discountValue: number
  gross: number
  lineDiscount: number
  lineTotal: number
}

const props = defineProps<{
  items: CartItem[]
  subtotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  grandTotal: number
  selectedId: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'updateQty', id: number, quantity: number): void
  (e: 'remove', id: number): void
  (e: 'checkout'): void
  (e: 'hold'): void
  (e: 'select', id: number): void
  (e: 'updateItemDiscount', payload: { id: number; mode?: DiscountMode; value?: number }): void
  (e: 'updateInvoiceDiscountMode', mode: DiscountMode): void
  (e: 'updateInvoiceDiscountValue', value: number): void
}>()

const isEmpty = computed(() => props.items.length === 0)

function onItemModeChange(id: number, mode: string) {
  emit('updateItemDiscount', { id, mode: mode as DiscountMode })
}

function onItemDiscountValue(id: number, value: string) {
  const parsed = Number(value)
  emit('updateItemDiscount', { id, value: Number.isNaN(parsed) ? 0 : parsed })
}

function onInvoiceModeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as DiscountMode
  emit('updateInvoiceDiscountMode', value)
}

function onInvoiceValueChange(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('updateInvoiceDiscountValue', Number.isNaN(value) ? 0 : value)
}
</script>

<style scoped>
</style>

