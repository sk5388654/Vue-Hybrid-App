import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const PosView = () => import('@/views/PosView.vue')
const ProductAdmin = () => import('@/components/ProductAdmin.vue')
const SalesReport = () => import('@/components/SalesReport.vue')
const EmployeeDashboard = () => import('@/components/EmployeeDashboard.vue')
const SalesHistory = () => import('@/views/SalesHistory.vue')
const ExpenseAdmin = () => import('@/components/ExpenseAdmin.vue')
const CustomerAdmin = () => import('@/components/CustomerAdmin.vue')
const SupplierAdmin = () => import('@/components/SupplierAdmin.vue')
const EmployeeAdmin = () => import('@/components/EmployeeAdmin.vue')
const ClosingVoucher = () => import('@/components/ClosingVoucher.vue')
const PrintClosingVoucher = () => import('@/views/PrintClosingVoucher.vue')
const LoginView = () => import('@/views/LoginView.vue')
const RefundManager = () => import('@/components/RefundManager.vue')

const routes = [
  { path: '/', redirect: '/pos' },
  { path: '/login', component: LoginView, meta: { guestOnly: true } },
  { path: '/pos', component: PosView, meta: { requiresAuth: true } },
  { path: '/admin/products', component: ProductAdmin, meta: { requiresAuth: true, requiresManager: true } },
  { path: '/admin/expenses', component: ExpenseAdmin, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/customers', component: CustomerAdmin, meta: { requiresAuth: true } },
  { path: '/admin/suppliers', component: SupplierAdmin, meta: { requiresAuth: true, requiresManager: true } },
  { path: '/admin/employees', component: EmployeeAdmin, meta: { requiresAuth: true, requiresManager: true } },
  { path: '/admin/refunds', component: RefundManager, meta: { requiresAuth: true, requiresManager: true } },
  { path: '/closing', component: ClosingVoucher, meta: { requiresAuth: true } },
  { path: '/print/closing/:id', component: PrintClosingVoucher, meta: { requiresAuth: true } },
  { path: '/reports', component: SalesReport, meta: { requiresAuth: true } },
  { path: '/reports/employees', component: EmployeeDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/sales-history', component: SalesHistory, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (!auth.user) auth.load()
  if (to.meta.guestOnly && auth.isAuthenticated) return next('/pos')
  if (to.meta.requiresAuth && !auth.isAuthenticated) return next('/login')
  if (to.meta.requiresAdmin && !auth.isAdmin) return next('/pos')
  if (to.meta.requiresManager && !auth.isManager) return next('/pos')
  next()
})

export default router

