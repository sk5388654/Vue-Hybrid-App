<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useEmployeesStore, type Employee, type EmployeeRole, type EmployeeStatus } from '@/store/employees'
import { useSalesStore } from '@/store/sales'

const employeesStore = useEmployeesStore()
const salesStore = useSalesStore()

const roles: EmployeeRole[] = ['Admin', 'Manager', 'Cashier']
const statuses: EmployeeStatus[] = ['Active', 'Inactive']

const form = reactive<Omit<Employee, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>({
  fullName: '',
  role: 'Cashier',
  username: '',
  password: '',
  hireDate: new Date().toISOString().split('T')[0],
  status: 'Active',
})

const editingId = ref<string | null>(null)
const query = ref('')
const filterRole = ref<EmployeeRole | 'All'>('All')
const filterStatus = ref<EmployeeStatus | 'All'>('All')
const errorMessage = ref('')

const filtered = computed(() => {
  let result = employeesStore.employeesForCurrentStore

  const q = query.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      e =>
        e.fullName.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
    )
  }

  if (filterRole.value !== 'All') {
    result = result.filter(e => e.role === filterRole.value)
  }

  if (filterStatus.value !== 'All') {
    result = result.filter(e => e.status === filterStatus.value)
  }

  return result.sort((a, b) => a.fullName.localeCompare(b.fullName))
})

const employeeSales = computed(() => {
  const sales = salesStore.sales
  const map = new Map<string, { count: number; total: number }>()
  sales.forEach(sale => {
    if (sale.cashier) {
      const existing = map.get(sale.cashier) || { count: 0, total: 0 }
      existing.count += 1
      existing.total += sale.total
      map.set(sale.cashier, existing)
    }
  })
  return map
})

function resetForm() {
  form.fullName = ''
  form.role = 'Cashier'
  form.username = ''
  form.password = ''
  form.hireDate = new Date().toISOString().split('T')[0]
  form.status = 'Active'
  editingId.value = null
  errorMessage.value = ''
}

function save() {
  if (!form.fullName.trim() || !form.username.trim() || (!form.password.trim() && !editingId.value)) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  try {
    if (editingId.value == null) {
      employeesStore.addEmployee({
        fullName: form.fullName.trim(),
        role: form.role,
        username: form.username.trim(),
        password: form.password, // In production, hash this
        hireDate: form.hireDate,
        status: form.status,
      })
    } else {
      const updateData: any = {
        fullName: form.fullName.trim(),
        role: form.role,
        username: form.username.trim(),
        hireDate: form.hireDate,
        status: form.status,
      }
      if (form.password.trim()) {
        updateData.password = form.password // In production, hash this
      }
      employeesStore.updateEmployee(editingId.value, updateData)
    }
    resetForm()
    errorMessage.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save employee'
  }
}

function edit(employee: Employee) {
  editingId.value = employee.id
  form.fullName = employee.fullName
  form.role = employee.role
  form.username = employee.username
  form.password = '' // Don't show password
  form.hireDate = employee.hireDate
  form.status = employee.status
  errorMessage.value = ''
}

function remove(id: string) {
  if (confirm('Delete this employee?')) {
    employeesStore.removeEmployee(id)
    if (editingId.value === id) resetForm()
  }
}

function getEmployeeStats(employee: Employee) {
  const stats = employeeSales.value.get(employee.username) || { count: 0, total: 0 }
  return stats
}

onMounted(() => {
  employeesStore.load()
  salesStore.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">
        {{ editingId == null ? 'Add Employee' : 'Edit Employee' }}
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
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Username <span class="text-red-500">*</span></label>
          <input
            v-model="form.username"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">
            Password <span class="text-red-500">*</span>
            <span v-if="editingId" class="text-xs text-gray-500">(leave blank to keep current)</span>
          </label>
          <input
            v-model="form.password"
            type="password"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Role <span class="text-red-500">*</span></label>
          <select
            v-model="form.role"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-700">Hire Date</label>
          <input
            v-model="form.hireDate"
            type="date"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Status</label>
          <select
            v-model="form.status"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button
          @click="save"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {{ editingId == null ? 'Add Employee' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="rounded-md border border-gray-300 px-4 py-2 text-sm">Clear</button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <h2 class="text-lg font-semibold text-gray-800">Employees ({{ filtered.length }})</h2>
        <div class="ml-auto flex flex-wrap gap-2">
          <input
            v-model="query"
            type="text"
            placeholder="Search..."
            class="w-48 rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <select
            v-model="filterRole"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Roles</option>
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
          <select
            v-model="filterStatus"
            class="rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Status</option>
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Username</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Role</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-700">Sales</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-700">Revenue</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="filtered.length === 0" class="text-center text-gray-500">
              <td colspan="7" class="px-4 py-8">No employees found</td>
            </tr>
            <tr v-for="employee in filtered" :key="employee.id" class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium text-gray-900">{{ employee.fullName }}</td>
              <td class="px-4 py-2 text-gray-700">{{ employee.username }}</td>
              <td class="px-4 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="{
                    'bg-purple-100 text-purple-800': employee.role === 'Admin',
                    'bg-blue-100 text-blue-800': employee.role === 'Manager',
                    'bg-green-100 text-green-800': employee.role === 'Cashier',
                  }"
                >
                  {{ employee.role }}
                </span>
              </td>
              <td class="px-4 py-2">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                >
                  {{ employee.status }}
                </span>
              </td>
              <td class="px-4 py-2 text-right text-gray-700">{{ getEmployeeStats(employee).count }}</td>
              <td class="px-4 py-2 text-right font-semibold text-gray-900">
                ₹{{ getEmployeeStats(employee).total.toFixed(2) }}
              </td>
              <td class="px-4 py-2 text-center">
                <div class="flex justify-center gap-2">
                  <button
                    @click="edit(employee)"
                    class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    @click="remove(employee.id)"
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

