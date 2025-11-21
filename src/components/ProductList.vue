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
      <!-- Responsive columns: mobile 1, sm 2, md 3, lg 4 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        <div
          v-for="p in filtered"
          :key="p.id"
          class="group flex flex-col rounded-lg p-3 dark-panel transition hover:shadow-md max-w-full"
        >
          <img
            :src="p.image"
            :alt="p.name"
            class="w-full aspect-[3/2] rounded-md object-cover"
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
            class="mt-3 rounded-md bg-indigo-600 px-3 py-3 sm:py-2 text-sm font-medium text-slate-100 disabled:bg-gray-700 disabled:cursor-not-allowed w-full sm:w-auto"
            style="min-height:44px"
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
