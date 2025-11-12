import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type Product = {
  id: number
  name: string
  price: number
  image: string
  barcode: string
  stock: number
}

export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [] as Product[],
    lowStockThreshold: 3,
    nextId: 5,
  }),
  getters: {
    inStock(state): Product[] {
      return state.products.filter(p => p.stock > 0)
    },
    byBarcode: (state) => {
      const map = new Map<string, Product>()
      state.products.forEach(p => map.set(p.barcode, p))
      return map
    }
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      if (!storesStore.stores.length) storesStore.load()
      const sid = storesStore.currentStoreId
      if (!sid) {
        // No store selected, start with empty products
        this.products = []
        this.nextId = 1
        return
      }
      const key = `products_${sid}`
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          const curSid = storesStore.currentStoreId
          // migrate products to single stock per store
          this.products = (parsed.products ?? []).map((p: any) => {
            // if older schema had stockByStore, convert to single stock using current store stock
            if (p && typeof p === 'object' && p.stockByStore) {
              const stock = Number(p.stockByStore[curSid] ?? 0)
              const { stockByStore, ...rest } = p
              return { ...rest, stock }
            }
            // if stock present, keep; else default 0
            return { ...p, stock: Number(p.stock ?? 0) }
          })
          this.lowStockThreshold = parsed.lowStockThreshold ?? 3
          this.nextId = parsed.nextId ?? (this.products.reduce((m: number, p: Product) => Math.max(m, p.id), 0) + 1)
        } catch {
          // If parsing fails, start with empty products for new stores
          this.products = []
          this.nextId = 1
          this.persist()
        }
      } else {
        // New store - start with empty products, no seed data
        this.products = []
        this.nextId = 1
        this.persist()
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return // Don't persist if no store is selected
      const key = `products_${sid}`
      localStorage.setItem(key, JSON.stringify({
        products: this.products,
        currentStoreId: sid,
        lowStockThreshold: this.lowStockThreshold,
        nextId: this.nextId,
      }))
    },
    // Removed seed() - new stores should start with empty products
    add(product: Omit<Product, 'id'>) {
      const p: Product = { ...product, id: this.nextId++ }
      this.products.push(p)
      this.persist()
      return p
    },
    update(id: number, patch: Partial<Omit<Product, 'id'>>) {
      const idx = this.products.findIndex(p => p.id === id)
      if (idx === -1) return
      this.products[idx] = { ...this.products[idx], ...patch }
      this.persist()
    },
    remove(id: number) {
      this.products = this.products.filter(p => p.id !== id)
      this.persist()
    },
    decrementStock(items: { id: number; quantity: number }[]) {
      items.forEach(({ id, quantity }) => {
        const p = this.products.find(pp => pp.id === id)
        if (p) {
          p.stock = Math.max(0, (p.stock ?? 0) - quantity)
        }
      })
      this.persist()
    },
    setThreshold(n: number) {
      this.lowStockThreshold = n
      this.persist()
    },
    setCurrentStore(id: string) {
      // when store changes, reload products for that store
      this.load()
    }
  }
})

