import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, ShoppingCart, FileText,
  UserCheck, BookOpen, Settings, LogOut, Menu, X, Building2,
  ChevronDown, Bell,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/customers',  label: 'Customers',  icon: Users },
  { to: '/products',   label: 'Products',   icon: Package },
  { to: '/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/invoices',   label: 'Invoices',   icon: FileText },
  { to: '/employees',  label: 'Employees',  icon: UserCheck },
  { to: '/ledger',     label: 'Ledger',     icon: BookOpen },
  { to: '/users',      label: 'Users',      icon: Users,   adminOnly: true },
  { to: '/settings',   label: 'Settings',   icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = NAV.filter(n => !n.adminOnly || user?.is_superuser || user?.role === 'admin')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 transition-all duration-300 shadow-xl',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-700 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">ERP Platform</span>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all transform',
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg hover:shadow-xl'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:translate-x-1',
                )
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-700 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
              <p className="truncate text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6 shadow-sm">
          <button
            className="text-gray-500 hover:text-gray-700 lg:hidden transition-all transform hover:scale-110"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-110 hover:shadow-md">
              <Bell size={18} />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
