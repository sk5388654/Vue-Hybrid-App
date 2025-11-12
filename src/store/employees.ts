import { defineStore } from 'pinia'
import { useStoresStore } from './stores'

export type EmployeeRole = 'Admin' | 'Manager' | 'Cashier'

export type EmployeeStatus = 'Active' | 'Inactive'

export type Employee = {
  id: string
  storeId: string
  fullName: string
  role: EmployeeRole
  username: string
  password: string // Simple for now, should be hashed in production
  hireDate: string
  status: EmployeeStatus
  createdAt: string
  updatedAt: string
}

export type ActivityLog = {
  id: string
  storeId: string
  employeeId: string
  action: string
  details?: string
  timestamp: string
}

const LS_EMPLOYEES_PREFIX = 'employees_'
const LS_ACTIVITY_PREFIX = 'activity_logs_'

export const useEmployeesStore = defineStore('employees', {
  state: () => ({
    employees: [] as Employee[],
    activityLogs: [] as ActivityLog[],
  }),
  getters: {
    employeesForCurrentStore(state): Employee[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.employees.filter(e => e.storeId === sid)
    },
    activeEmployees(state): Employee[] {
      return this.employeesForCurrentStore.filter(e => e.status === 'Active')
    },
    employeesByRole: (state) => {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      const map = new Map<EmployeeRole, Employee[]>()
      state.employees
        .filter(e => e.storeId === sid && e.status === 'Active')
        .forEach(e => {
          const existing = map.get(e.role) || []
          existing.push(e)
          map.set(e.role, existing)
        })
      return map
    },
    activityLogsForCurrentStore(state): ActivityLog[] {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return []
      return state.activityLogs.filter(log => log.storeId === sid)
    },
  },
  actions: {
    load() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) {
        this.employees = []
        this.activityLogs = []
        return
      }

      // Load employees
      const employeesKey = `${LS_EMPLOYEES_PREFIX}${sid}`
      const employeesRaw = localStorage.getItem(employeesKey)
      if (employeesRaw) {
        try {
          this.employees = JSON.parse(employeesRaw)
        } catch {
          this.employees = []
        }
      }

      // Load activity logs
      const logsKey = `${LS_ACTIVITY_PREFIX}${sid}`
      const logsRaw = localStorage.getItem(logsKey)
      if (logsRaw) {
        try {
          this.activityLogs = JSON.parse(logsRaw)
        } catch {
          this.activityLogs = []
        }
      }
    },
    persist() {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return

      localStorage.setItem(`${LS_EMPLOYEES_PREFIX}${sid}`, JSON.stringify(this.employees))
      localStorage.setItem(`${LS_ACTIVITY_PREFIX}${sid}`, JSON.stringify(this.activityLogs))
    },
    // Employee CRUD
    addEmployee(employee: Omit<Employee, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return null

      // Check if username already exists for this store
      const existing = this.employeesForCurrentStore.find(e => e.username === employee.username)
      if (existing) {
        throw new Error('Username already exists')
      }

      const now = new Date().toISOString()
      const newEmployee: Employee = {
        ...employee,
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        createdAt: now,
        updatedAt: now,
      }
      this.employees.push(newEmployee)
      this.persist()
      return newEmployee
    },
    updateEmployee(id: string, patch: Partial<Omit<Employee, 'id' | 'storeId' | 'createdAt'>>) {
      const idx = this.employees.findIndex(e => e.id === id)
      if (idx === -1) return

      // Check username uniqueness if changing username
      if (patch.username) {
        const existing = this.employeesForCurrentStore.find(e => e.username === patch.username && e.id !== id)
        if (existing) {
          throw new Error('Username already exists')
        }
      }

      this.employees[idx] = {
        ...this.employees[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      this.persist()
    },
    removeEmployee(id: string) {
      this.employees = this.employees.filter(e => e.id !== id)
      this.persist()
    },
    // Activity logging
    logActivity(employeeId: string, action: string, details?: string) {
      const storesStore = useStoresStore()
      const sid = storesStore.currentStoreId
      if (!sid) return

      const log: ActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storeId: sid,
        employeeId,
        action,
        details,
        timestamp: new Date().toISOString(),
      }
      this.activityLogs.push(log)
      // Keep only last 1000 logs per store
      if (this.activityLogsForCurrentStore.length > 1000) {
        this.activityLogs = this.activityLogsForCurrentStore.slice(-1000)
      }
      this.persist()
    },
    setCurrentStore() {
      this.load()
    },
  },
})

