<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useProductsStore, type Product } from '@/store/products'
import { useSalesStore, type DiscountMode } from '@/store/sales'
import { useCustomersStore } from '@/store/customers'
import { useClosingVoucherStore } from '@/store/closingVouchers'
import ProductList from '@/components/ProductList.vue'
import Cart from '@/components/Cart.vue'
import ReceiptModal from '@/components/ReceiptModal.vue'
import InvoiceModal from '@/components/InvoiceModal.vue'
import PaymentSelect from '@/components/PaymentSelect.vue'

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

const cart = reactive<CartItemRaw[]>([])
const selectedCartItemId = ref<number | null>(null)
const barcodeInput = ref('')
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
  isModalOpen.value = true
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

function onScanBarcode() {
  const code = barcodeInput.value.trim()
  if (!code) return
  const prod = productsStore.byBarcode.get(code)
  if (prod) {
    addToCart(prod)
    barcodeInput.value = ''
  }
}

function onKeydown(e: KeyboardEvent) {
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

  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <section class="lg:col-span-2">
      <div class="mb-3 flex items-center gap-2">
        <input
          v-model="barcodeInput"
          @keydown.enter.prevent="onScanBarcode"
          type="text"
          placeholder="Scan or enter barcode"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <button @click="onScanBarcode" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Add</button>
      </div>
      <ProductList :products="productsStore.products" :disabled="!isShiftOpen" @add="addToCart" />
    </section>

    <aside class="lg:col-span-1">
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
        @update-item-discount="updateItemDiscount"
        @updateInvoiceDiscountMode="updateInvoiceDiscountMode"
        @updateInvoiceDiscountValue="updateInvoiceDiscountValue"
      />
      <div class="mt-4 space-y-3">
        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <label class="mb-2 block text-sm font-medium text-gray-700">Customer (Optional)</label>
          <select
            v-model="selectedCustomerId"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option :value="null">Walk-in Customer</option>
            <option v-for="customer in customers" :key="customer.id" :value="customer.id">
              {{ customer.fullName }} ({{ customer.phone }})
            </option>
          </select>
          <div v-if="selectedCustomerId" class="mt-2 text-xs text-gray-600">
            <div>Total Purchases: ₹{{ customers.find(c => c.id === selectedCustomerId)?.totalPurchases.toFixed(2) || '0.00' }}</div>
            <div :class="customers.find(c => c.id === selectedCustomerId)?.totalDue ? 'text-red-600' : 'text-green-600'">
              Current Due: ₹{{ customers.find(c => c.id === selectedCustomerId)?.totalDue.toFixed(2) || '0.00' }}
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <PaymentSelect v-model="paymentType" />
        </div>

        <div v-if="selectedCustomerId" class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div class="mb-2 flex items-center gap-2">
            <input
              v-model="isCreditSale"
              type="checkbox"
              id="creditSale"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label for="creditSale" class="text-sm font-medium text-gray-700">Credit Sale</label>
          </div>
          <div v-if="isCreditSale" class="mt-2">
            <label class="block text-sm text-gray-700">Amount Paid</label>
            <input
              v-model.number="amountPaid"
              type="number"
              min="0"
              :max="grandTotal"
              step="0.01"
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div class="mt-1 text-xs text-gray-600">
              <div>Grand Total: ₹{{ grandTotal.toFixed(2) }}</div>
              <div class="text-red-600">Due: ₹{{ dueAmount.toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>

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
</template>

<style scoped>
</style>

