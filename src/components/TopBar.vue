<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
// import { useRoute, useRouter } from 'vue-router'

// const router = useRouter()
// const route = useRoute()
const query = ref('')
const isDarkMode = ref(false)

// const quickFilters = [
//   { label: 'Products', to: '/admin/products' },
//   { label: 'Customers', to: '/admin/customers' },
//   { label: 'Expenses', to: '/admin/expenses' },
//   { label: 'Suppliers', to: '/admin/suppliers' },
//   { label: 'Employees', to: '/admin/employees' },
//   { label: 'Reports', to: '/reports' },
//   { label: 'Sales', to: '/sales-history' },
// ]

// function go(to: string) {
//   if (route.path === to) return
//   router.push(to)
// }

// function handleSearch() {
//   window.dispatchEvent(
//     new CustomEvent('pos-global-search', {
//       detail: query.value,
//     })
//   )
// }

// function clearSearch() {
//   query.value = ''
//   handleSearch()
// }

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  // Persist theme preference
  if (isDarkMode.value) {
    localStorage.setItem('theme', 'dark')
  } else {
    localStorage.removeItem('theme')
  }
}

onMounted(() => {
  // Load saved theme preference
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
  }
  // Apply theme on mount
  document.documentElement.classList.toggle('dark', isDarkMode.value)
})

watch(isDarkMode, (val) => {
  document.documentElement.classList.toggle('dark', val)
  if (val) {
    document.documentElement.style.colorScheme = 'dark'
  } else {
    document.documentElement.style.colorScheme = 'light'
  }
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white/40 bg-white/80 backdrop-blur dark:border-[rgba(255,255,255,0.06)] dark:bg-[var(--panel)]">
    <div class="flex flex-wrap items-center gap-4 px-4 py-4 lg:px-8">
      <!-- <div class="flex min-w-[240px] flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-inner dark:border-[rgba(255,255,255,0.06)] dark:bg-[var(--input)]">
        <svg class="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m0-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
        </svg>
        <!-- <input
          v-model="query"
          type="search"
          placeholder="Search products, people, receipts..."
          class="input-field border-none bg-transparent px-0 text-sm shadow-none focus:ring-0 dark:placeholder-slate-500"
          @keyup.enter="handleSearch"
        /> -->
        <!-- <button v-if="query" class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400" @click="clearSearch"> -->
          <!-- Clear -->
        <!-- </button> -->
      <!-- </div>  -->

      <!-- <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="filter in quickFilters"
          :key="filter.to"
          class="quick-filter"
          :class="route.path.startsWith(filter.to) ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-[rgba(59,130,246,0.1)] dark:text-blue-400 dark:border-blue-400/30' : ''  "
          @click="go(filter.to)"
        >
          {{ filter.label }}
        </button>
      </div> -->

      <div class="ml-auto flex items-center gap-2">
        <button class="quick-filter" @click="toggleTheme">
          <span v-if="!isDarkMode">Light</span>
          <span v-else>Dark</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
</style>

