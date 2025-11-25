<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
// import InstallPWA from '@/components/InstallPWA.vue'
import { useSidebarToggle } from '@/composables/useSidebarToggle'
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

const { sidebarOpen, toggleSidebar } = useSidebarToggle()

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
        <!-- Mobile hamburger (top-left) to open slide-in sidebar; hidden on lg+ -->
        <!-- moved slightly higher to sit a bit above page content for nicer visual spacing -->
        <!-- nudged a little higher (top-3) so it sits above content for nicer spacing -->
        <button class="absolute left-4 top-3 -translate-y-1 z-40 inline-flex items-center justify-center p-2 rounded-md bg-white/90 dark:bg-slate-800/90 shadow md:hidden" @click="toggleSidebar" :aria-controls="'mobile-sidebar'" :aria-expanded="sidebarOpen" aria-label="Open menu">
          <svg class="h-6 w-6 text-slate-900 dark:text-slate-100" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <main class="flex-1 overflow-y-auto px-4 py-8 lg:px-10">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
