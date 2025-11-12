import { defineStore } from 'pinia'

export type StoreInfo = {
  id: string
  name: string
  credentials?: { username: string; password: string }
  owner?: string
}

type StoresData = {
  stores: StoreInfo[]
  currentStoreId?: string
}

const LS_KEY = 'storesData'

export const useStoresStore = defineStore('stores', {
  state: () => ({
    stores: [] as StoreInfo[],
    currentStoreId: '' as string,
  }),
  getters: {
    current(state): StoreInfo | undefined {
      return state.stores.find(s => s.id === state.currentStoreId)
    }
  },
  actions: {
    load() {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        try {
          const parsed: StoresData = JSON.parse(raw)
          this.stores = parsed.stores ?? []
          this.currentStoreId = parsed.currentStoreId || this.stores[0]?.id || ''
        } catch {
          this.seed()
        }
      } else {
        this.seed()
      }
    },
    persist() {
      const data: StoresData = {
        stores: this.stores,
        currentStoreId: this.currentStoreId,
      }
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    },
    seed() {
      // No hardcoded stores - start with empty array
      this.stores = []
      this.currentStoreId = ''
      this.persist()
    },
    addStore(name: string, credentials?: { username: string; password: string }, owner?: string) {
      const id = `store-${Math.random().toString(36).slice(2, 8)}`
      this.stores.push({ id, name, credentials, owner })
      // Don't switch to the new store - let admin stay on their current store
      // Only set currentStoreId if there's no current store
      if (!this.currentStoreId) {
        this.currentStoreId = id
      }
      this.persist()
      return id
    },
    setCurrentStore(id: string) {
      this.currentStoreId = id
      this.persist()
    },
    deleteStore(id: string) {
      const idx = this.stores.findIndex(s => s.id === id)
      if (idx === -1) return
      // remove store
      const [removed] = this.stores.splice(idx, 1)
      // remove associated data
      try {
        localStorage.removeItem(`products_${removed.id}`)
        localStorage.removeItem(`sales_${removed.id}`)
      } catch { /* ignore */ }
      // select another store
      if (this.currentStoreId === removed.id) {
        this.currentStoreId = this.stores[0]?.id || ''
      }
      this.persist()
      return removed
    }
  }
})

