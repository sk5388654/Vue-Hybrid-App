<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useSalesStore } from '@/store/sales'
import { useProductsStore } from '@/store/products'
import { useExpensesStore } from '@/store/expenses'
import type { ExpenseCategory } from '@/store/expenses'

const salesStore = useSalesStore()
const productsStore = useProductsStore()
const expensesStore = useExpensesStore()
const threshold = ref(productsStore.lowStockThreshold)

const lowStock = computed(() => productsStore.products.filter(p => p.stock < threshold.value))

// Profit/Loss calculations
const profitToday = computed(() => salesStore.todayTotal - expensesStore.expensesToday)
const profitThisWeek = computed(() => salesStore.weekTotal - expensesStore.expensesThisWeek)
const profitThisMonth = computed(() => salesStore.monthTotal - expensesStore.expensesThisMonth)

const expensesByCategory = computed(() => expensesStore.expensesByCategory)
const hasExpenses = computed(() => {
  const totals = expensesByCategory.value
  return Object.keys(totals).some((key) => totals[key as ExpenseCategory] !== 0)
})

function updateThreshold() {
  productsStore.setThreshold(threshold.value)
}

onMounted(() => {
  expensesStore.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Total Sales Today</div>
        <div class="mt-2 text-2xl font-semibold text-gray-900">₹{{ salesStore.todayTotal.toFixed(2) }}</div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Total Expenses Today</div>
        <div class="mt-2 text-2xl font-semibold text-red-600">₹{{ expensesStore.expensesToday.toFixed(2) }}</div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Profit/Loss Today</div>
        <div
          class="mt-2 text-2xl font-semibold"
          :class="profitToday >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          ₹{{ profitToday.toFixed(2) }}
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Products In Catalog</div>
        <div class="mt-2 text-2xl font-semibold text-gray-900">{{ productsStore.products.length }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Sales This Week</div>
        <div class="mt-2 text-2xl font-semibold text-gray-900">₹{{ salesStore.weekTotal.toFixed(2) }}</div>
        <div class="mt-1 text-xs text-gray-500">Expenses: ₹{{ expensesStore.expensesThisWeek.toFixed(2) }}</div>
        <div
          class="mt-1 text-sm font-medium"
          :class="profitThisWeek >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          Net: ₹{{ profitThisWeek.toFixed(2) }}
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Sales This Month</div>
        <div class="mt-2 text-2xl font-semibold text-gray-900">₹{{ salesStore.monthTotal.toFixed(2) }}</div>
        <div class="mt-1 text-xs text-gray-500">Expenses: ₹{{ expensesStore.expensesThisMonth.toFixed(2) }}</div>
        <div
          class="mt-1 text-sm font-medium"
          :class="profitThisMonth >= 0 ? 'text-green-600' : 'text-red-600'"
        >
          Net: ₹{{ profitThisMonth.toFixed(2) }}
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div class="text-sm text-gray-500">Total Expenses</div>
        <div class="mt-2 text-2xl font-semibold text-red-600">₹{{ expensesStore.totalExpenses.toFixed(2) }}</div>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">Expenses by Category</h2>
      <div v-if="!hasExpenses" class="text-sm text-gray-500">
        No expenses recorded yet.
      </div>
      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div
          v-for="(amount, category) in expensesByCategory"
          :key="category"
          class="rounded-lg border border-gray-100 bg-gray-50 p-3"
        >
          <div class="text-xs text-gray-600">{{ category }}</div>
          <div class="mt-1 text-lg font-semibold text-red-600">₹{{ amount.toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">Best Selling Items</h2>
      <div v-if="salesStore.bestSelling.length === 0" class="text-sm text-gray-500">No sales yet.</div>
      <ul v-else class="divide-y divide-gray-100">
        <li v-for="b in salesStore.bestSelling" :key="b.id" class="flex items-center justify-between py-2 text-sm">
          <span class="text-gray-700">{{ b.name }}</span>
          <span class="font-medium text-gray-900">Qty: {{ b.quantity }}</span>
        </li>
      </ul>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Low Stock Alerts</h2>
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-600">Threshold</label>
          <input v-model.number="threshold" @change="updateThreshold" type="number" min="1" class="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
      </div>
      <div v-if="lowStock.length === 0" class="text-sm text-gray-500">No low-stock items.</div>
      <ul v-else class="divide-y divide-gray-100">
        <li v-for="p in lowStock" :key="p.id" class="flex items-center justify-between py-2 text-sm">
          <span class="text-gray-700">{{ p.name }}</span>
          <span class="text-gray-600">Stock: {{ p.stock }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>

