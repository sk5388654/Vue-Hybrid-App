<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
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
import { useRefundsStore } from '@/store/refunds'

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
const refunds = useRefundsStore()

const isPrintRoute = computed(() => route.path.startsWith('/print/'))

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
    refunds.setCurrentStore()
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-shell">
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
    <div v-else class="flex min-h-screen">
      <Sidebar />
      <div class="flex flex-1 flex-col overflow-hidden relative">
        <main class="flex-1 overflow-y-auto px-4 py-8 lg:px-10">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
