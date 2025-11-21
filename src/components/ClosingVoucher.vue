<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect, watch } from 'vue'
import { useClosingVoucherStore } from '@/store/closingVouchers'
import { useStoresStore } from '@/store/stores'
import { useAuthStore } from '@/store/auth'
import { useSalesStore } from '@/store/sales'
import { useExpensesStore } from '@/store/expenses'
import { useRefundsStore } from '@/store/refunds'

const closingStore = useClosingVoucherStore()
const storesStore = useStoresStore()
const authStore = useAuthStore()
const salesStore = useSalesStore()
const expensesStore = useExpensesStore()
const refundsStore = useRefundsStore()

const startForm = reactive({
  openingCash: 0,
})

const form = reactive({
  shiftStart: '',
  shiftEndDisplay: '--',
  openingCash: 0,
  actualClosingCash: 0,
  remarks: '',
  managerApproved: false,
})

const computedValues = reactive({
  totalSales: 0,
  paymentBreakdown: [] as { method: string; amount: number }[],
  discounts: 0,
  refunds: 0,
  refundCount: 0,
  refundBreakdown: {} as Record<string, { amount: number; count: number }>,
  expenses: 0,
  expectedClosingCash: 0,
})

const vouchers = computed(() => closingStore.vouchersForCurrentStore)
const activeShift = computed(() => closingStore.activeShift)
const shiftEnded = computed(() => !!activeShift.value?.endedAt)
const isManager = computed(() => authStore.isManager)
const isAdmin = computed(() => authStore.isAdmin)
const canManage = computed(() => isManager.value || isAdmin.value)

const difference = computed(() => form.actualClosingCash - computedValues.expectedClosingCash)
const differenceClass = computed(() => {
  if (difference.value === 0) return 'text-green-600'
  if (Math.abs(difference.value) < 100) return 'text-yellow-500'
  return 'text-red-600'
})

const canStartShift = computed(() => startForm.openingCash >= 0)
const canSubmitVoucher = computed(() => !!activeShift.value && !!activeShift.value.endedAt && isManager.value)

const actualTouched = ref(false)

const refundBreakdownList = computed(() => {
  const breakdown = (computedValues.refundBreakdown || {}) as Record<string, { amount: number; count: number }>
  return Object.keys(breakdown).map((typeKey) => {
    const data = breakdown[typeKey] || { amount: 0, count: 0 }
    const label = typeKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    return {
      type: typeKey,
      amount: data.amount,
      count: data.count,
      label,
    }
  })
})

const formatDate = (iso?: string) => {
  if (!iso) return '--'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString()
}

function startShift() {
  if (!canStartShift.value) {
    alert('Opening cash must be zero or greater.')
    return
  }
  closingStore.startShift(Number(startForm.openingCash))
  startForm.openingCash = closingStore.lastVoucher?.actualClosingCash ?? 0
  actualTouched.value = false
  hydrateFormFromShift()
}

function endShift() {
  closingStore.endShift()
  actualTouched.value = false
  hydrateFormFromShift()
}

function hydrateFormFromShift() {
  if (!activeShift.value) return
  form.shiftStart = formatDate(activeShift.value.start)
  form.shiftEndDisplay = shiftEnded.value ? formatDate(activeShift.value.endedAt) : '--'
  form.openingCash = activeShift.value.openingCash
  actualTouched.value = false
  recalc()
}

function recalc() {
  if (!activeShift.value) return
  const endIso = activeShift.value.endedAt ?? new Date().toISOString()
  form.shiftEndDisplay = shiftEnded.value ? formatDate(activeShift.value.endedAt) : `${formatDate(endIso)} (preview)`
  const snapshot = closingStore.computeSnapshot({
    openingCash: Number(form.openingCash),
    shiftStart: activeShift.value.start,
    shiftEnd: endIso,
  })
  Object.assign(computedValues, snapshot)
  if (!actualTouched.value) {
    form.actualClosingCash = snapshot.expectedClosingCash
  }
}

watchEffect(() => {
  const shift = activeShift.value
  if (!shift) return
  shift.endedAt
  salesStore.sales
  expensesStore.expensesForCurrentStore
  refundsStore.refundsForCurrentStore
  recalc()
})

watch(
  () => closingStore.lastVoucher,
  (last) => {
    if (!activeShift.value) {
      startForm.openingCash = last?.actualClosingCash ?? 0
    }
  },
)

function submitVoucher() {
  if (!canSubmitVoucher.value || !activeShift.value) {
    alert('Only managers can submit the closing voucher after the shift has ended.')
    return
  }
  const store = storesStore.stores.find(s => s.id === storesStore.currentStoreId)
  const voucher = closingStore.closeShift({
    storeId: storesStore.currentStoreId!,
    storeName: store?.name || 'Unknown Store',
    cashierName: authStore.user?.displayName || authStore.user?.username || 'Cashier',
    openingCash: Number(form.openingCash),
    actualClosingCash: Number(form.actualClosingCash),
    remarks: form.remarks || undefined,
    managerApproved: form.managerApproved,
  })
  window.open(`/print/closing/${voucher.id}`, '_blank')
  resetForms()
}

function resetForms() {
  form.shiftStart = ''
  form.shiftEndDisplay = '--'
  form.openingCash = 0
  form.actualClosingCash = 0
  form.remarks = ''
  form.managerApproved = false
  computedValues.totalSales = 0
  computedValues.paymentBreakdown = []
  computedValues.discounts = 0
  computedValues.refunds = 0
  computedValues.refundCount = 0
  computedValues.refundBreakdown = {}
  computedValues.expenses = 0
  computedValues.expectedClosingCash = 0
  actualTouched.value = false
  startForm.openingCash = closingStore.lastVoucher?.actualClosingCash ?? 0
}

function handleView(voucherId: string) {
  window.open(`/print/closing/${voucherId}`, '_blank')
}

function handleDelete(voucherId: string) {
  const ok = globalThis.confirm('Are you sure you want to delete this closing voucher? This action cannot be undone.')
  if (!ok) return
  const removed = closingStore.deleteVoucher(voucherId)
  if (removed) {
    // recalc or reload lastVoucher/shift where appropriate
    // notify user
    alert('Closing voucher deleted.')
  } else {
    alert('Unable to delete voucher. It may have already been removed or no store is selected.')
  }
}

onMounted(() => {
  salesStore.load()
  expensesStore.load()
  refundsStore.load()
  closingStore.setCurrentStore()
  startForm.openingCash = closingStore.lastVoucher?.actualClosingCash ?? 0
  if (activeShift.value) {
    hydrateFormFromShift()
  }
})
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="!activeShift"
      class="view-card"
    >
      <h2 class="mb-3 text-lg font-semibold text-slate-100">Start Shift</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-slate-200">Opening Cash (Rs)</label>
          <input
            v-model.number="startForm.openingCash"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div class="flex items-end">
          <p class="text-xs text-slate-400">
            Shift start time will be captured automatically when you press <strong>Start Shift</strong>.
          </p>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          :disabled="!canStartShift"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-600"
          @click="startShift"
        >
          Start Shift
        </button>
      </div>
    </div>

    <div v-else>
      <div v-if="!shiftEnded" class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Active Shift</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div class="text-xs text-slate-300">Shift Start</div>
            <div class="mt-1 text-sm font-medium text-slate-100">{{ form.shiftStart }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-300">Opening Cash</div>
            <div class="mt-1 text-sm font-medium text-slate-100">Rs {{ form.openingCash.toFixed(2) }}</div>
          </div>
          <div>
            <div class="text-xs text-slate-300">Current Sales</div>
            <div class="mt-1 text-sm font-medium text-slate-100">Rs {{ computedValues.totalSales.toFixed(2) }}</div>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
            @click="endShift"
          >
            End Shift
          </button>
        </div>
      </div>

      <div
        v-else-if="shiftEnded && !isManager"
        class="view-card text-sm text-slate-200"
      >
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Shift Ended</h2>
        <p>Shift ended at {{ formatDate(activeShift?.endedAt) }}.</p>
        <p class="mt-2">Please wait for a manager to review and submit the closing voucher.</p>
      </div>

      <div v-else class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Close Shift (Manager)</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm text-slate-200">Shift Start</label>
            <input
              :value="form.shiftStart"
              type="text"
              disabled
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] dark-panel px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-200">Shift End</label>
            <input
              :value="form.shiftEndDisplay"
              type="text"
              disabled
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] dark-panel px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-200">Opening Cash (Rs)</label>
            <input
              v-model.number="form.openingCash"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              @input="actualTouched = false; recalc()"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-200">Actual Cash Counted (Rs)</label>
            <input
              v-model.number="form.actualClosingCash"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              @input="actualTouched = true"
            />
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div class="rounded-lg border border-transparent dark-panel p-3">
            <div class="text-xs text-slate-300">Total Sales</div>
            <div class="mt-1 text-xl font-semibold text-slate-100">Rs {{ computedValues.totalSales.toFixed(2) }}</div>
          </div>
          <div class="rounded-lg border border-transparent bg-red-50 p-3">
            <div class="text-xs text-red-600">Total Refunds</div>
            <div class="mt-1 text-xl font-semibold text-red-700">Rs {{ computedValues.refunds.toFixed(2) }}</div>
            <div class="mt-1 text-xs text-red-600">Count: {{ computedValues.refundCount }}</div>
          </div>
          <div class="rounded-lg border border-transparent dark-panel p-3">
            <div class="text-xs text-slate-300">Expenses</div>
            <div class="mt-1 text-xl font-semibold text-red-600">Rs {{ computedValues.expenses.toFixed(2) }}</div>
          </div>
          <div class="rounded-lg border border-transparent dark-panel p-3">
            <div class="text-xs text-slate-300">Expected Closing Cash</div>
            <div class="mt-1 text-xl font-semibold text-slate-100">
              Rs {{ computedValues.expectedClosingCash.toFixed(2) }}
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-lg border border-transparent p-4">
          <h3 class="mb-2 text-sm font-semibold text-slate-200">Payment Breakdown</h3>
          <ul class="space-y-1 text-sm">
            <li
              v-for="payment in computedValues.paymentBreakdown"
              :key="payment.method"
              class="flex items-center justify-between"
            >
              <span class="text-slate-200">{{ payment.method }}</span>
              <span class="font-medium text-slate-100">Rs {{ payment.amount.toFixed(2) }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-4 rounded-lg border border-transparent p-4">
          <h3 class="mb-2 text-sm font-semibold text-slate-200">Refund Summary</h3>
          <div v-if="!refundBreakdownList.length" class="text-sm text-slate-400">
            No refunds recorded during this shift.
          </div>
          <table v-else class="w-full text-sm">
            <thead class="dark-panel text-slate-300">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide">Type</th>
                <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Count</th>
                <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Amount (Rs)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="entry in refundBreakdownList" :key="entry.type">
                <td class="px-3 py-2 text-slate-200">{{ entry.label }}</td>
                <td class="px-3 py-2 text-right text-slate-300">{{ entry.count }}</td>
                <td class="px-3 py-2 text-right font-medium text-slate-100">Rs {{ entry.amount.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4">
          <label class="block text-sm text-slate-200">Remarks</label>
          <textarea
            v-model="form.remarks"
            rows="2"
            class="mt-1 w-full rounded-md border border-[rgba(255,255,255,0.06)] px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div class="mt-4 flex items-center justify-between border-t pt-4">
          <div>
            <div class="text-sm text-slate-300">Difference</div>
            <div :class="['mt-1 text-xl font-semibold', differenceClass]">Rs {{ difference.toFixed(2) }}</div>
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-200">
            <input
              v-model="form.managerApproved"
              type="checkbox"
              class="h-4 w-4 rounded border-[rgba(255,255,255,0.06)] text-indigo-600 focus:ring-indigo-500"
            />
            Manager Approved
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded-md border border-[rgba(255,255,255,0.06)] px-4 py-2 text-sm" @click="recalc">Recalculate</button>
          <button
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            @click="submitVoucher"
          >
            Submit Voucher
          </button>
        </div>
      </div>
    </div>

    <div class="view-card">
      <h3 class="mb-3 text-lg font-semibold text-slate-100">Recent Vouchers</h3>
      <table class="w-full text-sm">
        <thead class="dark-panel">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-slate-200">Date</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-slate-200">Cashier</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-slate-200">Sales</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-slate-200">Difference</th>
            <th class="px-4 py-2 text-center text-xs font-medium text-slate-200">Manager</th>
            <th v-if="canManage" class="px-4 py-2 text-center text-xs font-medium text-slate-200">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="vouchers.length === 0">
            <td colspan="6" class="px-4 py-4 text-center text-slate-400">No closing vouchers yet.</td>
          </tr>
          <tr v-for="voucher in vouchers.slice(-10).reverse()" :key="voucher.id">
            <td class="px-4 py-2 text-slate-200">{{ formatDate(voucher.shiftEnd) }}</td>
            <td class="px-4 py-2 text-slate-200">{{ voucher.cashierName }}</td>
            <td class="px-4 py-2 text-slate-200">Rs {{ voucher.totalSales.toFixed(2) }}</td>
            <td
              class="px-4 py-2 font-semibold"
              :class="voucher.difference === 0 ? 'text-green-600' : 'text-red-600'"
            >
              Rs {{ voucher.difference.toFixed(2) }}
            </td>
            <td class="px-4 py-2 text-center">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                :class="voucher.managerApproved ? 'bg-green-100 text-green-800' : 'dark-panel text-slate-300'"
              >
                {{ voucher.managerApproved ? 'Approved' : 'Pending' }}
              </span>
            </td>
            <td v-if="canManage" class="px-4 py-2 text-center">
              <div class="flex items-center justify-center gap-2">
                <button
                  class="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  @click="handleView(voucher.id)"
                >
                  View / Print
                </button>
                <button
                  v-if="canManage"
                  class="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  @click="handleDelete(voucher.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
