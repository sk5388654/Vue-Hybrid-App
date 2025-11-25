<template>
  <div v-if="showInstallButton" class="fixed bottom-4 right-4 z-50">
    <button
      @click="installApp"
      class="px-4 py-2 rounded shadow bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
    >
      Install App
    </button>
    <div v-if="isIOS" class="mt-2 text-xs text-gray-700 bg-white p-2 rounded shadow">
      <span>
        To install on iOS: Tap <span class="font-bold">Share</span> <svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h8a2 2 0 002-2v-2M8 12l4-4m0 0l4 4m-4-4v12" /></svg> then <span class="font-bold">Add to Home Screen</span>.
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const deferredPrompt = ref<Event | null>(null)
const showInstallButton = ref(false)
const isIOS = ref(false)

onMounted(() => {
  // Detect iOS
  const userAgent = window.navigator.userAgent.toLowerCase()
  isIOS.value = /iphone|ipad|ipod/.test(userAgent)

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallButton.value = true
  })

  window.addEventListener('appinstalled', () => {
    showInstallButton.value = false
    deferredPrompt.value = null
  })
})

function installApp() {
  if (deferredPrompt.value) {
    // @ts-ignore
    deferredPrompt.value.prompt()
    // @ts-ignore
    deferredPrompt.value.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        showInstallButton.value = false
        deferredPrompt.value = null
      }
    })
  }
}
</script>

<style scoped>
/* Minimal floating button style */
</style>
