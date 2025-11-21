<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useCustomersStore, type Customer } from '@/store/customers'

const customersStore = useCustomersStore()

const form = reactive<Omit<Customer, 'id' | 'storeId' | 'totalPurchases' | 'totalDue' | 'createdAt' | 'updatedAt'>>({
  fullName: '',
  phone: '',
  email: '',
  address: '',
})

const editingId = ref<string | null>(null)
const query = ref('')
const filterDues = ref<'all' | 'with-dues' | 'no-dues'>('all')
const errorMessage = ref('')

const filtered = computed(() => {
  let result = customersStore.customersForCurrentStore

  // Search filter
  const q = query.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      c =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    )
  }

  // Dues filter
  if (filterDues.value === 'with-dues') {
    result = result.filter(c => c.totalDue > 0)
  } else if (filterDues.value === 'no-dues') {
    result = result.filter(c => c.totalDue === 0)
  }

  // Sort by name
  return result.sort((a, b) => a.fullName.localeCompare(b.fullName))
})

function resetForm() {
  form.fullName = ''
  form.phone = ''
  form.email = ''
  form.address = ''
  editingId.value = null
  errorMessage.value = ''
}

function save() {
  if (!form.fullName.trim() || !form.phone.trim()) {
    errorMessage.value = 'Name and phone are required'
    return
  }

  // Basic phone validation
  if (!/^[0-9+\-\s()]+$/.test(form.phone.trim())) {
    errorMessage.value = 'Invalid phone number format'
    return
  }

  try {
    if (editingId.value == null) {
      customersStore.add({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
      })
    } else {
      customersStore.update(editingId.value, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
      })
    }
    resetForm()
    errorMessage.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save customer'
  }
}

function edit(customer: Customer) {
  editingId.value = customer.id
  form.fullName = customer.fullName
  form.phone = customer.phone
  form.email = customer.email || ''
  form.address = customer.address || ''
  errorMessage.value = ''
}

function remove(id: string) {
  if (confirm('Delete this customer? This will also remove their purchase history.')) {
    customersStore.remove(id)
    if (editingId.value === id) resetForm()
  }
}

function clearFilters() {
  query.value = ''
  filterDues.value = 'all'
}

onMounted(() => {
  customersStore.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="glass-panel space-y-4">
      <h2 class="section-heading">
        {{ editingId == null ? 'Add Customer' : 'Edit Customer' }}
      </h2>
      <div v-if="errorMessage" class="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-2 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="subtle-label">Full Name *</label>
          <input
            v-model="form.fullName"
            type="text"
            placeholder="John Doe"
            class="input-field"
          />
        </div>
        <div>
          <label class="subtle-label">Phone *</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="+1234567890"
            class="input-field"
          />
        </div>
        <div>
          <label class="subtle-label">Email (Optional)</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="john@example.com"
            class="input-field"
          />
        </div>
        <div>
          <label class="subtle-label">Address (Optional)</label>
          <input
            v-model="form.address"
            type="text"
            placeholder="123 Main St, City"
            class="input-field"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="save" class="btn-primary text-white">
          {{ editingId == null ? 'Add Customer' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="btn-ghost">Clear</button>
      </div>
    </div>

    <div class="glass-panel space-y-5">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h2 class="section-heading">Customers ({{ filtered.length }})</h2>
        <div class="flex items-center gap-2">
          <select v-model="filterDues" class="input-field w-28 text-xs">
            <option value="all">All</option>
            <option value="with-dues">With Dues</option>
            <option value="no-dues">No Dues</option>
          </select>
          <button @click="clearFilters" class="btn-ghost text-xs px-2">Reset</button>
          <input v-model="query" type="search" placeholder="Search..." class="input-field w-32 ml-4 text-xs" style="margin-left:auto;" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-transparent bg-blue-50/70 p-4">
          <div class="subtle-label">Total Customers</div>
          <div class="mt-2 text-2xl font-bold text-blue-900">{{ customersStore.totalCustomers }}</div>
        </div>
        <div class="rounded-2xl border border-transparent bg-orange-50/80 p-4">
          <div class="subtle-label">Total Dues</div>
          <div class="mt-2 text-2xl font-bold text-orange-800">₹{{ customersStore.totalDues.toFixed(2) }}</div>
        </div>
        <div class="rounded-2xl border border-transparent bg-emerald-50/80 p-4">
          <div class="subtle-label">With Dues</div>
          <div class="mt-2 text-2xl font-bold text-emerald-700">{{ customersStore.customersWithDues.length }}</div>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-100">
        <div class="max-h-[520px] overflow-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th class="text-right">Total Purchases</th>
                <th class="text-right">Total Due</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="6" class="text-center text-slate-400">No customers found</td>
              </tr>
              <tr v-for="customer in filtered" :key="customer.id">
                <td class="font-semibold text-slate-900">{{ customer.fullName }}</td>
                <td>{{ customer.phone }}</td>
                <td>{{ customer.email || '-' }}</td>
                <td class="text-right font-semibold text-slate-900">
                  ₹{{ customer.totalPurchases.toFixed(2) }}
                </td>
                <td class="text-right font-semibold" :class="customer.totalDue > 0 ? 'text-red-600' : 'text-emerald-600'">
                  ₹{{ customer.totalDue.toFixed(2) }}
                </td>
                <td class="text-center">
                  <div class="inline-flex gap-2">
                    <button @click="edit(customer)" class="btn-ghost text-xs px-3 py-1">Edit</button>
                    <button @click="remove(customer.id)" class="btn-danger text-xs px-3 py-1">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

