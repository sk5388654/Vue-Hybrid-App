<!--
Changes: Make sidebar responsive.
- Desktop (lg+): full sidebar with icons + labels (unchanged visually).
- Tablet (md): icons-only vertical bar (narrow width) with tooltips.
- Mobile (sm): hidden by default; hamburger toggles slide-in sidebar with overlay.
Only layout/UX changes added; business logic untouched.
-->

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useSidebarToggle } from '@/composables/useSidebarToggle'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '@/store/products'
import { useStoresStore } from '@/store/stores'
import { useSalesStore } from '@/store/sales'
import { useAuthStore } from '@/store/auth'

const products = useProductsStore()
const storesStore = useStoresStore()
const salesStore = useSalesStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

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
// keep local collapse state for persisted behavior but responsive classes drive layout
const isCollapsed = ref(true)
const isHovered = ref(false)

// composable to manage mobile sidebar state and keyboard (Esc) handling
const { sidebarOpen, openSidebar, closeSidebar, toggleSidebar } = useSidebarToggle()

// collapsed UI helpers
const showStoreMenu = ref(false)

// Theme toggle state for Sidebar (keeps toggle local to the sidebar)
const isDarkMode = ref(false)

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark', isDarkMode.value)
  if (isDarkMode.value) {
    localStorage.setItem('theme', 'dark')
  } else {
    localStorage.removeItem('theme')
  }
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark')
  }
  // restore collapsed state for sidebar; default to collapsed
  const collapsed = localStorage.getItem('sidebarCollapsed')
  if (collapsed === '0') {
    isCollapsed.value = false
  } else if (collapsed === '1') {
    isCollapsed.value = true
  } else if (window.innerWidth < 1024) {
    isCollapsed.value = true
  } else {
    isCollapsed.value = true
  }
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', isCollapsed.value ? '1' : '0')
}

const isAdmin = computed(() => auth.isAdmin)

const navItems = computed(() => {
  const canManage = auth.isAdmin || auth.isManager
  return [
    { label: 'Point of Sale', to: '/pos', icon: 'M3 12h18M3 6h10M3 18h14', show: true },
    { label: 'Products', to: '/admin/products', icon: 'M4 6h16M4 12h16M4 18h16', show: canManage },
    { label: 'Customers', to: '/admin/customers', icon: 'M12 14c4.418 0 8 1.79 8 4v2H4v-2c0-2.21 3.582-4 8-4zm0-2a4 4 0 1 1 0-8 4 4 0 0 1 0 8z', show: true },
    { label: 'Expenses', to: '/admin/expenses', icon: 'M12 8c-3.866 0-7 1.343-7 3s3.134 3 7 3 7-1.343 7-3-3.134-3-7-3zm0 8c-3.866 0-7 1.343-7 3v2h14v-2c0-1.657-3.134-3-7-3z', show: canManage },
    { label: 'Suppliers', to: '/admin/suppliers', icon: 'M5 8h14v10H5z M9 8V6a3 3 0 0 1 6 0v2', show: canManage },
    { label: 'Employees', to: '/admin/employees', icon: 'M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', show: canManage },
    { label: 'Refunds & Exchanges', to: '/admin/refunds', icon: 'M4 4v6h6M20 20v-6h-6M5 5 19 19', show: canManage },
    { label: 'Closing Voucher', to: '/closing', icon: 'M5 5h14v14H5z M8 9h8M8 13h8M8 17h5', show: canManage },
    { label: 'Reports', to: '/reports', icon: 'M5 13l4 4L19 7', show: true },
    { label: 'Sales History', to: '/sales-history', icon: 'M4 6h16M4 12h10M4 18h6', show: true },
  ].filter((item) => item.show)
})

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

function selectStore(id: string) {
  currentStoreId.value = id
  showStoreMenu.value = false
}

onMounted(() => {
  if (window.innerWidth < 1024) {
    isCollapsed.value = true
  }
})
</script>

<template>
  <!-- Desktop & Tablet sidebar: visible on md+; md shows narrow icons-only, lg shows full labels -->
  <aside
    class="hidden md:flex md:flex-col sticky top-0 h-screen px-4 py-6 backdrop-blur transition-all duration-300 dark-sidebar md:w-20 lg:w-72"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
      <div class="flex items-center justify-between gap-2 px-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100">POS</span>
          <div class="text-lg font-semibold hidden lg:block">Shop Suite</div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Theme toggle: show icon on md (compact) and icon+label on lg -->
          <button
            class="hidden md:inline-flex items-center gap-2 sidebar-toggle"
            @click="toggleTheme"
            :title="isDarkMode ? 'Switch to light' : 'Switch to dark'"
            aria-label="Toggle theme"
          >
            <svg class="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="hidden lg:inline text-sm">{{ isDarkMode ? 'Dark' : 'Light' }}</span>
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-2xl p-3 dark-panel transparent-panel relative">
        <div class="subtle-label hidden lg:block">Store</div>

        <!-- full store selector only on large screens -->
        <div class="hidden lg:block">
          <select
            v-model="currentStoreId"
            :disabled="!isAdmin"
            class="mt-2 w-full rounded-2xl input-field"
          >
            <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <div v-if="isAdmin" class="mt-3 flex gap-2">
            <button class="btn-ghost flex-1 py-1 text-xs" @click="showAdd = true">Add</button>
            <button class="btn-danger flex-1 py-1 text-xs" @click="deleteStore">Delete</button>
          </div>
        </div>

        <!-- compact store icon for tablet (md) -->
        <div class="flex items-center justify-center md:flex lg:hidden">
          <button
            class="sidebar-toggle"
            disabled
            aria-disabled="true"
            title="Store selection disabled in compact mode"
            aria-label="Select store (disabled)"
          >
            <span class="font-semibold text-sm">{{ (stores.find(s => s.id === currentStoreId) || { name: 'S' }).name.charAt(0) }}</span>
          </button>
        </div>
      </div>

    <nav class="mt-6 flex-1 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :title="item.label"
        :class="[
          'menu-item flex items-center gap-3 rounded-2xl transition',
          route.path.startsWith(item.to) ? 'active' : '',
          'md:justify-center md:px-0 md:py-2 lg:justify-start lg:px-3 lg:py-3'
        ]"
      >
        <svg class="h-5 w-5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
          <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="ml-2 hidden lg:inline">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto rounded-2xl p-3 dark-panel transparent-panel text-sm">
      <div class="hidden lg:block">
        <div class="text-xs uppercase tracking-wide subtle-label">Signed in</div>
        <div class="font-semibold">{{ auth.user?.displayName }}</div>
        <button
          class="mt-3 w-full rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:bg-[rgba(255,255,255,0.02)]"
          @click="$router.push('/login'); auth.logout()"
        >
          Logout
        </button>
      </div>
      <div class="flex items-center justify-center md:flex lg:hidden">
        <button
          class="sidebar-toggle"
          @click="$router.push('/login'); auth.logout(); closeSidebar()"
          aria-label="Logout"
          title="Logout"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile slide-in sidebar (teleported to body) -->
    <teleport to="body">
      <div v-show="sidebarOpen" class="fixed inset-0 z-50 md:hidden">
        <div class="absolute inset-0 bg-black/40" @click="closeSidebar" aria-hidden="true"></div>
        <aside
          class="relative z-50 h-full w-4/5 max-w-xs transform transition-transform duration-300 dark-sidebar pb-6"
          :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
          role="dialog"
          id="mobile-sidebar"
          aria-modal="true"
        >
          <div class="flex items-center justify-between p-4 border-b">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100">POS</span>
              <div class="text-lg font-semibold">Shop Suite</div>
            </div>
            <div class="flex items-center gap-2">
              <!-- Theme toggle in mobile header -->
              <button class="p-2 sidebar-toggle" @click="toggleTheme" :title="isDarkMode ? 'Switch to light' : 'Switch to dark'" aria-label="Toggle theme">
                <svg class="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="p-2" @click="closeSidebar" aria-label="Close menu">✕</button>
            </div>
          </div>

          <div class="flex flex-col h-full">
            <div class="p-4 overflow-y-auto flex-1">
              <div class="mb-4">
                <select v-model="currentStoreId" :disabled="!isAdmin" class="w-full rounded-md input-field" @change="closeSidebar">
                  <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <div v-if="isAdmin" class="mt-2 flex gap-2">
                  <button class="btn-ghost flex-1 py-1 text-xs" @click="showAdd = true; closeSidebar()">Add</button>
                  <button class="btn-danger flex-1 py-1 text-xs" @click="deleteStore(); closeSidebar()">Delete</button>
                </div>
              </div>
              <nav class="space-y-2">
                <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800" @click="closeSidebar">
                  <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
                    <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span class="text-sm font-medium">{{ item.label }}</span>
                </RouterLink>
              </nav>
            </div>

            <div class="p-4 border-t">
              <div class="text-xs uppercase tracking-wide subtle-label">Signed in</div>
              <div class="font-semibold mb-2">{{ auth.user?.displayName }}</div>
              <button class="mt-2 w-full rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-100 hover:bg-[rgba(255,255,255,0.02)]" @click="$router.push('/login'); auth.logout(); closeSidebar()">Logout</button>
            </div>
          </div>
        </aside>
      </div>
    </teleport>
  </aside>
</template>

<style scoped>

</style>

