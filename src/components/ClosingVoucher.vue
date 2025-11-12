<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useClosingVoucherStore } from '@/store/closingVouchers'
import { useStoresStore } from '@/store/stores'
import { useAuthStore } from '@/store/auth'
import { useSalesStore } from '@/store/sales'
import { useExpensesStore } from '@/store/expenses'

const closingStore = useClosingVoucherStore()
const storesStore = useStoresStore()
const authStore = useAuthStore()
const salesStore = useSalesStore()
const expensesStore = useExpensesStore()

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
  expenses: 0,
  expectedClosingCash: 0,
})

const vouchers = computed(() => closingStore.vouchersForCurrentStore)
const activeShift = computed(() => closingStore.activeShift)
const shiftEnded = computed(() => !!activeShift.value?.endedAt)
const isManager = computed(() => authStore.isManager)

const difference = computed(() => form.actualClosingCash - computedValues.expectedClosingCash)
const differenceClass = computed(() => {
  if (difference.value === 0) return 'text-green-600'
  if (Math.abs(difference.value) < 100) return 'text-yellow-500'
  return 'text-red-600'
})

const canStartShift = computed(() => startForm.openingCash >= 0)
const canSubmitVoucher = computed(() => !!activeShift.value && !!activeShift.value.endedAt && isManager.value)

const actualTouched = ref(false)

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
  recalc()
})

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
  computedValues.expenses = 0
  computedValues.expectedClosingCash = 0
  actualTouched.value = false
  startForm.openingCash = closingStore.lastVoucher?.actualClosingCash ?? 0
}

function handleView(voucherId: string) {
  window.open(`/print/closing/${voucherId}`, '_blank')
}

onMounted(() => {
  salesStore.load()
  expensesStore.load()
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
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 class="mb-3 text-lg font-semibold text-gray-800">Start Shift</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-gray-700">Opening Cash (Rs)</label>
          <input
            v-model.number="startForm.openingCash"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div class="flex items-end">
          <p class="text-xs text-gray-500">
            Shift start time will be captured automatically when you press <strong>Start Shift</strong>.
          </p>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          :disabled="!canStartShift"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          @click="startShift"
        >
          Start Shift
        </button>
      </div>
    </div>

    <div v-else>
      <div v-if="!shiftEnded" class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-gray-800">Active Shift</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div class="text-xs text-gray-600">Shift Start</div>
            <div class="mt-1 text-sm font-medium text-gray-900">{{ form.shiftStart }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-600">Opening Cash</div>
            <div class="mt-1 text-sm font-medium text-gray-900">Rs {{ form.openingCash.toFixed(2) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-600">Current Sales</div>
            <div class="mt-1 text-sm font-medium text-gray-900">Rs {{ computedValues.totalSales.toFixed(2) }}</div>
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
        class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700"
      >
        <h2 class="mb-3 text-lg font-semibold text-gray-800">Shift Ended</h2>
        <p>Shift ended at {{ formatDate(activeShift?.endedAt) }}.</p>
        <p class="mt-2">Please wait for a manager to review and submit the closing voucher.</p>
      </div>

      <div v-else class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-gray-800">Close Shift (Manager)</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm text-gray-700">Shift Start</label>
            <input
              :value="form.shiftStart"
              type="text"
              disabled
              class="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700">Shift End</label>
            <input
              :value="form.shiftEndDisplay"
              type="text"
              disabled
              class="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700">Opening Cash (Rs)</label>
            <input
              v-model.number="form.openingCash"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              @input="actualTouched = false; recalc()"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-700">Actual Cash Counted (Rs)</label>
            <input
              v-model.number="form.actualClosingCash"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              @input="actualTouched = true"
            />
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div class="text-xs text-gray-600">Total Sales</div>
            <div class="mt-1 text-xl font-semibold text-gray-900">Rs {{ computedValues.totalSales.toFixed(2) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div class="text-xs text-gray-600">Expenses</div>
            <div class="mt-1 text-xl font-semibold text-red-600">Rs {{ computedValues.expenses.toFixed(2) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div class="text-xs text-gray-600">Expected Closing Cash</div>
            <div class="mt-1 text-xl font-semibold text-gray-900">
              Rs {{ computedValues.expectedClosingCash.toFixed(2) }}
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-lg border border-gray-200 p-4">
          <h3 class="mb-2 text-sm font-semibold text-gray-700">Payment Breakdown</h3>
          <ul class="space-y-1 text-sm">
            <li
              v-for="payment in computedValues.paymentBreakdown"
              :key="payment.method"
              class="flex items-center justify-between"
            >
              <span class="text-gray-700">{{ payment.method }}</span>
              <span class="font-medium text-gray-900">Rs {{ payment.amount.toFixed(2) }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-4">
          <label class="block text-sm text-gray-700">Remarks</label>
          <textarea
            v-model="form.remarks"
            rows="2"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div class="mt-4 flex items-center justify-between border-t pt-4">
          <div>
            <div class="text-sm text-gray-600">Difference</div>
            <div :class="['mt-1 text-xl font-semibold', differenceClass]">Rs {{ difference.toFixed(2) }}</div>
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input
              v-model="form.managerApproved"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Manager Approved
          </label>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded-md border border-gray-300 px-4 py-2 text-sm" @click="recalc">Recalculate</button>
          <button
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            @click="submitVoucher"
          >
            Submit Voucher
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-lg font-semibold text-gray-800">Recent Vouchers</h3>
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Cashier</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Sales</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Difference</th>
            <th class="px-4 py-2 text-center text-xs font-medium text-gray-700">Manager</th>
            <th v-if="isManager" class="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-if="vouchers.length === 0">
            <td colspan="6" class="px-4 py-4 text-center text-gray-500">No closing vouchers yet.</td>
          </tr>
          <tr v-for="voucher in vouchers.slice(-10).reverse()" :key="voucher.id">
            <td class="px-4 py-2 text-gray-700">{{ formatDate(voucher.shiftEnd) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ voucher.cashierName }}</td>
            <td class="px-4 py-2 text-gray-700">Rs {{ voucher.totalSales.toFixed(2) }}</td>
            <td
              class="px-4 py-2 font-semibold"
              :class="voucher.difference === 0 ? 'text-green-600' : 'text-red-600'"
            >
              Rs {{ voucher.difference.toFixed(2) }}
            </td>
            <td class="px-4 py-2 text-center">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                :class="voucher.managerApproved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
              >
                {{ voucher.managerApproved ? 'Approved' : 'Pending' }}
              </span>
            </td>
            <td v-if="isManager" class="px-4 py-2 text-center">
              <button
                class="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                @click="handleView(voucher.id)"
              >
                View / Print
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
