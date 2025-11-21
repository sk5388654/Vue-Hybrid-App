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
    <div class="glass-panel space-y-4">
      <h2 class="section-heading">
        {{ editingId == null ? 'Add Expense' : 'Edit Expense' }}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="subtle-label">Expense Title *</label>
          <input v-model="form.expenseTitle" type="text" class="input-field" placeholder="e.g. Electricity bill" />
        </div>
        <div>
          <label class="subtle-label">Category *</label>
          <select v-model="form.expenseCategory" class="input-field">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="subtle-label">Amount *</label>
          <input v-model.number="form.amount" type="number" min="0.01" step="0.01" class="input-field" />
        </div>
        <div>
          <label class="subtle-label">Date *</label>
          <input v-model="form.date" type="date" class="input-field" />
        </div>
        <div class="sm:col-span-2">
          <label class="subtle-label">Notes</label>
          <textarea v-model="form.notes" rows="2" placeholder="Additional details..." class="text-area-field"></textarea>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="save" class="btn-primary text-white">
          {{ editingId == null ? 'Add Expense' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="btn-ghost">Clear</button>
      </div>
    </div>

    <div class="glass-panel space-y-5">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h2 class="section-heading">Expense History</h2>
        <div class="flex items-center gap-2">
          <select v-model="filterCategory" class="input-field w-28 text-xs">
            <option value="All">All</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <input v-model="filterDateFrom" type="date" class="input-field w-24 text-xs" />
          <input v-model="filterDateTo" type="date" class="input-field w-24 text-xs" />
          <button @click="clearFilters" class="btn-ghost text-xs px-2">Reset</button>
          <input v-model="query" type="search" placeholder="Search..." class="input-field w-32 ml-4 text-xs" style="margin-left:auto;" />
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-100">
        <div class="max-h-[520px] overflow-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th class="text-right">Amount</th>
                <th>Added By</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="6" class="text-center text-slate-400">No expenses found</td>
              </tr>
              <tr v-for="expense in filtered" :key="expense.id">
                <td>{{ new Date(expense.date).toLocaleDateString() }}</td>
                <td class="font-semibold text-slate-900">{{ expense.expenseTitle }}</td>
                <td>
                  <span
                    class="pill-badge"
                    :class="{
                      'text-blue-600 border-blue-100': expense.expenseCategory === 'Rent',
                      'text-green-600 border-green-100': expense.expenseCategory === 'Supplies',
                      'text-amber-600 border-amber-100': expense.expenseCategory === 'Utilities',
                      'text-purple-600 border-purple-100': expense.expenseCategory === 'Salary',
                      'text-slate-600 border-slate-200': expense.expenseCategory === 'Misc',
                    }"
                  >
                    {{ expense.expenseCategory }}
                  </span>
                </td>
                <td class="text-right font-semibold text-red-500">₹{{ expense.amount.toFixed(2) }}</td>
                <td>{{ expense.addedBy }}</td>
                <td class="text-center">
                  <div class="inline-flex gap-2">
                    <button @click="edit(expense)" class="btn-ghost text-xs px-3 py-1">Edit</button>
                    <button @click="remove(expense.id)" class="btn-danger text-xs px-3 py-1">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="filtered.length">
              <tr>
                <td colspan="3" class="text-right font-semibold text-slate-600">Total</td>
                <td class="text-right text-lg font-bold text-red-500">
                  ₹{{ filtered.reduce((sum, e) => sum + e.amount, 0).toFixed(2) }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

