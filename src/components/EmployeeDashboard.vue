<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSalesStore } from '@/store/sales'
import { useRefundsStore } from '@/store/refunds'
import { useEmployeesStore } from '@/store/employees'
import { useAuthStore } from '@/store/auth'

const salesStore = useSalesStore()
const refundsStore = useRefundsStore()
const employeesStore = useEmployeesStore()
const auth = useAuthStore()

const now = new Date()

onMounted(() => {
  salesStore.load()
  refundsStore.load()
  employeesStore.load()
  auth.load()
})

// Build per-cashier metrics
const cashiers = computed(() => {
  // find distinct cashier names from sales and refunds and employees
  const names = new Set<string>()
  salesStore.sales.forEach(s => names.add(s.cashier || 'Unknown'))
  refundsStore.refundsForCurrentStore.forEach(r => names.add(r.cashier || 'Unknown'))
  employeesStore.employeesForCurrentStore.forEach(e => names.add(e.fullName))

  return Array.from(names).map(name => ({ name }))
})

const metrics = computed(() => {
  const res = new Map<string, any>()
  cashiers.value.forEach(c => {
    res.set(c.name, {
      salesTotal: 0,
      grossSales: 0,
      totalDiscount: 0,
      refundsAmount: 0,
      refundsCount: 0,
      hours: 0,
    })
  })

  // aggregate sales
  salesStore.sales.forEach(s => {
    const m = res.get(s.cashier) || { salesTotal: 0, grossSales: 0, totalDiscount: 0, refundsAmount: 0, refundsCount: 0, hours: 0 }
    m.salesTotal += s.total
    const gross = s.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
    m.grossSales += gross
    const disc = Math.max(0, gross - s.total)
    m.totalDiscount += disc
    res.set(s.cashier, m)
  })

  // aggregate refunds
  refundsStore.refundsForCurrentStore.forEach(r => {
    const name = r.cashier || 'Unknown'
    const m = res.get(name) || { salesTotal: 0, grossSales: 0, totalDiscount: 0, refundsAmount: 0, refundsCount: 0, hours: 0 }
    m.refundsAmount += r.totalRefund
    m.refundsCount += 1
    res.set(name, m)
  })

  // compute hours from activity logs: find Login/Logout per employeeId
  const logs = employeesStore.activityLogsForCurrentStore
  const logsByEmployee = new Map<string, typeof logs>()
  logs.forEach(l => {
    const arr = logsByEmployee.get(l.employeeId) || []
    arr.push(l)
    logsByEmployee.set(l.employeeId, arr)
  })

  logsByEmployee.forEach((arr, empId) => {
    // sort by timestamp
    arr.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    let totalMs = 0
    let lastLogin: string | null = null
    arr.forEach(log => {
      const act = (log.action || '').toLowerCase()
      if (act.includes('login')) {
        lastLogin = log.timestamp
      } else if (act.includes('logout') && lastLogin) {
        const start = new Date(lastLogin).getTime()
        const end = new Date(log.timestamp).getTime()
        if (end > start) totalMs += (end - start)
        lastLogin = null
      }
    })
    // if still logged in, count until now
    if (lastLogin) {
      const start = new Date(lastLogin).getTime()
      totalMs += Math.max(0, now.getTime() - start)
    }
    // find employee name
    const emp = employeesStore.employees.find(e => e.id === empId)
    const empName = emp ? emp.fullName : empId
    const m = res.get(empName) || { salesTotal: 0, grossSales: 0, totalDiscount: 0, refundsAmount: 0, refundsCount: 0, hours: 0 }
    m.hours = Number((totalMs / (1000 * 60 * 60)).toFixed(2))
    res.set(empName, m)
  })

  return res
})

const rows = computed(() => {
  const arr: Array<any> = []
  metrics.value.forEach((v, k) => {
    const avgDiscountPercent = v.grossSales ? (v.totalDiscount / v.grossSales) * 100 : 0
    arr.push({
      cashier: k,
      salesTotal: v.salesTotal || 0,
      avgDiscountPercent: Number(avgDiscountPercent.toFixed(2)),
      refundsAmount: v.refundsAmount || 0,
      refundsCount: v.refundsCount || 0,
      hours: v.hours || 0,
    })
  })
  return arr.sort((a,b) => b.salesTotal - a.salesTotal)
})

</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Employee Performance Dashboard</h2>
    </div>

    <div class="rounded-lg border border-transparent p-4 dark-panel">
      <table class="w-full text-sm">
        <thead class="dark-panel text-slate-300">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide">Cashier</th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Sales (Rs)</th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Avg Discount (%)</th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Refunds (Rs)</th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Refund Count</th>
            <th class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide">Hours Logged</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="r in rows" :key="r.cashier">
            <td class="px-3 py-2 text-slate-200">{{ r.cashier }}</td>
            <td class="px-3 py-2 text-right font-medium text-slate-100">₹{{ r.salesTotal.toFixed(2) }}</td>
            <td class="px-3 py-2 text-right text-slate-300">{{ r.avgDiscountPercent }}%</td>
            <td class="px-3 py-2 text-right text-slate-300">₹{{ r.refundsAmount.toFixed(2) }}</td>
            <td class="px-3 py-2 text-right text-slate-300">{{ r.refundsCount }}</td>
            <td class="px-3 py-2 text-right text-slate-300">{{ r.hours }}h</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
</style>
