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

const errorMessage = ref('')
const editingId = ref<number | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.products
  return store.products.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.barcode.includes(q)
  )
})

function resetForm() {
  form.name = ''
  form.price = 0
  form.image = 'https://via.placeholder.com/100'
  form.barcode = ''
  ;(form as any).stock = 0
  editingId.value = null
  errorMessage.value = ''
}

function save() {
  errorMessage.value = ''

  const nameOk = !!form.name.trim()
  const priceOk = form.price > 0
  const stockVal = Number((form as any).stock ?? 0)
  const stockOk = stockVal >= 0

  if (!nameOk || !priceOk || !stockOk) {
    errorMessage.value = 'Please fill in required fields: Name, Price (>0), Quantity (>=0)'
    return
  }

  if (editingId.value == null) {
    const barcode = form.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000))
    store.add({
      name: form.name.trim(),
      price: form.price,
      image: form.image,
      barcode,
      stock: stockVal,
    })
  } else {
    store.update(editingId.value, {
      name: form.name.trim(),
      price: form.price,
      image: form.image,
      barcode: form.barcode,
      stock: stockVal,
    })
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

    <!-- Add / Edit Product Form -->
    <div class="glass-panel space-y-4">

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="subtle-label">Products</div>
          <h2 class="section-heading">
            {{ editingId == null ? 'Add Product test' : 'Edit Product' }}
          </h2>
        </div>

        <div class="flex gap-2">
          <button v-if="editingId != null" class="btn-ghost" @click="resetForm">
            Cancel edit
          </button>
          <button class="btn-primary text-white" @click="save">
            {{ editingId == null ? 'Add Product' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="rounded-2xl border border-red-300 bg-red-500/20 px-4 py-2 text-sm text-red-200"
      >
        {{ errorMessage }}
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <div>
          <label class="subtle-label">Name *</label>
          <input v-model="form.name" type="text" class="input-field" />
        </div>

        <div>
          <label class="subtle-label">Price *</label>
          <input v-model.number="form.price" type="number" min="0" class="input-field" />
        </div>

        <div>
          <label class="subtle-label">Image URL</label>
          <input v-model="form.image" type="text" class="input-field" />
        </div>

        <div>
          <label class="subtle-label">Quantity *</label>
          <input
            v-model.number="(form as any).stock"
            type="number"
            min="0"
            class="input-field"
          />
        </div>

        <!-- Barcode -->
        <div class="sm:col-span-2">
          <label class="subtle-label">Barcode</label>

          <div class="barcode-field">
            <input
              v-model="form.barcode"
              type="text"
              class="flex-1"
              placeholder="Auto or custom"
            />
            <button @click="generateBarcode" class="btn-ghost text-xs">Generate</button>
          </div>

          <div v-if="form.barcode" class="mt-3 barcode-wrapper p-3 rounded-xl">
            <BarcodeDisplay :value="form.barcode" />
          </div>
        </div>

      </div>
    </div>

    <!-- Product Inventory List -->
    <div class="glass-panel">
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <div class="subtle-label">Inventory</div>
          <h2 class="section-heading">Products</h2>
        </div>

        <input
          v-model="query"
          type="search"
          class="input-field max-w-xs"
          placeholder="Search by name or barcode"
        />
      </div>

      <div
        class="max-h-[600px] overflow-y-auto rounded-2xl border border-slate-700 dark:border-slate-800"
      >
        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">

          <div
            v-for="p in filtered"
            :key="p.id"
            class="rounded-2xl border border-slate-700 dark-panel p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
          >
            <img
              :src="p.image"
              :alt="p.name"
              class="h-24 w-full rounded-xl object-cover"
            />

            <div class="mt-3">

              <div class="flex items-start justify-between">
                <div>
                  <div class="text-sm font-semibold text-slate-100">{{ p.name }}</div>
                  <div class="text-xs text-slate-400">SKU {{ p.barcode }}</div>
                </div>

                <span
                  class="pill-badge border rounded-xl px-2 py-1 text-xs"
                  :class="p.stock > 0 ?
                    'text-green-500 border-green-600' :
                    'text-red-500 border-red-600'"
                >
                  {{ p.stock > 0 ? p.stock + ' qty' : 'Out' }}
                </span>
              </div>

              <div class="mt-3 text-lg font-bold text-slate-100">
                ₹{{ p.price }}
              </div>

              <div class="mt-3 barcode-wrapper p-2 rounded-xl">
                <BarcodeDisplay :value="p.barcode" />
              </div>

            </div>

            <div class="mt-4 flex gap-2">
              <button @click="edit(p)" class="btn-ghost flex-1 text-xs">Edit</button>
              <button @click="remove(p.id)" class="btn-danger flex-1 text-xs">Delete</button>
            </div>

          </div>

        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
</style>
