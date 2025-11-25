<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const username = ref('')
const password = ref('')
const error = ref<string | null>(null)
const auth = useAuthStore()
const router = useRouter()

function submit() {
  error.value = null
  const ok = auth.login(username.value.trim(), password.value)
  if (ok) {
    router.push('/pos')
  } else {
    error.value = 'Invalid credentials'
  }
}

function handleKeypress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    submit()
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 class="mb-4 text-lg font-semibold text-gray-900">Sign in</h1>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-700">Username <span class="text-red-600">*</span></label>
          <input v-model="username" type="text" @keyup="handleKeypress" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-sm text-gray-700">Password <span class="text-red-600">*</span></label>
          <input v-model="password" type="password" @keyup="handleKeypress" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
        <button @click="submit" class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Sign in</button>
        <div class="text-xs text-gray-500">Default: admin / admin1</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

