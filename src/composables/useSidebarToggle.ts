// Small composable to manage sidebar and cart open/close state
// Added: provides `sidebarOpen` and `cartOpen` refs, toggle/open/close helpers,
// and global Escape key handler to close overlays (used by Sidebar and PosView).
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Shared singletons so multiple components (App + Sidebar) can toggle the same state
const sidebarOpen = ref(false)
const cartOpen = ref(false)

function openSidebar() { sidebarOpen.value = true }
function closeSidebar() { sidebarOpen.value = false }
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

function openCart() { cartOpen.value = true }
function closeCart() { cartOpen.value = false }
function toggleCart() { cartOpen.value = !cartOpen.value }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (sidebarOpen.value) sidebarOpen.value = false
    if (cartOpen.value) cartOpen.value = false
  }
}

let initialized = false
export function useSidebarToggle() {
  if (!initialized) {
    window.addEventListener('keydown', onKey)
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
    initialized = true
  }

  return {
    sidebarOpen,
    cartOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    openCart,
    closeCart,
    toggleCart,
  }
}
