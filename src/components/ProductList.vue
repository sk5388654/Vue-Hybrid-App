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
  <div class="rounded-lg p-4 flex flex-col h-full dark-panel">

    <!-- Search -->
    <div class="mb-4 flex items-center sticky top-0 z-10 dark-panel">
      <input
        v-model="query"
        type="text"
        placeholder="Search products..."
        class="w-full input-field"
      />
    </div>

    <!-- Product Grid -->
    <div class="flex-1 overflow-y-auto pr-2">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">

        <div
          v-for="p in filtered"
          :key="p.id"
          class="group flex flex-col rounded-lg p-3 dark-panel transition hover:shadow-md"
        >
          <img
            :src="p.image"
            :alt="p.name"
            class="h-28 w-full rounded-md object-cover"
          />

          <div class="mt-2 flex-1">
            <div class="text-sm font-medium text-slate-100">{{ p.name }}</div>
            <div class="mt-1 text-sm text-slate-300">₹{{ p.price }}</div>
            <div
              class="mt-1 text-xs"
              :class="p.stock > 0 ? 'text-slate-400' : 'text-red-500 font-medium'"
            >
              {{ p.stock > 0 ? 'Stock: ' + p.stock : 'Out of Stock' }}
            </div>
          </div>

          <button
            :disabled="p.stock === 0 || props.disabled"
            @click="emit('add', p)"
            class="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-slate-100 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>

        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
