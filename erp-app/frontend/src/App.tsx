import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import CustomersPage from '@/pages/CustomersPage'
import ProductsPage from '@/pages/ProductsPage'
import OrdersPage from '@/pages/OrdersPage'
import InvoicesPage from '@/pages/InvoicesPage'
import EmployeesPage from '@/pages/EmployeesPage'
import LedgerPage from '@/pages/LedgerPage'
import UsersPage from '@/pages/UsersPage'
import SettingsPage from '@/pages/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const token = localStorage.getItem('access_token')
  if (!user && !token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="customers"  element={<CustomersPage />} />
          <Route path="products"   element={<ProductsPage />} />
          <Route path="orders"     element={<OrdersPage />} />
          <Route path="invoices"   element={<InvoicesPage />} />
          <Route path="employees"  element={<EmployeesPage />} />
          <Route path="ledger"     element={<LedgerPage />} />
          <Route path="users"      element={<UsersPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
