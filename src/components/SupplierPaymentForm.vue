<script setup lang="ts">
import { ref } from 'vue'
import { useSuppliersStore } from '@/store/suppliers'

const props = defineProps<{
  supplierId: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const suppliersStore = useSuppliersStore()

const amount = ref(0)
const paymentDate = ref(new Date().toISOString().split('T')[0])
const notes = ref('')

function save() {
  if (amount.value <= 0) {
    alert('Please enter a valid amount')
    return
  }

  suppliersStore.recordPayment({
    supplierId: props.supplierId,
    amount: amount.value,
    paymentDate: paymentDate.value,
    notes: notes.value || undefined,
  })

  amount.value = 0
  paymentDate.value = new Date().toISOString().split('T')[0]
  notes.value = ''
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm text-gray-700">Amount <span class="text-red-500">*</span></label>
      <input
        v-model.number="amount"
        type="number"
        min="0.01"
        step="0.01"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
    <div>
      <label class="block text-sm text-gray-700">Payment Date</label>
      <input
        v-model="paymentDate"
        type="date"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
    <div>
      <label class="block text-sm text-gray-700">Notes</label>
      <textarea
        v-model="notes"
        rows="2"
        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      ></textarea>
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
        Record Payment
      </button>
    </div>
  </div>
</template>

