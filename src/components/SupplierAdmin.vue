<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useSuppliersStore, type Supplier, type PaymentTerms } from '@/store/suppliers'
import { useProductsStore } from '@/store/products'
import PurchaseOrderForm from './PurchaseOrderForm.vue'
import SupplierPaymentForm from './SupplierPaymentForm.vue'

const suppliersStore = useSuppliersStore()
const productsStore = useProductsStore()

const categories: PaymentTerms[] = ['Net 15', 'Net 30', 'Net 45', 'Cash on Delivery', 'Prepaid']

const form = reactive<Omit<Supplier, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>({
  supplierName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  paymentTerms: 'Net 30',
  preferred: false,
})

const editingId = ref<string | null>(null)
const query = ref('')
const showPOForm = ref(false)
const showPaymentForm = ref(false)
const selectedSupplierId = ref<string | null>(null)
const errorMessage = ref('')

const filtered = computed(() => {
  let result = suppliersStore.suppliersForCurrentStore
  const q = query.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      s =>
        s.supplierName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.email.toLowerCase().includes(q)
    )
  }
  return result.sort((a, b) => a.supplierName.localeCompare(b.supplierName))
})

function resetForm() {
  form.supplierName = ''
  form.contactPerson = ''
  form.phone = ''
  form.email = ''
  form.address = ''
  form.paymentTerms = 'Net 30'
  form.preferred = false
  editingId.value = null
  errorMessage.value = ''
}

function save() {
  if (!form.supplierName.trim() || !form.contactPerson.trim() || !form.phone.trim() || !form.email.trim()) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  try {
    if (editingId.value == null) {
      suppliersStore.addSupplier({
        supplierName: form.supplierName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address?.trim() || undefined,
        paymentTerms: form.paymentTerms,
        preferred: form.preferred,
      })
    } else {
      suppliersStore.updateSupplier(editingId.value, {
        supplierName: form.supplierName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address?.trim() || undefined,
        paymentTerms: form.paymentTerms,
        preferred: form.preferred,
      })
    }
    resetForm()
    errorMessage.value = ''
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save supplier'
  }
}

function edit(supplier: Supplier) {
  editingId.value = supplier.id
  form.supplierName = supplier.supplierName
  form.contactPerson = supplier.contactPerson
  form.phone = supplier.phone
  form.email = supplier.email
  form.address = supplier.address || ''
  form.paymentTerms = supplier.paymentTerms
  form.preferred = supplier.preferred
  errorMessage.value = ''
}

function remove(id: string) {
  if (confirm('Delete this supplier?')) {
    suppliersStore.removeSupplier(id)
    if (editingId.value === id) resetForm()
  }
}

function openPOForm(supplierId: string) {
  selectedSupplierId.value = supplierId
  showPOForm.value = true
}

function openPaymentForm(supplierId: string) {
  selectedSupplierId.value = supplierId
  showPaymentForm.value = true
}

onMounted(() => {
  suppliersStore.load()
  productsStore.load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-gray-800">
        {{ editingId == null ? 'Add Supplier' : 'Edit Supplier' }}
      </h2>
      <div v-if="errorMessage" class="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-gray-700">Supplier Name <span class="text-red-500">*</span></label>
          <input
            v-model="form.supplierName"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Contact Person <span class="text-red-500">*</span></label>
          <input
            v-model="form.contactPerson"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Phone <span class="text-red-500">*</span></label>
          <input
            v-model="form.phone"
            type="tel"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Email <span class="text-red-500">*</span></label>
          <input
            v-model="form.email"
            type="email"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Address</label>
          <input
            v-model="form.address"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Payment Terms</label>
          <select
            v-model="form.paymentTerms"
            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option v-for="term in categories" :key="term" :value="term">{{ term }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="form.preferred"
            type="checkbox"
            id="preferred"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label for="preferred" class="text-sm text-gray-700">Preferred Supplier</label>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button
          @click="save"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {{ editingId == null ? 'Add Supplier' : 'Save Changes' }}
        </button>
        <button @click="resetForm" class="rounded-md border border-gray-300 px-4 py-2 text-sm">Clear</button>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Suppliers ({{ filtered.length }})</h2>
        <input
          v-model="query"
          type="text"
          placeholder="Search suppliers..."
          class="w-64 rounded-md border border-gray-300 px-3 py-1 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Contact</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Phone</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Email</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Payment Terms</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="filtered.length === 0" class="text-center text-gray-500">
              <td colspan="6" class="px-4 py-8">No suppliers found</td>
            </tr>
            <tr v-for="supplier in filtered" :key="supplier.id" class="hover:bg-gray-50">
              <td class="px-4 py-2">
                <div class="font-medium text-gray-900">{{ supplier.supplierName }}</div>
                <div v-if="supplier.preferred" class="text-xs text-indigo-600">⭐ Preferred</div>
              </td>
              <td class="px-4 py-2 text-gray-700">{{ supplier.contactPerson }}</td>
              <td class="px-4 py-2 text-gray-700">{{ supplier.phone }}</td>
              <td class="px-4 py-2 text-gray-600">{{ supplier.email }}</td>
              <td class="px-4 py-2 text-gray-600">{{ supplier.paymentTerms }}</td>
              <td class="px-4 py-2">
                <div class="flex justify-center gap-1">
                  <button
                    @click="edit(supplier)"
                    class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    @click="openPOForm(supplier.id)"
                    class="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    PO
                  </button>
                  <button
                    @click="openPaymentForm(supplier.id)"
                    class="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                  >
                    Pay
                  </button>
                  <button
                    @click="remove(supplier.id)"
                    class="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Purchase Order Modal -->
    <div v-if="showPOForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Create Purchase Order</h3>
        <PurchaseOrderForm
          :supplier-id="selectedSupplierId!"
          @close="showPOForm = false; selectedSupplierId = null"
          @saved="suppliersStore.load()"
        />
      </div>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPaymentForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold">Record Payment</h3>
        <SupplierPaymentForm
          :supplier-id="selectedSupplierId!"
          @close="showPaymentForm = false; selectedSupplierId = null"
          @saved="suppliersStore.load()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

