<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useEmployeesStore, type Employee, type EmployeeRole, type EmployeeStatus } from '@/store/employees'
import { useSalesStore } from '@/store/sales'

const employeesStore = useEmployeesStore()
const auth = useAuthStore()
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
    <div v-if="auth.isAdmin" class="glass-panel space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="section-heading">
          {{ editingId == null ? 'Add Employee' : 'Edit Employee' }}
        </h2>
        <button v-if="editingId" class="btn-ghost text-xs" @click="resetForm">Cancel</button>
      </div>
      <div v-if="errorMessage" class="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-2 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="subtle-label">Full Name *</label>
          <input v-model="form.fullName" type="text" class="input-field" />
        </div>
        <div>
          <label class="subtle-label">Username *</label>
          <input v-model="form.username" type="text" class="input-field" />
        </div>
        <div>
          <label class="subtle-label">Password *</label>
          <input v-model="form.password" :placeholder="editingId ? 'Leave blank to keep current' : ''" type="password" class="input-field" />
        </div>
        <div>
          <label class="subtle-label">Role *</label>
          <select v-model="form.role" class="input-field">
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
        </div>
        <div>
          <label class="subtle-label">Hire Date</label>
          <input v-model="form.hireDate" type="date" class="input-field" />
        </div>
        <div>
          <label class="subtle-label">Status</label>
          <select v-model="form.status" class="input-field">
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="save" class="btn-primary text-white">
          {{ editingId == null ? 'Add Employee' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="btn-ghost">Clear</button>
      </div>
    </div>

    <div class="glass-panel space-y-4">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <h2 class="section-heading">Employees ({{ filtered.length }})</h2>
        <div class="flex items-center gap-2">
          <select v-model="filterRole" class="input-field w-28 text-xs">
            <option value="All">All Roles</option>
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
          <select v-model="filterStatus" class="input-field w-28 text-xs">
            <option value="All">All Status</option>
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
          <input v-model="query" type="search" placeholder="Search..." class="input-field w-32 ml-4 text-xs" style="margin-left:auto;" />
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-100">
        <div class="max-h-[540px] overflow-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th class="text-right">Sales</th>
                <th class="text-right">Revenue</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="7" class="text-center text-slate-400">No employees found</td>
              </tr>
              <tr v-for="employee in filtered" :key="employee.id">
                <td class="font-semibold text-slate-900">{{ employee.fullName }}</td>
                <td>{{ employee.username }}</td>
                <td>
                  <span
                    class="pill-badge"
                    :class="{
                      'text-purple-600 border-purple-100': employee.role === 'Admin',
                      'text-blue-600 border-blue-100': employee.role === 'Manager',
                      'text-emerald-600 border-emerald-100': employee.role === 'Cashier',
                    }"
                  >
                    {{ employee.role }}
                  </span>
                </td>
                <td>
                  <span
                    class="pill-badge"
                    :class="employee.status === 'Active' ? 'text-emerald-600 border-emerald-100' : 'text-slate-500 border-slate-200'"
                  >
                    {{ employee.status }}
                  </span>
                </td>
                <td class="text-right text-slate-600">{{ getEmployeeStats(employee).count }}</td>
                <td class="text-right font-semibold text-slate-900">
                  ₹{{ getEmployeeStats(employee).total.toFixed(2) }}
                </td>
                <td class="text-center">
                  <div class="inline-flex gap-2">
                    <button v-if="auth.isAdmin" @click="edit(employee)" class="btn-ghost text-xs px-3 py-1">
                      Edit
                    </button>
                    <button v-if="auth.isAdmin" @click="remove(employee.id)" class="btn-danger text-xs px-3 py-1">
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
  </div>
</template>

<style scoped>
</style>

