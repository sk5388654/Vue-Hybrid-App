<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useExpensesStore, type Expense, type ExpenseCategory } from '@/store/expenses'
import { useAuthStore } from '@/store/auth'

const expensesStore = useExpensesStore()
const auth = useAuthStore()

onMounted(() => {
  expensesStore.load()
})

const categories: ExpenseCategory[] = ['Rent', 'Supplies', 'Utilities', 'Salary', 'Misc']

const form = reactive<Omit<Expense, 'id' | 'storeId' | 'createdAt'>>({
  expenseTitle: '',
  expenseCategory: 'Misc',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  notes: '',
  addedBy: auth.user?.username || '',
})

const editingId = ref<string | null>(null)
const query = ref('')
const filterCategory = ref<ExpenseCategory | 'All'>('All')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const filtered = computed(() => {
  let result = expensesStore.expensesForCurrentStore

  // Search filter
  const q = query.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      e =>
        e.expenseTitle.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.addedBy.toLowerCase().includes(q)
    )
  }

  // Category filter
  if (filterCategory.value !== 'All') {
    result = result.filter(e => e.expenseCategory === filterCategory.value)
  }

  // Date range filter
  if (filterDateFrom.value) {
    result = result.filter(e => e.date >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    result = result.filter(e => e.date <= filterDateTo.value)
  }

  // Sort by date (newest first)
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

function resetForm() {
  form.expenseTitle = ''
  form.expenseCategory = 'Misc'
  form.amount = 0
  form.date = new Date().toISOString().split('T')[0]
  form.notes = ''
  form.addedBy = auth.user?.username || ''
  editingId.value = null
}

function save() {
  if (!form.expenseTitle.trim() || form.amount <= 0) {
    alert('Please fill in title and amount (must be > 0)')
    return
  }
  if (editingId.value == null) {
    expensesStore.add({
      ...form,
      addedBy: auth.user?.username || 'admin',
    })
  } else {
    expensesStore.update(editingId.value, {
      expenseTitle: form.expenseTitle,
      expenseCategory: form.expenseCategory,
      amount: form.amount,
      date: form.date,
      notes: form.notes,
    })
  }
  resetForm()
}

function edit(expense: Expense) {
  editingId.value = expense.id
  form.expenseTitle = expense.expenseTitle
  form.expenseCategory = expense.expenseCategory
  form.amount = expense.amount
  form.date = expense.date
  form.notes = expense.notes || ''
  form.addedBy = expense.addedBy
}

function remove(id: string) {
  if (confirm('Delete this expense?')) {
    expensesStore.remove(id)
    if (editingId.value === id) resetForm()
  }
}

function clearFilters() {
  query.value = ''
  filterCategory.value = 'All'
  filterDateFrom.value = ''
  filterDateTo.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">
        {{ editingId == null ? 'Add Expense' : 'Edit Expense' }}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-gray-700">Expense Title <span class="text-red-500">*</span></label>
          <input
            v-model="form.expenseTitle"
            type="text"
            placeholder="e.g. Electricity Bill"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Category <span class="text-red-500">*</span></label>
          <select
            v-model="form.expenseCategory"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-700">Amount <span class="text-red-500">*</span></label>
          <input
            v-model.number="form.amount"
            type="number"
            min="0.01"
            step="0.01"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Date <span class="text-red-500">*</span></label>
          <input
            v-model="form.date"
            type="date"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm text-gray-700">Notes (Optional)</label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Additional details..."
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          ></textarea>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button
          @click="save"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {{ editingId == null ? 'Add Expense' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="rounded-md border border-gray-300 px-4 py-2 text-sm">Clear</button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-800">Expense History</h2>
        <div class="ml-auto flex flex-wrap gap-2">
          <input
            v-model="query"
            type="text"
            placeholder="Search..."
            class="w-48 rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <select
            v-model="filterCategory"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Categories</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <input
            v-model="filterDateFrom"
            type="date"
            placeholder="From"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <input
            v-model="filterDateTo"
            type="date"
            placeholder="To"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            @click="clearFilters"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Title</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Category</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-700">Amount</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Added By</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="filtered.length === 0" class="text-center text-gray-500">
              <td colspan="6" class="px-4 py-8">No expenses found</td>
            </tr>
            <tr v-for="expense in filtered" :key="expense.id" class="hover:bg-gray-50">
              <td class="px-4 py-2 text-gray-700">{{ new Date(expense.date).toLocaleDateString() }}</td>
              <td class="px-4 py-2 font-medium text-gray-900">{{ expense.expenseTitle }}</td>
              <td class="px-4 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-blue-100 text-blue-800': expense.expenseCategory === 'Rent',
                    'bg-green-100 text-green-800': expense.expenseCategory === 'Supplies',
                    'bg-yellow-100 text-yellow-800': expense.expenseCategory === 'Utilities',
                    'bg-purple-100 text-purple-800': expense.expenseCategory === 'Salary',
                    'bg-gray-100 text-gray-800': expense.expenseCategory === 'Misc',
                  }"
                >
                  {{ expense.expenseCategory }}
                </span>
              </td>
              <td class="px-4 py-2 text-right font-semibold text-red-600">₹{{ expense.amount.toFixed(2) }}</td>
              <td class="px-4 py-2 text-gray-600">{{ expense.addedBy }}</td>
              <td class="px-4 py-2 text-center">
                <div class="flex justify-center gap-2">
                  <button
                    @click="edit(expense)"
                    class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    @click="remove(expense.id)"
                    class="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="filtered.length > 0" class="bg-gray-50">
            <tr>
              <td colspan="3" class="px-4 py-2 text-right font-semibold text-gray-700">Total:</td>
              <td class="px-4 py-2 text-right font-bold text-red-600">
                ₹{{ filtered.reduce((sum, e) => sum + e.amount, 0).toFixed(2) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

