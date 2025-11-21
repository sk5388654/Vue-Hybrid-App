import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Extend the DOM event with the prompt() and userChoice properties
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

export function useInstallPrompt() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstallable = ref(false)
  const isInstalled = ref(false)

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  // Very small, pragmatic platform checks
  const isAndroid = /Android/i.test(userAgent)
  const isChrome = /Chrome/i.test(userAgent) && !/Edg|OPR|SamsungBrowser/i.test(userAgent)
  const isAndroidChrome = computed(() => isAndroid && isChrome)

  // iOS Safari detection (hide install button)
  const isIosSafari = computed(() => /iPhone|iPad|iPod/i.test(userAgent) && /Safari/i.test(userAgent) && !/CriOS|FxiOS/i.test(userAgent))

  function handleBeforeInstallPrompt(e: Event) {
    const ev = e as BeforeInstallPromptEvent
    // Only care about Android Chrome
    if (!isAndroidChrome.value) return

    // Prevent the browser from showing the mini-infobar
    try {
      ev.preventDefault?.()
    } catch {}

    deferredPrompt.value = ev
    isInstallable.value = true
  }

  function handleAppInstalled() {
    isInstalled.value = true
    isInstallable.value = false
    deferredPrompt.value = null
    console.log('PWA was installed')
  }

  // Check if already installed (standalone display-mode or navigator.standalone for iOS)
  function checkInstalledState() {
    try {
      const displayStandalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      const iosStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true
      if (displayStandalone || iosStandalone) {
        isInstalled.value = true
        isInstallable.value = false
        deferredPrompt.value = null
      }
    } catch {}
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return null
    const promptEvent = deferredPrompt.value
    try {
      await promptEvent.prompt()
    } catch (err) {
      // Some browsers may throw if prompt is not allowed
      console.warn('prompt() failed', err)
    }

    let result: { outcome: 'accepted' | 'dismissed' } | null = null
    try {
      const choice = await promptEvent.userChoice
      result = { outcome: choice.outcome }
      console.log('PWA install choice:', choice.outcome)
    } catch (err) {
      console.warn('userChoice not available', err)
    }

    // Hide the custom button after prompting
    isInstallable.value = false
    deferredPrompt.value = null

    return result
  }

  onMounted(() => {
    checkInstalledState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    // reactive state
    isInstallable,
    isInstalled,
    // platform helpers
    isAndroidChrome,
    isIosSafari,
    // action
    promptInstall,
  }
}

export type UseInstallPrompt = ReturnType<typeof useInstallPrompt>
