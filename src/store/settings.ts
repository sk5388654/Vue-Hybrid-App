import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    scanEnabled: false as boolean,
  }),
  actions: {
    load() {
      try {
        const raw = localStorage.getItem('app_settings')
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (typeof parsed.scanEnabled === 'boolean') this.scanEnabled = parsed.scanEnabled
      } catch {}
    },
    persist() {
      try {
        localStorage.setItem('app_settings', JSON.stringify({ scanEnabled: this.scanEnabled }))
      } catch {}
    },
    setScan(enabled: boolean) {
      this.scanEnabled = !!enabled
      this.persist()
    }
  }
})
