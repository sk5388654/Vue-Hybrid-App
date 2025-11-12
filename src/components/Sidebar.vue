<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useProductsStore } from '@/store/products'
import { useStoresStore } from '@/store/stores'
import { useSalesStore } from '@/store/sales'
import { useAuthStore } from '@/store/auth'

const products = useProductsStore()
const storesStore = useStoresStore()
const salesStore = useSalesStore()
const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  storesStore.load()
})
const stores = computed(() => {
  // Admin sees all stores, store users see only their current store
  if (auth.isAdmin) {
    return storesStore.stores
  }
  // Store users see only their store
  const current = storesStore.stores.find(s => s.id === storesStore.currentStoreId)
  return current ? [current] : []
})
const currentStoreId = computed({
  get: () => storesStore.currentStoreId,
  set: (v: string) => {
    storesStore.setCurrentStore(v)
    products.setCurrentStore(v)
  },
})

const showAdd = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const newStoreName = ref('')
const newStoreUsername = ref('')
const newStorePassword = ref('')

const isAdmin = computed(() => auth.isAdmin)

function addStore() {
  if (!newStoreName.value.trim()) return
  if (!newStoreUsername.value.trim() || !newStorePassword.value.trim()) {
    alert('Username and password are required for store creation')
    return
  }
  const id = storesStore.addStore(
    newStoreName.value.trim(),
    { username: newStoreUsername.value.trim(), password: newStorePassword.value },
    auth.user?.username ?? 'admin'
  )
  // Show success message instead of switching
  successMessage.value = `Store "${newStoreName.value.trim()}" has been created successfully!`
  showSuccess.value = true
  newStoreName.value = ''
  newStoreUsername.value = ''
  newStorePassword.value = ''
  showAdd.value = false
  // Auto-hide success message after 3 seconds
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

function deleteStore() {
  // Use the global confirm from script context. globalThis is safe in all environments.
  if (!globalThis.confirm('Delete current store? This removes its products and sales.')) return
  const id = storesStore.currentStoreId
  const removed = storesStore.deleteStore(id)
  // if we just deleted the store that belonged to the logged-in user (their credential), log them out
  if (removed?.credentials?.username && auth.user?.username === removed.credentials.username) {
    auth.logout()
    // navigate to login view
    try { router.push('/login') } catch {}
  }
  products.load()
  salesStore.load()
}
</script>

<template>
  <aside class="flex h-full w-64 flex-col gap-4 border-r bg-white p-4">
    <div class="text-lg font-semibold text-gray-900">Shop POS</div>

    <div class="text-sm">
      <label class="mb-1 block text-gray-600">Store</label>
      <select v-model="currentStoreId" :disabled="!isAdmin" class="w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
        <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <div v-if="isAdmin" class="mt-2 flex gap-2">
        <button class="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs" @click="showAdd = true">Add Store</button>
        <button
          class="flex-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700"
          @click="deleteStore"
        >Delete Store</button>
      </div>
    </div>

    <nav class="mt-2 flex flex-col gap-2 text-sm">
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/pos">POS</RouterLink>
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/admin/products" v-if="isAdmin || auth.isManager">Products</RouterLink>
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/admin/customers">Customers</RouterLink>
      <RouterLink v-if="isAdmin" class="rounded px-2 py-1 hover:bg-gray-100" to="/admin/expenses">Expenses</RouterLink>
      <RouterLink v-if="isAdmin || auth.isManager" class="rounded px-2 py-1 hover:bg-gray-100" to="/admin/suppliers">Suppliers</RouterLink>
      <RouterLink v-if="isAdmin || auth.isManager" class="rounded px-2 py-1 hover:bg-gray-100" to="/admin/employees">Employees</RouterLink>
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/closing">Closing Voucher</RouterLink>
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/reports">Reports</RouterLink>
      <RouterLink class="rounded px-2 py-1 hover:bg-gray-100" to="/sales-history">Sales History</RouterLink>
    </nav>

    <div class="mt-auto text-sm text-gray-600">
      <div>Signed in as: <span class="font-medium">{{ auth.user?.displayName }}</span></div>
      <button class="mt-2 rounded-md border border-gray-300 px-3 py-1 text-xs" @click="$router.push('/login'); auth.logout()">Logout</button>
    </div>

    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div class="mb-3 text-base font-semibold text-gray-900">Add Store</div>
        <div class="space-y-2">
          <div>
            <label class="block text-sm text-gray-700">Store Name</label>
            <input v-model="newStoreName" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-sm text-gray-700">Username <span class="text-red-500">*</span></label>
              <input v-model="newStoreUsername" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block text-sm text-gray-700">Password <span class="text-red-500">*</span></label>
              <input v-model="newStorePassword" type="password" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded-md border border-gray-300 px-4 py-2 text-sm" @click="showAdd = false">Cancel</button>
          <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white" @click="addStore">Add</button>
        </div>
      </div>
    </div>

    <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <div class="mb-3 text-base font-semibold text-green-600">Success!</div>
        <div class="text-sm text-gray-700">{{ successMessage }}</div>
        <div class="mt-4 flex justify-end">
          <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white" @click="showSuccess = false">OK</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
</style>

