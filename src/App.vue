<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/store/auth'
import { useProductsStore } from '@/store/products'
import { useStoresStore } from '@/store/stores'
import { useSalesStore } from '@/store/sales'
import { useExpensesStore } from '@/store/expenses'
import { useCustomersStore } from '@/store/customers'
import { useSuppliersStore } from '@/store/suppliers'
import { useEmployeesStore } from '@/store/employees'
import { useClosingVoucherStore } from '@/store/closingVouchers'

const route = useRoute()
const auth = useAuthStore()
const products = useProductsStore()
const stores = useStoresStore()
const sales = useSalesStore()
const expenses = useExpensesStore()
const customers = useCustomersStore()
const suppliers = useSuppliersStore()
const employees = useEmployeesStore()
const closing = useClosingVoucherStore()

const isPrintRoute = computed(() => route.path.startsWith('/print/'))

onMounted(() => {
  auth.load()
  stores.load()
  products.load()
  sales.load()
  expenses.load()
  customers.load()
  suppliers.load()
  employees.load()
  closing.load()
})

watch(
  () => stores.currentStoreId,
  (id) => {
    if (!id) return
    products.setCurrentStore(id)
    sales.load()
    expenses.setCurrentStore()
    customers.setCurrentStore()
    suppliers.setCurrentStore()
    employees.setCurrentStore()
    closing.setCurrentStore()
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="route.path === '/login'">
      <main class="mx-auto max-w-7xl px-4 py-6">
        <RouterView />
      </main>
    </div>
    <div v-else-if="isPrintRoute" class="flex print-container">
      <main class="mx-auto flex-1 px-0 py-0">
        <RouterView />
      </main>
    </div>
    <div v-else class="flex">
      <Sidebar />
      <main class="mx-auto flex-1 px-4 py-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
</style>
