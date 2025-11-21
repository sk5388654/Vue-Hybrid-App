import { defineStore } from 'pinia'
import { useStoresStore } from './stores'
import { useEmployeesStore } from './employees'

type Role = 'Admin' | 'Manager' | 'Cashier'

type User = {
  username: string
  role: Role
  displayName: string
  employeeId?: string
}

const DEFAULT_USER = {
  username: 'admin',
  password: 'admin1',
  role: 'Admin' as Role,
  displayName: 'Admin',
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'Admin',
    isManager: (state) => {
      const role = state.user?.role
      return role === 'Admin' || role === 'Manager'
    },
    isCashier: (state) => state.user?.role === 'Cashier',
  },
  actions: {
    load() {
      const raw = localStorage.getItem('auth')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          this.user = parsed.user ?? null
        } catch {
          this.user = null
        }
      }
    },
    persist() {
      localStorage.setItem('auth', JSON.stringify({ user: this.user }))
    },
    login(username: string, password: string) {
      if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
        this.user = {
          username,
          role: 'Admin',
          displayName: DEFAULT_USER.displayName,
        }
        this.persist()
        try {
          const stores = useStoresStore()
          stores.load()
        } catch {}
        return true
      }
      try {
        const stores = useStoresStore()
        if (!stores.stores.length) stores.load()
        const matched = stores.stores.find(s => s.credentials?.username === username && s.credentials?.password === password)
        if (matched) {
          // treat store credential logins as Manager so they get Product/Expenses access
          this.user = { username, role: 'Manager', displayName: matched.name }
          stores.setCurrentStore(matched.id)
          this.persist()
          return true
        }
      } catch {}
      try {
        const employees = useEmployeesStore()
        const stores = useStoresStore()
        stores.load()
        for (const store of stores.stores) {
          const employeesRaw = localStorage.getItem(`employees_${store.id}`)
          if (!employeesRaw) continue
          let list: any[] = []
          try {
            list = JSON.parse(employeesRaw)
          } catch {
            list = []
          }
          const employee = list.find((e) => e.username === username && e.password === password && e.status === 'Active')
          if (employee) {
            const role: Role = employee.role === 'Manager' ? 'Manager' : employee.role === 'Admin' ? 'Admin' : 'Cashier'
            stores.setCurrentStore(store.id)
            employees.$patch({ employees: list })
            const activityRaw = localStorage.getItem(`activity_logs_${store.id}`)
            if (activityRaw) {
              try {
                employees.$patch({ activityLogs: JSON.parse(activityRaw) })
              } catch {
                employees.$patch({ activityLogs: [] })
              }
            }
            this.user = {
              username: employee.username,
              role,
              displayName: employee.fullName,
              employeeId: employee.id,
            }
            employees.logActivity(employee.id, 'Login', 'Employee logged in')
            this.persist()
            return true
          }
        }
      } catch {}
      return false
    },
    logout() {
      this.user = null
      this.persist()
    }
  }
})

