<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <section class="lg:col-span-2">
      <div class="mb-3">
        <!-- Warning shown when shift is not started -->
        <div v-if="!isShiftOpen" class="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          <div class="flex items-center gap-2">
            <div>
              <strong>Start a shift first:</strong>
              <span class="ml-1">Please start the shift before adding items to the cart.</span>
            </div>
            <button
              type="button"
              @click="goToClosing"
              class="ml-auto rounded px-2 py-1 text-sm font-semibold text-yellow-900 underline hover:no-underline"
            >
              Go to Closing
            </button>
          </div>
        </div>
      </div>

      <div class="pr-2" style="height:680px; overflow:hidden;">
        <ProductList class="h-full" :products="productsStore.products" :disabled="!isShiftOpen" @add="addToCart" />
      </div>
    </section>

    <!-- Cart shown as right-side panel on large screens; hidden on small so mobile uses bottom drawer -->
    <aside class="hidden lg:block lg:col-span-1">
      <Cart
        :items="detailedCart"
        :subtotal="subtotal"
        :invoiceDiscountMode="invoiceDiscount.mode"
        :invoiceDiscountValue="invoiceDiscount.value"
        :invoiceDiscountAmount="invoiceDiscountAmount"
        :grandTotal="grandTotal"
        :selectedId="selectedCartItemId"
        :disabled="!isShiftOpen"
        @select="onSelectCartItem"
        @updateQty="updateQuantity"
        @remove="removeFromCart"
        @checkout="checkout"
        @hold="holdSale"
        @update-item-discount="updateItemDiscount"
        @updateInvoiceDiscountMode="updateInvoiceDiscountMode"
        @updateInvoiceDiscountValue="updateInvoiceDiscountValue"
      />
      
      <div class="mt-4 space-y-3">
        <!-- Customer Panel -->
        <div class="rounded-lg border dark-panel p-3 shadow-sm">
          <label class="mb-2 block text-sm font-medium text-slate-300">Customer (Optional)</label>
          <select
            v-model="selectedCustomerId"
            class="w-full rounded-md border dark-panel px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
          >
            <option :value="null">Walk-in Customer</option>
            <option v-for="customer in customers" :key="customer.id" :value="customer.id">
              {{ customer.fullName }} ({{ customer.phone }})
            </option>
          </select>
          <div v-if="selectedCustomerId" class="mt-2 text-xs text-slate-400">
            <div>Total Purchases: ₹{{ customers.find(c => c.id === selectedCustomerId)?.totalPurchases.toFixed(2) || '0.00' }}</div>
            <div :class="customers.find(c => c.id === selectedCustomerId)?.totalDue ? 'text-red-400' : 'text-green-400'">
              Current Due: ₹{{ customers.find(c => c.id === selectedCustomerId)?.totalDue.toFixed(2) || '0.00' }}
            </div>
          </div>
        </div>

        <!-- Payment Panel -->
        <div class="rounded-lg border dark-panel p-3 shadow-sm">
            <PaymentSelect
              v-model="paymentType"
              @apply-amount="(val) => { amountPaid = val; isCreditSale = true }"
              @open-resume="() => { loadSuspended(); showResumeModal = true }"
            />

            <!-- Scan Mode indicator / toast -->
              <div v-if="settings.scanEnabled" class="mt-2 flex items-center gap-2">
              <div class="rounded bg-green-900 px-2 py-1 text-sm font-medium text-green-300">Scan Mode: ON</div>
            </div>
            <div v-if="showScanToast" class="mt-2 text-sm text-white bg-green-700 rounded px-2 py-1">Scan Mode Activated</div>
          </div>

        <!-- Credit Sale Panel -->
        <div v-if="selectedCustomerId" class="rounded-lg border dark-panel p-3 shadow-sm">
          <div class="mb-2 flex items-center gap-2">
            <input
              v-model="isCreditSale"
              type="checkbox"
              id="creditSale"
              class="h-4 w-4 rounded border-slate-700 text-indigo-400 focus:ring-indigo-500"
            />
            <label for="creditSale" class="text-sm font-medium text-slate-300">Credit Sale</label>
          </div>
          <div v-if="isCreditSale" class="mt-2">
            <label class="block text-sm text-slate-300">Amount Paid</label>
            <input
              v-model.number="amountPaid"
              type="number"
              min="0"
              :max="grandTotal"
              step="0.01"
              class="mt-1 w-full rounded-md border dark-panel px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
            />
            <div class="mt-1 text-xs text-slate-400">
              <div>Grand Total: ₹{{ grandTotal.toFixed(2) }}</div>
              <div class="text-red-400">Due: ₹{{ dueAmount.toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>

  <!-- Floating Cart button for mobile (shows on screens smaller than lg) -->
  <button
    class="fixed z-40 bottom-20 right-4 inline-flex items-center justify-center rounded-full bg-green-600 text-white p-4 shadow-lg lg:hidden"
    @click="toggleCart()"
    aria-controls="mobile-cart"
    :aria-expanded="cartOpen"
    title="Toggle cart"
  >
    <span class="sr-only">Open cart</span>
    <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
    </svg>
    <span class="ml-2 hidden sm:inline">Cart</span>
  </button>

  <!-- Mobile cart drawer (teleported to body) -->
  <teleport to="body">
    <div v-show="cartOpen" class="fixed inset-0 z-50 lg:hidden">
      <div class="absolute inset-0 bg-black/40" @click="closeCart" aria-hidden="true"></div>
      <div id="mobile-cart" role="dialog" aria-modal="true" class="absolute left-0 right-0 bottom-0 z-50">
        <div :class="['transform transition-transform duration-300 bg-white dark:bg-slate-900 rounded-t-lg p-4', cartOpen ? 'translate-y-0' : 'translate-y-full']">
          <div class="flex items-center justify-between mb-3">
            <div class="text-lg font-semibold">Cart</div>
            <button @click="closeCart" class="p-2">Close</button>
          </div>
          <div class="max-h-[60vh] overflow-auto">
            <Cart
              :items="detailedCart"
              :subtotal="subtotal"
              :invoiceDiscountMode="invoiceDiscount.mode"
              :invoiceDiscountValue="invoiceDiscount.value"
              :invoiceDiscountAmount="invoiceDiscountAmount"
              :grandTotal="grandTotal"
              :selectedId="selectedCartItemId"
              :disabled="!isShiftOpen"
              @select="onSelectCartItem"
              @updateQty="updateQuantity"
              @remove="removeFromCart"
              @checkout="checkout"
              @hold="holdSale"
              @update-item-discount="updateItemDiscount"
              @updateInvoiceDiscountMode="updateInvoiceDiscountMode"
              @updateInvoiceDiscountValue="updateInvoiceDiscountValue"
            />
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <ReceiptModal
    v-if="isModalOpen"
    :items="detailedCart"
    :subtotal="subtotal"
    :productDiscountTotal="productDiscountTotal"
    :invoiceDiscountMode="invoiceDiscount.mode"
    :invoiceDiscountValue="invoiceDiscount.value"
    :invoiceDiscountAmount="invoiceDiscountAmount"
    :grandTotal="grandTotal"
    @confirm="confirmCheckout"
    @cancel="cancelCheckout"
  />

  <InvoiceModal
    v-if="showInvoice && lastInvoice"
    :invoiceNumber="lastInvoice.invoiceNumber"
    :datetime="lastInvoice.datetime"
    :items="lastInvoice.items"
    :subtotal="lastInvoice.subtotal"
    :productDiscountTotal="lastInvoice.productDiscountTotal"
    :invoiceDiscountMode="lastInvoice.invoiceDiscountMode"
    :invoiceDiscountValue="lastInvoice.invoiceDiscountValue"
    :invoiceDiscountAmount="lastInvoice.invoiceDiscountAmount"
    :total="lastInvoice.total"
    :paymentType="lastInvoice.paymentType"
    :cashier="lastInvoice.cashier"
    :customerName="lastInvoice.customerName"
    @close="showInvoice = false"
  />

  <!-- Resume Suspended Sales Modal -->
  <div v-if="showResumeModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="showResumeModal = false"></div>
    <div class="relative z-60 w-11/12 max-w-2xl rounded bg-white p-4 shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold">Suspended Sales</h3>
            <button class="text-sm text-gray-600" @click="showResumeModal = false">Close</button>
          </div>

          <div class="mb-3">
            <input v-model="suspendSearch" type="text" placeholder="Search suspended sales or items..." class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div v-if="!suspendedSales.length" class="text-sm text-gray-500">No suspended sales.</div>
          <ul v-else class="space-y-2 max-h-96 overflow-auto">
        <li v-for="s in filteredSuspended" :key="s.id" class="rounded border p-3">
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <div class="text-sm font-medium">{{ s.customerName || 'Walk-in' }} — {{ s.total.toFixed(2) }} Rs</div>
              <div class="text-xs text-gray-500">{{ new Date(s.createdAt).toLocaleString() }}</div>
              <div class="mt-2 text-xs">
                <div v-for="it in s.items" :key="s.id + '_' + it.id">{{ it.name }} × {{ it.quantity }} — Rs {{ (it.price * it.quantity).toFixed(2) }}</div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button @click="resumeSale(s.id)" class="rounded bg-green-600 px-3 py-1 text-white text-sm">Resume</button>
              <button @click="deleteSuspended(s.id)" class="rounded border px-3 py-1 text-sm">Delete</button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>

  <!-- Hidden scan input used when Scan Mode is enabled -->
  <input
    ref="scanInput"
    v-model="scanBuffer"
    @keydown.enter.prevent="onScanSubmit"
    aria-hidden="true"
    autocomplete="off"
    tabindex="-1"
    type="text"
    style="position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0;"
  />
</template>


<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useStoresStore } from '@/store/stores'
import { useRouter } from 'vue-router'
import { useProductsStore, type Product } from '@/store/products'
import { useSalesStore, type DiscountMode } from '@/store/sales'
import { useCustomersStore } from '@/store/customers'
import { useClosingVoucherStore } from '@/store/closingVouchers'
import ProductList from '@/components/ProductList.vue'
import Cart from '@/components/Cart.vue'
import { useSidebarToggle } from '@/composables/useSidebarToggle'
import ReceiptModal from '@/components/ReceiptModal.vue'
import InvoiceModal from '@/components/InvoiceModal.vue'
import PaymentSelect from '@/components/PaymentSelect.vue'
import { useSettingsStore } from '@/store/settings'

type CartItemRaw = {
  id: number
  name: string
  price: number
  quantity: number
  stock: number
  image: string
  discountMode: DiscountMode
  discountValue: number
}

type DetailedCartItem = CartItemRaw & {
  gross: number
  lineDiscount: number
  lineTotal: number
}

type InvoiceSnapshotItem = {
  name: string
  quantity: number
  unitPrice: number
  lineDiscount: number
  lineTotal: number
}

type InvoiceSnapshot = {
  invoiceNumber: string
  datetime: string
  items: InvoiceSnapshotItem[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  total: number
  paymentType: string
  cashier: string
  customerName?: string
}

const productsStore = useProductsStore()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()
const closingStore = useClosingVoucherStore()
const router = useRouter()

function goToClosing() {
  router.push('/closing')
}

const cart = reactive<CartItemRaw[]>([])
const selectedCartItemId = ref<number | null>(null)
const paymentType = ref<'cash' | 'card' | 'mobile'>('cash')
const selectedCustomerId = ref<string | null>(null)
const isCreditSale = ref(false)
const amountPaid = ref<number>(0)
const cashier = ref('Cashier-1')
const isModalOpen = ref(false)
const showInvoice = ref(false)
const lastInvoice = ref<InvoiceSnapshot | null>(null)

const invoiceDiscount = reactive<{ mode: DiscountMode; value: number }>({ mode: 'flat', value: 0 })

const detailedCart = computed<DetailedCartItem[]>(() =>
  cart.map((item) => {
    const gross = item.price * item.quantity
    const discountVal = Math.max(item.discountValue, 0)
    const discountAmount = item.discountMode === 'percent' ? (gross * Math.min(discountVal, 100)) / 100 : discountVal
    const lineDiscount = Math.min(discountAmount, gross)
    const lineTotal = gross - lineDiscount
    return { ...item, gross, lineDiscount, lineTotal }
  })
)

const subtotal = computed(() => detailedCart.value.reduce((sum, item) => sum + item.lineTotal, 0))
const productDiscountTotal = computed(() => detailedCart.value.reduce((sum, item) => sum + item.lineDiscount, 0))
const invoiceDiscountAmount = computed(() => {
  const base = subtotal.value
  if (base <= 0) return 0
  if (invoiceDiscount.mode === 'percent') {
    const percent = Math.min(Math.max(invoiceDiscount.value, 0), 100)
    return (base * percent) / 100
  }
  return Math.min(Math.max(invoiceDiscount.value, 0), base)
})
const grandTotal = computed(() => Math.max(subtotal.value - invoiceDiscountAmount.value, 0))
const totalDiscount = computed(() => productDiscountTotal.value + invoiceDiscountAmount.value)
const dueAmount = computed(() => {
  if (!isCreditSale.value) return 0
  return Math.max(0, grandTotal.value - amountPaid.value)
})

const customers = computed(() => customersStore.customersForCurrentStore)
const isShiftOpen = computed(() => !!closingStore.activeShift)

const CART_KEY = 'posCart'
const SELECTED_KEY = 'posSelectedCartItemId'
const SUSPENDED_PREFIX = 'suspended_sales_'

type SuspendedSale = {
  id: string
  createdAt: string
  items: CartItemRaw[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: DiscountMode
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  total: number
  paymentType: string
  cashier: string
  customerId?: string | null
  customerName?: string
}

const suspendedSales = ref<SuspendedSale[]>([])
const showResumeModal = ref(false)
const settings = useSettingsStore()
const showScanToast = ref(false)
const scanBuffer = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const storesStore = useStoresStore()
const suspendSearch = ref('')
const filteredSuspended = computed(() => {
  const q = suspendSearch.value.trim().toLowerCase()
  if (!q) return suspendedSales.value
  return suspendedSales.value.filter(s => {
    if ((s.customerName || '').toLowerCase().includes(q)) return true
    return s.items.some(it => it.name.toLowerCase().includes(q))
  })
})

function suspendedKey() {
  const sid = storesStore.currentStoreId || ''
  return `${SUSPENDED_PREFIX}${sid}`
}

function persistSuspended() {
  try {
    localStorage.setItem(suspendedKey(), JSON.stringify(suspendedSales.value))
  } catch {}
}

function loadSuspended() {
  try {
    const raw = localStorage.getItem(suspendedKey())
    if (!raw) {
      suspendedSales.value = []
      return
    }
    suspendedSales.value = JSON.parse(raw) as SuspendedSale[]
  } catch {
    suspendedSales.value = []
  }
}

function addToCart(product: Product) {
  if (!closingStore.activeShift) {
    alert('Start a shift before adding items to the cart.')
    return
  }
  if (product.stock < 1) return
  const existing = cart.find((c) => c.id === product.id)
  if (existing) {
    if (existing.quantity < product.stock) existing.quantity += 1
    return
  }
  cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    stock: product.stock,
    image: product.image,
    discountMode: 'flat',
    discountValue: 0,
  })
}

function clearCurrentCart() {
  cart.splice(0, cart.length)
  selectedCartItemId.value = null
  selectedCustomerId.value = null
  isCreditSale.value = false
  amountPaid.value = 0
  invoiceDiscount.mode = 'flat'
  invoiceDiscount.value = 0
}

function holdSale() {
  if (!cart.length) return
  const id = `hold_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
  const snap: SuspendedSale = {
    id,
    createdAt: new Date().toISOString(),
    items: cart.map(i => ({ ...i })),
    subtotal: subtotal.value,
    productDiscountTotal: productDiscountTotal.value,
    invoiceDiscountMode: invoiceDiscount.mode,
    invoiceDiscountValue: invoiceDiscount.value,
    invoiceDiscountAmount: invoiceDiscountAmount.value,
    total: grandTotal.value,
    paymentType: paymentType.value,
    cashier: cashier.value,
    customerId: selectedCustomerId.value,
    customerName: selectedCustomerId.value ? (customersStore.customersForCurrentStore.find(c => c.id === selectedCustomerId.value)?.fullName) : undefined,
  }
  suspendedSales.value.push(snap)
  persistSuspended()
  clearCurrentCart()
}

function resumeSale(id: string) {
  const idx = suspendedSales.value.findIndex(s => s.id === id)
  if (idx === -1) return
  const s = suspendedSales.value[idx]
  // restore cart items
  cart.splice(0, cart.length, ...s.items.map(i => ({ ...i })))
  // restore other state
  invoiceDiscount.mode = s.invoiceDiscountMode
  invoiceDiscount.value = s.invoiceDiscountValue
  paymentType.value = s.paymentType as any
  selectedCustomerId.value = s.customerId || null
  // remove suspended
  suspendedSales.value.splice(idx, 1)
  persistSuspended()
  showResumeModal.value = false
}

function processBarcode(raw: string) {
  const code = (raw || '').trim()
  if (!code) return
  // try direct lookup by barcode
  const byBarcode = productsStore.byBarcode as Map<string, any>
  const prod = byBarcode.get(code)
  if (prod) {
    addToCart(prod)
    return
  }
  // try with numeric-only or trimmed zeros
  const alt = code.replace(/^0+/, '')
  if (alt && byBarcode.get(alt)) {
    addToCart(byBarcode.get(alt))
  }
}

function onScanSubmit() {
  const value = scanBuffer.value.trim()
  if (value) processBarcode(value)
  scanBuffer.value = ''
  // keep focus when scan mode is enabled
  if (settings.scanEnabled && scanInput.value) {
    setTimeout(() => scanInput.value && scanInput.value.focus(), 20)
  }
}

// scan toggle now lives in settings store

function deleteSuspended(id: string) {
  const idx = suspendedSales.value.findIndex(s => s.id === id)
  if (idx === -1) return
  suspendedSales.value.splice(idx, 1)
  persistSuspended()
}

function updateQuantity(id: number, quantity: number) {
  const item = cart.find((c) => c.id === id)
  if (!item) return
  const prod = productsStore.products.find((p) => p.id === id)
  const maxStock = prod ? prod.stock : item.stock
  const safeQty = Math.max(1, Math.min(quantity, maxStock))
  item.quantity = safeQty
}

function removeFromCart(id: number) {
  const idx = cart.findIndex((c) => c.id === id)
  if (idx !== -1) {
    cart.splice(idx, 1)
    if (selectedCartItemId.value === id) selectedCartItemId.value = null
  }
}

function updateItemDiscount(payload: { id: number; mode?: DiscountMode; value?: number }) {
  const item = cart.find((c) => c.id === payload.id)
  if (!item) return
  if (payload.mode) {
    item.discountMode = payload.mode
    if (item.discountMode === 'percent' && item.discountValue > 100) item.discountValue = 100
  }
  if (payload.value !== undefined) {
    let val = Math.max(payload.value, 0)
    if (item.discountMode === 'percent' && val > 100) val = 100
    item.discountValue = val
  }
}

function updateInvoiceDiscountMode(mode: DiscountMode) {
  invoiceDiscount.mode = mode
  if (mode === 'percent' && invoiceDiscount.value > 100) invoiceDiscount.value = 100
  if (mode === 'flat' && invoiceDiscount.value > subtotal.value) invoiceDiscount.value = subtotal.value
}

function updateInvoiceDiscountValue(value: number) {
  let val = Math.max(value, 0)
  if (invoiceDiscount.mode === 'percent' && val > 100) val = 100
  invoiceDiscount.value = val
}

function checkout() {
  if (!cart.length) return
  if (!closingStore.activeShift) {
    alert('Please start a shift before processing sales.')
    return
  }
  if (grandTotal.value <= 0) {
    alert('Grand total must be greater than zero.')
    return
  }
  // If mobile cart drawer is open, close it first so the Receipt modal appears above it.
  // We add a short delay to allow the drawer transition to finish (250ms).
  if (typeof cartOpen !== 'undefined' && cartOpen.value) {
    closeCart()
    setTimeout(() => {
      isModalOpen.value = true
    }, 250)
  } else {
    isModalOpen.value = true
  }
}

function confirmCheckout() {
  const customer = selectedCustomerId.value ? customersStore.customersForCurrentStore.find(c => c.id === selectedCustomerId.value) : null
  const due = dueAmount.value

  const sale = salesStore.recordSale({
    datetime: new Date().toISOString(),
    items: detailedCart.value.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      discountMode: item.discountMode,
      discountValue: item.discountValue,
      lineDiscount: item.lineDiscount,
      lineTotal: item.lineTotal,
    })),
    subtotal: subtotal.value,
    productDiscountTotal: productDiscountTotal.value,
    invoiceDiscountMode: invoiceDiscount.mode,
    invoiceDiscountValue: invoiceDiscount.value,
    invoiceDiscountAmount: invoiceDiscountAmount.value,
    totalDiscount: totalDiscount.value,
    total: grandTotal.value,
    paymentType: paymentType.value,
    cashier: cashier.value,
    customerId: selectedCustomerId.value || undefined,
    customerName: customer?.fullName || undefined,
    dueAmount: due > 0 ? due : undefined,
  })

  productsStore.decrementStock(cart.map((c) => ({ id: c.id, quantity: c.quantity })))
  cart.splice(0, cart.length)
  selectedCartItemId.value = null
  selectedCustomerId.value = null
  isCreditSale.value = false
  amountPaid.value = 0
  invoiceDiscount.mode = 'flat'
  invoiceDiscount.value = 0
  isModalOpen.value = false

  lastInvoice.value = {
    invoiceNumber: sale.invoiceNumber,
    datetime: sale.datetime,
    items: sale.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount,
      lineTotal: item.lineTotal,
    })) as InvoiceSnapshotItem[],
    subtotal: sale.subtotal,
    productDiscountTotal: sale.productDiscountTotal,
    invoiceDiscountMode: sale.invoiceDiscountMode,
    invoiceDiscountValue: sale.invoiceDiscountValue,
    invoiceDiscountAmount: sale.invoiceDiscountAmount,
    total: sale.total,
    paymentType: sale.paymentType,
    cashier: sale.cashier,
    customerName: sale.customerName,
  }
  localStorage.setItem('lastInvoice', JSON.stringify(lastInvoice.value))
  showInvoice.value = true
}

function cancelCheckout() {
  isModalOpen.value = false
}

function onSelectCartItem(id: number) {
  selectedCartItemId.value = id
}


function onKeydown(e: KeyboardEvent) {
  if (e.key === 'F1') {
    e.preventDefault()
    checkout()
    return
  }
  if (e.key === 'F2') {
    e.preventDefault()
    holdSale()
    return
  }
  if (e.key === 'Enter' && !isModalOpen.value && cart.length) {
    e.preventDefault()
    checkout()
  } else if (e.key === 'Delete' && selectedCartItemId.value != null) {
    e.preventDefault()
    removeFromCart(selectedCartItemId.value)
  }
}

watch(isCreditSale, (enabled) => {
  if (enabled) {
    amountPaid.value = grandTotal.value
  } else {
    amountPaid.value = 0
  }
})

watch(
  () => settings.scanEnabled,
  (v) => {
    if (v) {
      showScanToast.value = true
      setTimeout(() => {
        if (scanInput.value) scanInput.value.focus()
      }, 50)
      setTimeout(() => (showScanToast.value = false), 1600)
    } else {
      if (scanInput.value) scanInput.value.blur()
    }
  }
)

watch(grandTotal, (newTotal) => {
  if (isCreditSale.value && amountPaid.value > newTotal) {
    amountPaid.value = newTotal
  }
})

watch(cart, (val) => {
  localStorage.setItem(CART_KEY, JSON.stringify(val))
}, { deep: true })

watch(selectedCartItemId, (val) => {
  if (val == null) localStorage.removeItem(SELECTED_KEY)
  else localStorage.setItem(SELECTED_KEY, String(val))
})

onMounted(() => {
  productsStore.load()
  salesStore.load()
  customersStore.load()
  closingStore.setCurrentStore()
  try { settings.load() } catch {}

  const persistedCart = localStorage.getItem(CART_KEY)
  if (persistedCart) {
    try {
      const parsed: CartItemRaw[] = JSON.parse(persistedCart)
      if (Array.isArray(parsed)) {
        cart.splice(0, cart.length, ...parsed.map((c) => {
          const prod = productsStore.products.find((p) => p.id === c.id)
          const maxStock = prod ? prod.stock : c.stock
          return {
            id: c.id,
            name: c.name,
            price: c.price,
            quantity: Math.max(1, Math.min(c.quantity ?? 1, maxStock ?? 1)),
            stock: maxStock,
            image: c.image,
            discountMode: c.discountMode || 'flat',
            discountValue: c.discountValue ?? 0,
          }
        }))
      }
    } catch {
      // ignore
    }
  }
  const persistedSelected = localStorage.getItem(SELECTED_KEY)
  if (persistedSelected) {
    const n = Number(persistedSelected)
    selectedCartItemId.value = Number.isFinite(n) ? n : null
  }

  const persistedInvoice = localStorage.getItem('lastInvoice')
  if (persistedInvoice) {
    try {
      lastInvoice.value = JSON.parse(persistedInvoice)
    } catch {
      lastInvoice.value = null
    }
  }

  const refundToCart = localStorage.getItem('refundToCart')
  if (refundToCart) {
    try {
      const items: Array<{ productId: number; quantity: number }> = JSON.parse(refundToCart)
      items.forEach(({ productId, quantity }) => {
        const product = productsStore.products.find(p => p.id === productId)
        if (product) {
          const existing = cart.find(c => c.id === productId)
          if (existing) {
            existing.quantity = Math.min(existing.quantity + quantity, product.stock)
          } else {
            cart.push({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: Math.min(quantity, product.stock),
              stock: product.stock,
              image: product.image,
              discountMode: 'flat',
              discountValue: 0,
            })
          }
        }
      })
      localStorage.removeItem('refundToCart')
    } catch {
      // ignore
    }
  }

  const exchangeToCart = localStorage.getItem('exchangeToCart')
  if (exchangeToCart) {
    try {
      const data: { return: Array<{ productId: number; quantity: number }>; exchange: Array<{ productId: number; quantity: number }> } = JSON.parse(exchangeToCart)
      data.return.forEach(({ productId, quantity }) => {
        const product = productsStore.products.find(p => p.id === productId)
        if (product) {
          const existing = cart.find(c => c.id === productId)
          if (existing) {
            existing.quantity = Math.min(existing.quantity + quantity, product.stock)
          } else {
            cart.push({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: Math.min(quantity, product.stock),
              stock: product.stock,
              image: product.image,
              discountMode: 'flat',
              discountValue: 0,
            })
          }
        }
      })
      data.exchange.forEach(({ productId, quantity }) => {
        if (quantity < 0) {
          const existing = cart.find(c => c.id === productId)
          if (existing) {
            existing.quantity = Math.max(0, existing.quantity + quantity)
            if (existing.quantity === 0) {
              const idx = cart.findIndex(c => c.id === productId)
              if (idx !== -1) cart.splice(idx, 1)
            }
          }
        } else {
          const product = productsStore.products.find(p => p.id === productId)
          if (product) {
            const existing = cart.find(c => c.id === productId)
            if (existing) {
              existing.quantity = Math.min(existing.quantity + quantity, product.stock)
            } else {
              cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: Math.min(quantity, product.stock),
                stock: product.stock,
                image: product.image,
                discountMode: 'flat',
                discountValue: 0,
              })
            }
          }
        }
      })
      localStorage.removeItem('exchangeToCart')
    } catch {
      // ignore
    }
  }

  window.addEventListener('keydown', onKeydown)
  // load suspended sales for this store
  loadSuspended()
  // ensure cart drawer / mobile controls are initialised
})

// sidebar/cart toggles for mobile UI
const { cartOpen, toggleCart, closeCart } = useSidebarToggle()

// helper to close cart when navigating away or on checkout
function closeMobileCartIfOpen() {
  if (cartOpen.value) closeCart()
}

onUnmounted(() => {
  // ensure we remove any other listeners (onKeydown removed above)
  if (cartOpen.value) closeCart()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>


<style scoped>
</style>

