<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from '@/store/products'

const props = defineProps<{
  products: Product[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', product: Product): void
}>()

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.products
  return props.products.filter((p) => p.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div class="mb-4 flex items-center">
      <input
        v-model="query"
        type="text"
        placeholder="Search products..."
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="p in filtered"
        :key="p.id"
        class="group flex flex-col rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition hover:shadow-md"
      >
        <img :src="p.image" :alt="p.name" class="h-24 w-full rounded-md object-cover" />
        <div class="mt-2 flex-1">
          <div class="text-sm font-medium text-gray-900">{{ p.name }}</div>
          <div class="mt-1 text-sm text-gray-600">₹{{ p.price }}</div>
          <div class="mt-1 text-xs" :class="p.stock > 0 ? 'text-gray-500' : 'text-red-600 font-medium'">
            {{ p.stock > 0 ? 'Stock: ' + p.stock : 'Out of Stock' }}
          </div>
        </div>
        <button
          :disabled="p.stock === 0 || props.disabled"
          @click="emit('add', p)"
          class="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Add to Cart
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

