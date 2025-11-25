

<template>
  <aside
    :class="[
      'hidden md:flex md:flex-col sticky top-0 h-screen px-4 py-6 backdrop-blur transition-all duration-300 dark-sidebar',
      sidebarWidthClass
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
      <div class="flex items-center justify-between gap-2 px-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100" title="Shop Suite">POS</span>
          <div v-if="!(isCollapsed && !isHovered)" class="text-lg font-semibold hidden lg:block">Shop Suite</div>
        </div>

        <div class="flex items-center gap-2">
        </div>
      </div>

      <div class="mt-6 rounded-2xl p-3 dark-panel transparent-panel relative">
        <div class="subtle-label hidden lg:block">Store</div>

        <!-- full store selector only on large screens -->
        <!-- full store selector: hidden when collapsed (even on lg) -->
        <div v-if="!(isCollapsed && !isHovered)" class="hidden lg:block">
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

        <!-- compact store button shown only when sidebar is collapsed -->
        <div v-if="isCollapsed && !isHovered" class="flex items-center justify-center">
          <button
            class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100"
            title="Current store"
            aria-label="Current store"
          >
            {{ (stores.find(s => s.id === currentStoreId) || { name: 'S' }).name.charAt(0) }}
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
        <template v-if="item.iconIsFa">
          <FontAwesomeIcon :icon="['fas', item.icon]" class="h-5 w-5 flex-shrink-0 text-black dark:text-white" />
        </template>
        <template v-else>
          <svg class="h-5 w-5 flex-shrink-0 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
            <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </template>
        <span :class="['ml-2', (isCollapsed && !isHovered) ? 'hidden' : 'hidden lg:inline']">{{ item.label }}</span>
      </RouterLink>
    </nav>

      <div class="mt-auto rounded-2xl p-3 dark-panel transparent-panel text-sm">
        <!-- full signed-in panel (hidden when collapsed) -->
        <div v-if="!(isCollapsed && !isHovered)" class="hidden lg:block">
          <div class="text-xs uppercase tracking-wide subtle-label">Signed in</div>
          <div class="font-semibold">{{ auth.user?.displayName }}</div>
          <button
            class="mt-3 w-full rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:bg-[rgba(255,255,255,0.02)]"
            @click="$router.push('/login'); auth.logout()"
          >
            Logout
          </button>
        </div>

        <!-- compact bottom controls for collapsed sidebar -->
        <div v-if="isCollapsed && !isHovered" class="flex flex-col items-center gap-2 py-2">
          <div class="inline-flex flex-col items-center gap-2">
            <div class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-slate-100">{{ auth.user?.displayName ? auth.user.displayName.charAt(0) : 'U' }}</div>
            <button class="p-2 rounded-md text-slate-600 hover:bg-[rgba(0,0,0,0.04)]" @click="$router.push('/login'); auth.logout(); closeSidebar()" aria-label="Logout" title="Logout">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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
    <!-- Add Store Modal -->
    <teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" @click="hideAdd" aria-hidden="true"></div>
        <div class="relative z-50 w-full max-w-md rounded-lg dark-panel p-4 shadow-lg">
          <h3 class="text-lg font-semibold mb-3">Add Store</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium">Store name <span class="text-red-600">*</span></label>
              <input v-model="newStoreName" @keyup.enter="saveNewStore" class="mt-1 w-full rounded input-field" placeholder="My Store" />
            </div>
            <div>
              <label class="text-xs font-medium">Admin username <span class="text-red-600">*</span></label>
              <input v-model="newStoreUsername" @keyup.enter="saveNewStore" class="mt-1 w-full rounded input-field" placeholder="admin" />
            </div>
            <div>
              <label class="text-xs font-medium">Admin password <span class="text-red-600">*</span></label>
              <input v-model="newStorePassword" type="password" @keyup.enter="saveNewStore" class="mt-1 w-full rounded input-field" placeholder="••••••" />
            </div>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="btn-ghost px-3 py-1" @click="hideAdd">Cancel</button>
            <button class="btn-primary px-3 py-1" @click="saveNewStore">Save</button>
          </div>
          <div v-if="showSuccess" class="mt-3 text-sm" :class="successMessage.includes('Error') ? 'text-red-600' : 'text-emerald-600'">{{ successMessage }}</div>
        </div>
      </div>
    </teleport>
  </aside>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faGear } from '@fortawesome/free-solid-svg-icons'
library.add(faGear)

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

// compute width classes based on collapsed state and hover
const sidebarWidthClass = computed(() => {
  // If collapsed and not hovered -> stay narrow on md+ (md:w-20)
  if (isCollapsed.value && !isHovered.value) {
    // keep narrow on md and lg
    return 'md:w-20 lg:w-20'
  }

  // If collapsed but hovered -> temporarily expand to full width
  if (isCollapsed.value && isHovered.value) {
    return 'md:w-72 lg:w-72'
  }

  // Not collapsed -> default behavior: narrow on md, wide on lg
  return 'md:w-20 lg:w-72'
})

// composable to manage mobile sidebar state and keyboard (Esc) handling
const { sidebarOpen, openSidebar, closeSidebar, toggleSidebar } = useSidebarToggle()

// collapsed UI helpers
const showStoreMenu = ref(false)

onMounted(() => {
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
    { label: 'Settings', to: '/settings', icon: 'gear', iconIsFa: true, show: true },
  ].filter((item) => item.show)
})

function deleteStore() {
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

function hideAdd() {
  showAdd.value = false
  newStoreName.value = ''
  newStoreUsername.value = ''
  newStorePassword.value = ''
}

function saveNewStore() {
  const name = (newStoreName.value || '').trim()
  const username = (newStoreUsername.value || '').trim()
  const password = (newStorePassword.value || '').trim()

  if (!name) {
    showSuccess.value = true
    successMessage.value = 'Error: Store name is required'
    window.setTimeout(() => (showSuccess.value = false), 1800)
    return
  }

  if (!username) {
    showSuccess.value = true
    successMessage.value = 'Error: Admin username is required'
    window.setTimeout(() => (showSuccess.value = false), 1800)
    return
  }

  if (!password) {
    showSuccess.value = true
    successMessage.value = 'Error: Admin password is required'
    window.setTimeout(() => (showSuccess.value = false), 1800)
    return
  }

  const creds = { username, password }
  const id = storesStore.addStore(name, creds, auth.user?.username)
  // select newly created store if nothing selected yet
  if (!storesStore.currentStoreId) storesStore.setCurrentStore(id)

  showSuccess.value = true
  successMessage.value = 'Store added successfully'
  // Show message for 2 seconds, then close modal
  window.setTimeout(() => {
    showSuccess.value = false
    hideAdd()
  }, 2000)
}

onMounted(() => {
  if (window.innerWidth < 1024) {
    isCollapsed.value = true
  }
})
</script>


<style scoped></style>

