<script setup lang="ts">
const model = defineModel<'cash' | 'card' | 'mobile'>({ required: true })
</script>

<template>
  <div class="space-y-2">
    <div class="text-sm font-medium text-gray-700">Payment Type</div>
    <div class="flex gap-2">
      <button
        :class="model === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'cash'"
      >Cash</button>
      <button
        :class="model === 'card' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'card'"
      >Card</button>
      <button
        :class="model === 'mobile' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'mobile'"
      >Mobile</button>
    </div>
  </div>
</template>

<style scoped>
</style>

