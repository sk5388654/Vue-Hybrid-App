<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesStore, type Sale } from '@/store/sales'
import { useRefundsStore } from '@/store/refunds'
import { useAuthStore } from '@/store/auth'
import InvoiceModal from '@/components/InvoiceModal.vue'

const router = useRouter()
const salesStore = useSalesStore()
const refundsStore = useRefundsStore()
const auth = useAuthStore()
const paymentOptions = ['all', 'cash', 'card', 'mobile'] as const
const selected = ref<Sale | null>(null)
const showInvoice = ref(false)
const query = ref('')
const paymentFilter = ref<typeof paymentOptions[number]>('all')

onMounted(() => {
  salesStore.load()
  refundsStore.load()
})

const refundsMap = computed(() => {
  const map = new Map<string, number>()
  refundsStore.refundsForCurrentStore.forEach((record) => {
    map.set(record.saleId, (map.get(record.saleId) || 0) + record.totalRefund)
  })
  return map
})

const filteredSales = computed(() => {
  const q = query.value.trim().toLowerCase()
  return [...salesStore.sales]
    .filter((sale) => {
      const matchesQuery =
        !q ||
        sale.invoiceNumber.toLowerCase().includes(q) ||
        sale.customerName?.toLowerCase().includes(q) ||
        sale.items.some((item) => item.name.toLowerCase().includes(q))
      const matchesPayment = paymentFilter.value === 'all' || sale.paymentType === paymentFilter.value
      return matchesQuery && matchesPayment
    })
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
})

function openInvoice(sale: Sale) {
  selected.value = sale
  showInvoice.value = true
}

function openRefund(sale: Sale) {
  router.push({ path: '/admin/refunds', query: { invoice: sale.invoiceNumber } })
}

function deleteSale(sale: Sale) {
  if (!globalThis.confirm(`Delete invoice #${sale.invoiceNumber}? This action cannot be undone.`)) return
  salesStore.deleteSale(sale.id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="glass-panel space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="subtle-label">Sales & Refunds</div>
          <h2 class="section-heading">Sales History</h2>
        </div>
        <input
          v-model="query"
          type="search"
          placeholder="Search invoice, customer, or product"
          class="input-field w-full max-w-md"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in paymentOptions"
          :key="option"
          class="quick-filter"
          :class="paymentFilter === option ? 'bg-blue-600 text-white border-blue-600' : ''"
          @click="paymentFilter = option"
        >
          {{ option === 'all' ? 'All Payments' : option.charAt(0).toUpperCase() + option.slice(1) }}
        </button>
      </div>

      <div
        v-if="filteredSales.length === 0"
        class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500"
      >
        No invoices match your filters.
      </div>

      <div v-else class="overflow-hidden rounded-2xl border border-slate-100">
        <div class="max-h-[600px] overflow-auto">
          <table class="table-modern">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Payment</th>
                <th class="text-right">Total</th>
                <th class="text-right">Refunded</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredSales" :key="s.id">
                <td class="font-semibold text-slate-900">#{{ s.invoiceNumber }}</td>
                <td class="text-sm text-slate-600">{{ new Date(s.datetime).toLocaleString() }}</td>
                <td>{{ s.customerName || 'Walk-in' }}</td>
                <td>
                  <span class="pill-badge capitalize">{{ s.paymentType }}</span>
                </td>
                <td class="text-right font-semibold text-slate-900">
                  ₹{{ s.total.toFixed(2) }}
                </td>
                <td class="text-right">
                  <span v-if="refundsMap.get(s.id)" class="text-amber-600 font-semibold">
                    -₹{{ (refundsMap.get(s.id) || 0).toFixed(2) }}
                  </span>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td class="text-center">
                  <div class="flex flex-wrap items-center justify-center gap-2">
                    <button class="btn-ghost text-xs px-3 py-1" @click="openInvoice(s)">View / Print</button>
                    <button class="btn text-xs bg-emerald-50 text-emerald-700" @click="openRefund(s)">Refund</button>
                    <button v-if="auth.isAdmin" class="btn-danger text-xs px-3 py-1" @click="deleteSale(s)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <InvoiceModal
    v-if="showInvoice && selected"
    :invoiceNumber="selected.invoiceNumber"
    :datetime="selected.datetime"
    :items="selected.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount ?? 0,
      lineTotal: item.lineTotal ?? (item.unitPrice * item.quantity),
    }))"
    :subtotal="selected.items.reduce((sum, item) => sum + (item.lineTotal ?? (item.unitPrice * item.quantity)), 0)"
    :productDiscountTotal="selected.items.reduce((sum, item) => sum + (item.lineDiscount ?? 0), 0)"
    :invoiceDiscountMode="selected.invoiceDiscountMode"
    :invoiceDiscountValue="selected.invoiceDiscountValue"
    :invoiceDiscountAmount="selected.invoiceDiscountAmount"
    :total="selected.total"
    :paymentType="selected.paymentType"
    :cashier="selected.cashier"
    :customerName="selected.customerName"
    @close="showInvoice = false"
  />
</template>

<style scoped>
</style>

