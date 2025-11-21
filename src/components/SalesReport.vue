<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useSalesStore, type Sale } from '@/store/sales'
import { useProductsStore } from '@/store/products'
import { useExpensesStore, type ExpenseCategory } from '@/store/expenses'
import { useRefundsStore, type RefundType, type RefundRecord } from '@/store/refunds'
import RefundReceiptModal from './RefundReceiptModal.vue'

const salesStore = useSalesStore()
const productsStore = useProductsStore()
const expensesStore = useExpensesStore()
const refundsStore = useRefundsStore()

const threshold = ref(productsStore.lowStockThreshold)
import { useAuthStore } from '@/store/auth'
const auth = useAuthStore()
const activeTab = ref<'overview' | 'refunds'>('overview')

const lowStock = computed(() => productsStore.products.filter(p => p.stock < threshold.value))

const profitToday = computed(() => salesStore.todayTotal - expensesStore.expensesToday)
const profitThisWeek = computed(() => salesStore.weekTotal - expensesStore.expensesThisWeek)
const profitThisMonth = computed(() => salesStore.monthTotal - expensesStore.expensesThisMonth)

const expensesByCategory = computed(() => expensesStore.expensesByCategory)
const hasExpenses = computed(() => {
  const totals = expensesByCategory.value
  return Object.keys(totals).some((key) => totals[key as ExpenseCategory] !== 0)
})

const refunds = computed<RefundRecord[]>(() =>
  refundsStore.refundsForCurrentStore
    .slice()
    .sort(
      (a: RefundRecord, b: RefundRecord) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
)
const totalRefundAmount = computed(() => refunds.value.reduce((sum, record) => sum + record.totalRefund, 0))
const refundCount = computed(() => refunds.value.length)
const refundBreakdown = computed<Record<RefundType, { amount: number; count: number }>>(() => {
  const map: Record<RefundType, { amount: number; count: number }> = {} as Record<
    RefundType,
    { amount: number; count: number }
  >
  refunds.value.forEach((record) => {
    const entry = map[record.refundType] || { amount: 0, count: 0 }
    entry.amount += record.totalRefund
    entry.count += 1
    map[record.refundType] = entry
  })
  return map
})

const refundBreakdownList = computed(() => {
  const breakdown = refundBreakdown.value
  const keys = Object.keys(breakdown) as RefundType[]
  return keys.map((type) => {
    const data = breakdown[type] || { amount: 0, count: 0 }
    const label = type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    return {
      type,
      label,
      amount: data.amount,
      count: data.count,
    }
  })
})

const averageRefund = computed(() =>
  refundCount.value ? totalRefundAmount.value / refundCount.value : 0,
)

const topRefundTypeLabel = computed(() => {
  if (!refundBreakdownList.value.length) return 'N/A'
  const sorted = [...refundBreakdownList.value].sort(
    (a, b) => b.amount - a.amount,
  )
  return sorted[0]?.label ?? 'N/A'
})

const showRefundModal = ref(false)
const selectedRefund = ref<RefundRecord | null>(null)
const selectedRefundSale = computed<Sale | null>(() => {
  if (!selectedRefund.value) return null
  return salesStore.sales.find((s) => s.id === selectedRefund.value?.saleId) ?? null
})
const selectedRefundHistory = computed(() => {
  if (!selectedRefund.value) return []
  return refundsStore.refundsForSale(selectedRefund.value.saleId)
})

function updateThreshold() {
  productsStore.setThreshold(threshold.value)
}

function formatCurrency(amount: number) {
  return `₹${amount.toFixed(2)}`
}

function setTab(tab: 'overview' | 'refunds') {
  activeTab.value = tab
}

function openRefundModal(record: RefundRecord) {
  selectedRefund.value = record
  showRefundModal.value = true
}

function closeRefundModal() {
  showRefundModal.value = false
  selectedRefund.value = null
}

onMounted(() => {
  salesStore.load()
  productsStore.load()
  expensesStore.load()
  refundsStore.load()
})
</script>

<template>
  <div class="view-layout">
    <div class="flex flex-wrap gap-2">
      <button
        :class="[
          'quick-filter',
          activeTab === 'overview' ? 'bg-blue-600 text-white border-blue-600' : ''
        ]"
        type="button"
        @click="setTab('overview')"
      >
        Overview
      </button>
      <button
        :class="[
          'quick-filter',
          activeTab === 'refunds' ? 'bg-amber-500 text-white border-amber-500' : ''
        ]"
        type="button"
        @click="setTab('refunds')"
      >
        Refunds
      </button>
      <router-link
        v-if="auth.isAdmin"
        to="/reports/employees"
        class="quick-filter"
      >
        Employee Dashboard
      </router-link>
    </div>

    <div v-if="activeTab === 'overview'" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="view-card">
          <div class="text-sm text-slate-400">Total Sales Today</div>
          <div class="mt-2 text-2xl font-semibold text-slate-100">{{ formatCurrency(salesStore.todayTotal) }}</div>
        </div>
        <div class="view-card">
          <div class="text-sm text-slate-400">Total Expenses Today</div>
          <div class="mt-2 text-2xl font-semibold text-red-600">{{ formatCurrency(expensesStore.expensesToday) }}</div>
        </div>
        <div class="view-card">
          <div class="text-sm text-slate-400">Profit/Loss Today</div>
          <div
            class="mt-2 text-2xl font-semibold"
            :class="profitToday >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            {{ formatCurrency(profitToday) }}
          </div>
        </div>
        <div class="view-card">
          <div class="text-sm text-slate-400">Products In Catalog</div>
          <div class="mt-2 text-2xl font-semibold text-slate-100">{{ productsStore.products.length }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="view-card">
          <div class="text-sm text-slate-400">Sales This Week</div>
          <div class="mt-2 text-2xl font-semibold text-slate-100">{{ formatCurrency(salesStore.weekTotal) }}</div>
          <div class="mt-1 text-xs text-slate-400">Expenses: {{ formatCurrency(expensesStore.expensesThisWeek) }}</div>
          <div
            class="mt-1 text-sm font-medium"
            :class="profitThisWeek >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            Net: {{ formatCurrency(profitThisWeek) }}
          </div>
        </div>
        <div class="view-card">
          <div class="text-sm text-slate-400">Sales This Month</div>
          <div class="mt-2 text-2xl font-semibold text-slate-100">{{ formatCurrency(salesStore.monthTotal) }}</div>
          <div class="mt-1 text-xs text-slate-400">Expenses: {{ formatCurrency(expensesStore.expensesThisMonth) }}</div>
          <div
            class="mt-1 text-sm font-medium"
            :class="profitThisMonth >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            Net: {{ formatCurrency(profitThisMonth) }}
          </div>
        </div>
        <div class="view-card">
          <div class="text-sm text-slate-400">Total Expenses</div>
          <div class="mt-2 text-2xl font-semibold text-red-600">{{ formatCurrency(expensesStore.totalExpenses) }}</div>
        </div>
      </div>

      <div class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Expenses by Category</h2>
        <div v-if="!hasExpenses" class="text-sm text-slate-400">
          No expenses recorded yet.
        </div>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div
            v-for="(amount, category) in expensesByCategory"
            :key="category"
            class="rounded-2xl border border-slate-100 bg-slate-50 p-3"
          >
            <div class="text-xs text-slate-300">{{ category }}</div>
            <div class="mt-1 text-lg font-semibold text-red-600">{{ formatCurrency(amount) }}</div>
          </div>
        </div>
      </div>

      <div class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Best Selling Items</h2>
        <div v-if="salesStore.bestSelling.length === 0" class="text-sm text-slate-400">No sales yet.</div>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="b in salesStore.bestSelling" :key="b.id" class="flex items-center justify-between py-2 text-sm">
            <span class="text-slate-200">{{ b.name }}</span>
            <span class="font-medium text-slate-100">Qty: {{ b.quantity }}</span>
          </li>
        </ul>
      </div>

      <div class="view-card">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-100">Low Stock Alerts</h2>
          <div class="flex items-center gap-2">
            <label class="text-sm text-slate-300">Threshold</label>
            <input
              v-model.number="threshold"
              @change="updateThreshold"
              type="number"
              min="1"
              class="input-field w-24"
            />
          </div>
        </div>
        <div v-if="lowStock.length === 0" class="text-sm text-slate-400">No low-stock items.</div>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="p in lowStock" :key="p.id" class="flex items-center justify-between py-2 text-sm">
            <span class="text-slate-200">{{ p.name }}</span>
            <span class="text-slate-300">Stock: {{ p.stock }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="view-card">
          <div class="text-sm text-orange-700">Total Refund Amount</div>
          <div class="mt-2 text-2xl font-semibold text-orange-900">{{ formatCurrency(totalRefundAmount) }}</div>
        </div>
        <div class="view-card">
          <div class="text-sm text-orange-700">Number of Refunds</div>
          <div class="mt-2 text-2xl font-semibold text-orange-900">{{ refundCount }}</div>
        </div>
        <div class="view-card">
          <div class="text-sm text-orange-700">Average Refund Value</div>
          <div class="mt-2 text-2xl font-semibold text-orange-900">{{ formatCurrency(averageRefund) }}</div>
        </div>
        <div class="view-card">
          <div class="text-sm text-orange-700">Top Refund Type</div>
          <div class="mt-2 text-xl font-semibold text-orange-900">
            {{ topRefundTypeLabel }}
          </div>
        </div>
      </div>

      <div class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Refund Breakdown by Type</h2>
        <div v-if="!refundBreakdownList.length" class="text-sm text-slate-400">
          No refunds recorded for the selected store.
        </div>
        <div v-else class="overflow-hidden rounded-2xl border border-slate-100">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Type</th>
                <th class="text-right">Count</th>
                <th class="text-right">Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in refundBreakdownList" :key="item.type">
                <td>{{ item.label }}</td>
                <td class="text-right text-slate-300">{{ item.count }}</td>
                <td class="text-right font-medium text-slate-100">{{ formatCurrency(item.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="view-card">
        <h2 class="mb-3 text-lg font-semibold text-slate-100">Recent Refunds</h2>
        <div v-if="refunds.length === 0" class="text-sm text-slate-400">
          No refunds recorded yet.
        </div>
        <div v-else class="overflow-hidden rounded-2xl border border-slate-100">
          <div class="max-h-[520px] overflow-auto">
            <table class="table-modern">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Refund ID</th>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th class="text-right">Amount (Rs)</th>
                  <th>Cashier</th>
                  <th>Reason</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in refunds" :key="record.refundId">
                  <td>{{ new Date(record.createdAt).toLocaleString() }}</td>
                  <td class="font-semibold text-slate-900">{{ record.refundId }}</td>
                  <td>#{{ record.invoiceNumber }}</td>
                  <td>
                    {{ record.refundType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) }}
                  </td>
                  <td class="text-right font-medium text-slate-900">{{ formatCurrency(record.totalRefund) }}</td>
                  <td>{{ record.cashier }}</td>
                  <td class="text-slate-500">{{ record.refundReason || '—' }}</td>
                  <td class="text-center">
                    <button
                      class="btn text-xs bg-amber-50 text-amber-700"
                      type="button"
                      @click="openRefundModal(record)"
                    >
                      View / Print Receipt
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <RefundReceiptModal
      v-if="showRefundModal && selectedRefund && selectedRefundSale"
      :refund="selectedRefund"
      :sale="selectedRefundSale"
      :existingRefunds="selectedRefundHistory"
      @close="closeRefundModal"
    />
  </div>
</template>

<style scoped>
</style>
