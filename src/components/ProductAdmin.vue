<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useProductsStore, type Product } from '@/store/products'
import BarcodeDisplay from '@/components/BarcodeDisplay.vue'

const store = useProductsStore()
const query = ref('')

const form = reactive<Omit<Product, 'id'>>({
  name: '',
  price: 0,
  image: 'https://via.placeholder.com/100',
  barcode: '',
  stock: 0,
})
const editingId = ref<number | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.products
  return store.products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
})

function resetForm() {
  form.name = ''
  form.price = 0
  form.image = 'https://via.placeholder.com/100'
  form.barcode = ''
  ;(form as any).stock = 0
  editingId.value = null
}

function save() {
  if (!form.name || form.price < 0 || (form as any).stock < 0) return
  if (editingId.value == null) {
    const barcode = form.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000))
    store.add({ name: form.name, price: form.price, image: form.image, barcode, stock: Number((form as any).stock ?? 0) })
  } else {
    store.update(editingId.value, { name: form.name, price: form.price, image: form.image, barcode: form.barcode, stock: Number((form as any).stock ?? 0) })
  }
  resetForm()
}

function edit(p: Product) {
  editingId.value = p.id
  form.name = p.name
  form.price = p.price
  form.image = p.image
  form.barcode = p.barcode
  ;(form as any).stock = p.stock
}

function remove(id: number) {
  store.remove(id)
  if (editingId.value === id) resetForm()
}

function generateBarcode() {
  form.barcode = String(100000000000 + Math.floor(Math.random() * 900000000000))
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">{{ editingId == null ? 'Add Product' : 'Edit Product' }}</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-gray-700">Name</label>
          <input v-model="form.name" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Price</label>
          <input v-model.number="form.price" type="number" min="0" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Image URL</label>
          <input v-model="form.image" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Quantity</label>
          <input v-model.number="(form as any).stock" type="number" min="0" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm text-gray-700">Barcode</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model="form.barcode" type="text" placeholder="Auto or custom" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            <button @click="generateBarcode" class="rounded-md border border-gray-300 px-3 py-2 text-sm">Generate</button>
          </div>
          <div v-if="form.barcode" class="mt-3">
            <BarcodeDisplay :value="form.barcode" />
          </div>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button @click="save" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          {{ editingId == null ? 'Add Product' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="rounded-md border border-gray-300 px-4 py-2 text-sm">Clear</button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Products</h2>
        <input v-model="query" type="text" placeholder="Search by name or barcode" class="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="p in filtered" :key="p.id" class="rounded-lg border border-gray-100 p-3 shadow-sm">
          <img :src="p.image" :alt="p.name" class="h-24 w-full rounded object-cover" />
          <div class="mt-2">
            <div class="text-sm font-medium text-gray-900">{{ p.name }}</div>
            <div class="text-xs text-gray-600">₹{{ p.price }} • Quantity: {{ p.stock }}</div>
            <div class="mt-2">
              <BarcodeDisplay :value="p.barcode" />
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button @click="edit(p)" class="rounded-md border border-gray-300 px-3 py-1 text-xs">Edit</button>
            <button @click="remove(p.id)" class="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

