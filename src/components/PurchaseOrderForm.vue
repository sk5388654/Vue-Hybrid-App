<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useSuppliersStore, type PurchaseOrder } from '@/store/suppliers'
import { useProductsStore } from '@/store/products'

const props = defineProps<{
  supplierId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const suppliersStore = useSuppliersStore()
const productsStore = useProductsStore()

const items = reactive<Array<{
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
}>>([])

const selectedProductId = ref<number | null>(null)
const quantity = ref(1)
const unitPrice = ref(0)
const dueDate = ref(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

const totalAmount = computed(() => items.reduce((sum, item) => sum + item.total, 0))

function addItem() {
  if (!selectedProductId.value || quantity.value <= 0 || unitPrice.value <= 0) return
  const product = productsStore.products.find(p => p.id === selectedProductId.value!)
  if (!product) return

  items.push({
    productId: product.id,
    productName: product.name,
    quantity: quantity.value,
    unitPrice: unitPrice.value,
    total: quantity.value * unitPrice.value,
  })

  selectedProductId.value = null
  quantity.value = 1
  unitPrice.value = 0
}

function removeItem(index: number) {
  items.splice(index, 1)
}

function save() {
  if (items.length === 0) {
    alert('Please add at least one item')
    return
  }

  suppliersStore.createPO({
    supplierId: props.supplierId,
    items: [...items],
    totalAmount: totalAmount.value,
    status: 'Pending',
    dueDate: dueDate.value,
  })

  items.splice(0, items.length)
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-sm text-gray-700">Product</label>
        <select
          v-model="selectedProductId"
          class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option :value="null">Select Product</option>
          <option v-for="p in productsStore.products" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-700">Quantity</label>
        <input
          v-model.number="quantity"
          type="number"
          min="1"
          class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm text-gray-700">Unit Price</label>
        <input
          v-model.number="unitPrice"
          type="number"
          min="0"
          step="0.01"
          class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
    <button
      @click="addItem"
      class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      Add Item
    </button>

    <div v-if="items.length > 0" class="rounded-lg border border-gray-200 p-4">
      <h4 class="mb-2 font-medium">Items</h4>
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-2 py-1 text-left text-xs">Product</th>
            <th class="px-2 py-1 text-right text-xs">Qty</th>
            <th class="px-2 py-1 text-right text-xs">Price</th>
            <th class="px-2 py-1 text-right text-xs">Total</th>
            <th class="px-2 py-1 text-center text-xs">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="(item, idx) in items" :key="idx">
            <td class="px-2 py-1">{{ item.productName }}</td>
            <td class="px-2 py-1 text-right">{{ item.quantity }}</td>
            <td class="px-2 py-1 text-right">₹{{ item.unitPrice.toFixed(2) }}</td>
            <td class="px-2 py-1 text-right">₹{{ item.total.toFixed(2) }}</td>
            <td class="px-2 py-1 text-center">
              <button @click="removeItem(idx)" class="text-red-600 hover:text-red-800">Remove</button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t">
            <td colspan="3" class="px-2 py-1 text-right font-semibold">Total:</td>
            <td class="px-2 py-1 text-right font-semibold">₹{{ totalAmount.toFixed(2) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div>
      <label class="block text-sm text-gray-700">Due Date</label>
      <input
        v-model="dueDate"
        type="date"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <div class="flex justify-end gap-2">
      <button
        @click="emit('close')"
        class="rounded-md border border-gray-300 px-4 py-2 text-sm"
      >
        Cancel
      </button>
      <button
        @click="save"
        class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Create PO
      </button>
    </div>
  </div>
</template>

