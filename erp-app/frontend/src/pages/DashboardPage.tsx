import { useQuery } from '@tanstack/react-query'
import {
  Users, Package, ShoppingCart, FileText,
  TrendingUp, AlertTriangle, UserCheck, DollarSign,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/lib/api'
import type { DashboardStats } from '@/types'
import { StatCard, PageHeader, Spinner, Badge } from '@/components/ui'
import { formatCurrency, formatDateTime, ORDER_STATUS_COLORS } from '@/lib/utils'

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!data) return null

  const chartData = [
    { name: 'Revenue', value: data.revenue_this_month },
    { name: 'Outstanding', value: data.outstanding_receivables },
    { name: 'Total Rev.', value: data.total_revenue },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back! Here's what's happening today.`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={data.customers}
          icon={<Users size={22} />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Products"
          value={data.products}
          icon={<Package size={22} />}
          color="bg-purple-50 text-purple-600"
          sub={data.low_stock_products > 0 ? `${data.low_stock_products} low stock` : undefined}
        />
        <StatCard
          label="Pending Orders"
          value={data.pending_orders}
          icon={<ShoppingCart size={22} />}
          color="bg-orange-50 text-orange-600"
          sub={`${data.orders_this_month} this month`}
        />
        <StatCard
          label="Employees"
          value={data.employees}
          icon={<UserCheck size={22} />}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Revenue This Month"
          value={formatCurrency(data.revenue_this_month)}
          icon={<TrendingUp size={22} />}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.total_revenue)}
          icon={<DollarSign size={22} />}
          color="bg-primary-50 text-primary-600"
        />
        <StatCard
          label="Outstanding Receivables"
          value={formatCurrency(data.outstanding_receivables)}
          icon={<AlertTriangle size={22} />}
          color="bg-red-50 text-red-600"
          sub={data.overdue_invoices > 0 ? `${data.overdue_invoices} overdue` : undefined}
        />
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Financial Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Orders</h2>
          {data.recent_orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.order_number}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={o.status} className={ORDER_STATUS_COLORS[o.status]} />
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(o.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(data.low_stock_products > 0 || data.overdue_invoices > 0) && (
        <div className="card p-5 border-orange-200 bg-orange-50">
          <h2 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Action Required
          </h2>
          <ul className="space-y-1">
            {data.low_stock_products > 0 && (
              <li className="text-sm text-orange-700">
                ⚠️ {data.low_stock_products} product(s) are below reorder level
              </li>
            )}
            {data.overdue_invoices > 0 && (
              <li className="text-sm text-orange-700">
                ⚠️ {data.overdue_invoices} invoice(s) are overdue
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
