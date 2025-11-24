<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSettingsStore } from '@/store/settings'

const settings = useSettingsStore()
onMounted(() => settings.load())

const scanEnabled = computed({
  get: () => settings.scanEnabled,
  set: (v: boolean) => settings.setScan(v),
})

// Theme (moved from Sidebar)
const isDarkMode = ref(false)
function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark', isDarkMode.value)
  if (isDarkMode.value) localStorage.setItem('theme', 'dark')
  else localStorage.removeItem('theme')
}
onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark')
  }
})

// Scan toggle message
const message = ref('')
let msgTimer: number | undefined
watch(
  () => settings.scanEnabled,
  (v) => {
    message.value = v ? 'Scan Mode enabled' : 'Scan Mode disabled'
    if (msgTimer) window.clearTimeout(msgTimer)
    msgTimer = window.setTimeout(() => (message.value = ''), 1800)
  },
  { immediate: false }
)
</script>

<template>
  <div class="max-w-4xl mx-auto p-4">
    <h1 class="text-2xl font-semibold mb-4">Settings</h1>

    <section class="rounded-lg border p-4 dark-panel space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div class="text-sm font-medium">Scan Mode</div>
          <div class="text-xs text-slate-400">Accept barcode input automatically while on POS.</div>
        </div>
        <div class="mt-2 sm:mt-0">
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" class="h-4 w-4 rounded border-slate-700 text-indigo-500" v-model="scanEnabled" />
            <span class="text-sm">{{ scanEnabled ? 'Disable Scan Mode' : 'Enable Scan Mode' }}</span>
          </label>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium">Theme</div>
          <div class="text-xs text-slate-400">Toggle light / dark appearance for the app.</div>
        </div>
        <div>
          <button
            class="inline-flex items-center gap-2 rounded-md border border-transparent dark-panel px-3 py-1 text-sm"
            @click="toggleTheme"
            :title="isDarkMode ? 'Switch to light' : 'Switch to dark'"
          >
            <svg class="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="text-sm">{{ isDarkMode ? 'Dark' : 'Light' }}</span>
          </button>
        </div>
      </div>

      <div v-if="message" class="mt-2 inline-block rounded px-3 py-1 text-sm font-medium text-white" :class="message.includes('enabled') ? 'bg-green-600' : 'bg-gray-600'">{{ message }}</div>
    </section>
  </div>
</template>

<style scoped>
</style>
