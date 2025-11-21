<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
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
const isCollapsed = ref(true)
const isHovered = ref(false)

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
  <aside
    class="hidden md:flex"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    :class="[
      'sticky top-0 h-screen flex-col px-4 py-6 backdrop-blur transition-all duration-300 dark-sidebar',
      (isCollapsed && !isHovered) ? 'w-20 sidebar-collapsed' : 'w-72'
    ]"
  >
      <div class="flex items-center justify-between gap-2 px-2">
        <div class="flex items-center gap-2">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100">POS</span>
        <div v-if="!isCollapsed || isHovered" class="text-lg font-semibold">Shop Suite</div>
      </div>

      <div class="flex items-center gap-2">
        <!-- collapse/expand button removed; sidebar now collapses by default and expands on hover -->

        <!-- Theme toggle: hide when sidebar is collapsed (but show when hovered) -->
        <button
          v-if="!isCollapsed || isHovered"
          class="sidebar-toggle"
          @click="toggleTheme"
          :title="isDarkMode ? 'Switch to light' : 'Switch to dark'"
          aria-label="Toggle theme"
        >
          <span v-if="isDarkMode">Dark</span>
          <span v-else>Light</span>
        </button>
      </div>
    </div>

      <div class="mt-6 rounded-2xl p-3 dark-panel transparent-panel relative">
      <div class="subtle-label" v-if="!isCollapsed || isHovered">Store</div>

      <!-- full store selector when expanded or hovered -->
      <div v-if="!isCollapsed || isHovered">
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

      <!-- compact store icon + menu when collapsed and not hovered -->
      <div v-if="isCollapsed && !isHovered" class="flex items-center justify-center">
        <button
          class="sidebar-toggle"
          disabled
          aria-disabled="true"
          :title="'Store selection disabled when sidebar is collapsed'"
          aria-label="Select store (disabled)"
        >
          <span class="font-semibold text-sm">{{ (stores.find(s => s.id === currentStoreId) || { name: 'S' }).name.charAt(0) }}</span>
        </button>

        <div v-if="showStoreMenu" class="absolute left-full top-0 mt-0 ml-2 w-48 rounded-md z-50">
          <div class="glass-panel p-2">
            <ul>
              <li v-for="s in stores" :key="s.id">
                <button class="w-full text-left p-2 rounded hover:bg-slate-100" @click="selectStore(s.id)">{{ s.name }}</button>
              </li>
            </ul>
            <div v-if="isAdmin" class="mt-2 flex gap-2">
              <button class="btn-ghost flex-1 py-1 text-xs" @click="showAdd = true">Add</button>
              <button class="btn-danger flex-1 py-1 text-xs" @click="deleteStore">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <nav class="mt-6 flex-1 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'menu-item flex items-center gap-3 rounded-2xl transition',
          route.path.startsWith(item.to) ? 'active' : '',
          (isCollapsed && !isHovered) ? 'justify-center px-0 py-2' : 'px-3 py-3'
        ]"
      >
        <svg class="h-5 w-5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
          <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!isCollapsed || isHovered" class="ml-2">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto rounded-2xl p-3 dark-panel transparent-panel text-sm">
      <div v-if="!isCollapsed || isHovered">
        <div class="text-xs uppercase tracking-wide subtle-label">Signed in</div>
        <div class="font-semibold">{{ auth.user?.displayName }}</div>
        <button
          class="mt-3 w-full rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:bg-[rgba(255,255,255,0.02)]"
          @click="$router.push('/login'); auth.logout()"
        >
          Logout
        </button>
      </div>
      <div v-if="isCollapsed && !isHovered" class="flex items-center justify-center">
        <button
          class="sidebar-toggle"
          @click="$router.push('/login'); auth.logout()"
          aria-label="Logout"
          title="Logout"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
          </svg>
        </button>
      </div>
    </div>

    <teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] px-4">
        <div class="w-full max-w-md rounded-lg dark-panel p-4">
          <div class="mb-3 text-base font-semibold text-slate-100">Add Store</div>
          <div class="space-y-2">
            <div>
              <label class="block text-sm text-slate-300">Store Name</label>
              <input v-model="newStoreName" type="text" class="mt-1 w-full rounded-md input-field" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-sm text-slate-300">Username <span class="text-red-500">*</span></label>
                <input v-model="newStoreUsername" type="text" class="mt-1 w-full rounded-md input-field" />
              </div>
              <div>
                <label class="block text-sm text-slate-300">Password <span class="text-red-500">*</span></label>
                <input v-model="newStorePassword" type="password" class="mt-1 w-full rounded-md input-field" />
              </div>
            </div>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-md border border-transparent px-4 py-2 text-sm text-slate-300" @click="showAdd = false">Cancel</button>
            <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-slate-100" @click="addStore">Add</button>
          </div>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] px-4">
        <div class="w-full max-w-md rounded-lg dark-panel p-4">
          <div class="mb-3 text-base font-semibold text-green-500">Success!</div>
          <div class="text-sm text-slate-300">{{ successMessage }}</div>
          <div class="mt-4 flex justify-end">
            <button class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-slate-100" @click="showSuccess = false">OK</button>
          </div>
        </div>
      </div>
    </teleport>
  </aside>
</template>

<style scoped>

</style>

