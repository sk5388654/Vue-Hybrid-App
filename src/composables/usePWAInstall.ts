import { ref, onMounted, onBeforeUnmount } from 'vue'

const deferredPrompt = ref<any>(null)
const isInstallable = ref(false)

export function usePWAInstall() {
  function onBeforeInstallPrompt(e: Event) {
    // Save the event and prevent Chrome from showing the mini-infobar
    e.preventDefault()
    deferredPrompt.value = e
    isInstallable.value = true
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
  })

  async function promptInstall() {
    if (!deferredPrompt.value) return false
    try {
      // @ts-ignore
      await deferredPrompt.value.prompt()
      // Wait for the user response
      // @ts-ignore
      const choiceResult = await deferredPrompt.value.userChoice
      // Clear the saved prompt since it can only be used once
      deferredPrompt.value = null
      isInstallable.value = false
      return choiceResult
    } catch (err) {
      return false
    }
  }

  return {
    isInstallable,
    promptInstall
  }
}
