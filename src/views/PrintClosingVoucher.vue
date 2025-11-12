<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useClosingVoucherStore } from '@/store/closingVouchers'
import { useStoresStore } from '@/store/stores'

const route = useRoute()
const store = useClosingVoucherStore()
const storesStore = useStoresStore()
const voucherId = route.params.id as string

onMounted(() => {
  storesStore.load()
  store.setCurrentStore()
})

const voucher = computed(() => store.vouchers.find(v => v.id === voucherId))
const discounts = computed(() => voucher.value?.discounts ?? 0)
const refunds = computed(() => voucher.value?.refunds ?? 0)
const expenses = computed(() => voucher.value?.expenses ?? 0)
const expectedCash = computed(() => voucher.value?.expectedClosingCash ?? 0)
const actualCash = computed(() => voucher.value?.actualClosingCash ?? 0)
const difference = computed(() => voucher.value?.difference ?? actualCash.value - expectedCash.value)

const doPrint = () => {
  window.print()
}
</script>

<template>
  <div v-if="voucher" class="print-page mx-auto max-w-2xl bg-white p-8 text-sm text-gray-800">
    <h1 class="text-xl font-semibold text-center">POS Closing Voucher</h1>
    <p class="text-center text-xs text-gray-500 mb-6">
      Generated {{ new Date(voucher.createdAt).toLocaleString() }}
    </p>

    <dl class="grid grid-cols-2 gap-2">
      <dt class="font-medium text-gray-600">Store</dt>
      <dd>{{ voucher.storeName }}</dd>
      <dt class="font-medium text-gray-600">Cashier</dt>
      <dd>{{ voucher.cashierName }}</dd>
      <dt class="font-medium text-gray-600">Shift Start</dt>
      <dd>{{ new Date(voucher.shiftStart).toLocaleString() }}</dd>
      <dt class="font-medium text-gray-600">Shift End</dt>
      <dd>{{ new Date(voucher.shiftEnd).toLocaleString() }}</dd>
    </dl>

    <hr class="my-4" />

    <table class="w-full text-sm">
      <tbody class="divide-y">
        <tr>
          <td class="py-2">Opening Cash</td>
          <td class="py-2 text-right">Rs {{ voucher.openingCash.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2 font-medium text-gray-700">Total Sales</td>
          <td class="py-2 text-right font-medium">Rs {{ voucher.totalSales.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2">Discounts</td>
          <td class="py-2 text-right">Rs {{ discounts.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2">Refunds</td>
          <td class="py-2 text-right text-red-600">Rs {{ refunds.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2">Expenses</td>
          <td class="py-2 text-right text-red-600">Rs {{ expenses.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2 font-medium text-gray-700">Expected Closing Cash</td>
          <td class="py-2 text-right font-medium">Rs {{ expectedCash.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2 font-medium text-gray-700">Actual Cash</td>
          <td class="py-2 text-right font-medium">Rs {{ actualCash.toFixed(2) }}</td>
        </tr>
        <tr>
          <td class="py-2 font-semibold">Difference</td>
          <td
            class="py-2 text-right font-semibold"
            :class="difference === 0 ? 'text-green-600' : 'text-red-600'"
          >
            Rs {{ difference.toFixed(2) }}
          </td>
        </tr>
      </tbody>
    </table>

    <hr class="my-4" />

    <p><strong>Remarks:</strong> {{ voucher.remarks || '-' }}</p>

    <div class="mt-6 grid grid-cols-2 gap-6">
      <div class="border-t pt-4 text-center">
        <p class="text-xs uppercase text-gray-500">Cashier Signature</p>
      </div>
      <div class="border-t pt-4 text-center">
        <p class="text-xs uppercase text-gray-500">
          Manager {{ voucher.managerApproved ? 'Approved' : 'Pending' }}
        </p>
      </div>
    </div>

    <button class="mt-8 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white" @click="doPrint">
      Print
    </button>
  </div>
  <div v-else class="p-10 text-center text-red-600">Voucher not found.</div>
</template>

<style scoped>
.print-page {
  position: relative;
  z-index: 100;
  background: #fff;
}

@media print {
  :global(body) {
    background: #fff !important;
  }
  :global(#app .min-h-screen) {
    background: #fff !important;
  }
  :global(#app .min-h-screen > :not(.print-container)) {
    display: none !important;
  }
  :global(#app .print-container main) {
    padding: 0 !important;
    margin: 0 !important;
  }
  :global(#app .print-container) {
    display: block !important;
  }
}
</style>
