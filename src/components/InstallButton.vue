<template>
  <button
    v-if="isInstallable && isAndroidChrome && !isInstalled && !isIosSafari"
    class="pwa-install-btn"
    @click="handleInstall"
    aria-label="Install App"
  >
    Install App
  </button>
</template>

<script setup lang="ts">
import { useInstallPrompt } from '../composables/useInstallPrompt'

const { isInstallable, isInstalled, isAndroidChrome, isIosSafari, promptInstall } = useInstallPrompt()

async function handleInstall() {
  const result = await promptInstall()
  if (result) {
    // Already logged inside composable, but log again here for visibility
    console.log('User response to install:', result.outcome)
  } else {
    console.log('Install prompt not available')
  }
}
</script>

<style scoped>
.pwa-install-btn {
  position: fixed;
  right: 1rem;
  bottom: 1.5rem;
  background-color: #0b74ff;
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 9999px;
  box-shadow: 0 6px 18px rgba(11,116,255,0.18);
  border: none;
  font-weight: 600;
  z-index: 1000;
  cursor: pointer;
}

.pwa-install-btn:active {
  transform: translateY(1px);
}
</style>
