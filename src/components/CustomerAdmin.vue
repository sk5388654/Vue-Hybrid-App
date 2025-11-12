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
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">
        {{ editingId == null ? 'Add Customer' : 'Edit Customer' }}
      </h2>
      <div v-if="errorMessage" class="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-gray-700">Full Name <span class="text-red-500">*</span></label>
          <input
            v-model="form.fullName"
            type="text"
            placeholder="John Doe"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Phone <span class="text-red-500">*</span></label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="+1234567890"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Email (Optional)</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="john@example.com"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Address (Optional)</label>
          <input
            v-model="form.address"
            type="text"
            placeholder="123 Main St, City"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button
          @click="save"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {{ editingId == null ? 'Add Customer' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="rounded-md border border-gray-300 px-4 py-2 text-sm">Clear</button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-800">Customers ({{ filtered.length }})</h2>
        <div class="ml-auto flex flex-wrap gap-2">
          <input
            v-model="query"
            type="text"
            placeholder="Search by name, phone, email..."
            class="w-64 rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <select
            v-model="filterDues"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Customers</option>
            <option value="with-dues">With Dues</option>
            <option value="no-dues">No Dues</option>
          </select>
          <button
            @click="clearFilters"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div class="text-xs text-gray-600">Total Customers</div>
          <div class="mt-1 text-xl font-semibold text-gray-900">{{ customersStore.totalCustomers }}</div>
        </div>
        <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div class="text-xs text-gray-600">Total Dues</div>
          <div class="mt-1 text-xl font-semibold text-red-600">₹{{ customersStore.totalDues.toFixed(2) }}</div>
        </div>
        <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div class="text-xs text-gray-600">Customers with Dues</div>
          <div class="mt-1 text-xl font-semibold text-orange-600">{{ customersStore.customersWithDues.length }}</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Phone</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Email</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-700">Total Purchases</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-700">Total Due</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="filtered.length === 0" class="text-center text-gray-500">
              <td colspan="6" class="px-4 py-8">No customers found</td>
            </tr>
            <tr v-for="customer in filtered" :key="customer.id" class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium text-gray-900">{{ customer.fullName }}</td>
              <td class="px-4 py-2 text-gray-700">{{ customer.phone }}</td>
              <td class="px-4 py-2 text-gray-600">{{ customer.email || '-' }}</td>
              <td class="px-4 py-2 text-right font-semibold text-gray-900">
                ₹{{ customer.totalPurchases.toFixed(2) }}
              </td>
              <td class="px-4 py-2 text-right">
                <span
                  class="font-semibold"
                  :class="customer.totalDue > 0 ? 'text-red-600' : 'text-green-600'"
                >
                  ₹{{ customer.totalDue.toFixed(2) }}
                </span>
              </td>
              <td class="px-4 py-2 text-center">
                <div class="flex justify-center gap-2">
                  <button
                    @click="edit(customer)"
                    class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    @click="remove(customer.id)"
                    class="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
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
  </div>
</template>

<style scoped>
</style>

