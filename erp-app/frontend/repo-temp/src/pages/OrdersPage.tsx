import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Order, PaginatedResponse, OrderStatus } from '@/types'
import { PageHeader, Modal, Spinner, EmptyState, Badge, Field, SearchInput } from '@/components/ui'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils'

const STATUSES: OrderStatus[] = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']

export default function OrdersPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  const { data, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', statusFilter],
    queryFn: () => api.get('/orders', { params: { status: statusFilter || undefined, limit: 100 } }).then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, null, { params: { new_status: status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order status updated')
    },
  })

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${data?.total ?? 0} total orders`}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <select
            className="input max-w-xs"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OrderStatus | '')}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No orders found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Order #</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Customer ID</th>
                  <th className="table-th">Items</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-primary-600">{o.order_number}</td>
                    <td className="table-td">{formatDate(o.order_date)}</td>
                    <td className="table-td">#{o.customer_id}</td>
                    <td className="table-td">{o.items?.length ?? 0}</td>
                    <td className="table-td font-semibold">{formatCurrency(o.total_amount)}</td>
                    <td className="table-td">
                      <Badge label={o.status} className={ORDER_STATUS_COLORS[o.status]} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => setViewOrder(o)} title="View">
                          <Eye size={14} />
                        </button>
                        <select
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                          value={o.status}
                          onChange={e => statusMutation.mutate({ id: o.id, status: e.target.value as OrderStatus })}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.order_number}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Date:</span> {formatDate(viewOrder.order_date)}</div>
              <div><span className="text-gray-500">Status:</span> <Badge label={viewOrder.status} className={ORDER_STATUS_COLORS[viewOrder.status]} /></div>
              {viewOrder.delivery_date && <div><span className="text-gray-500">Delivery:</span> {formatDate(viewOrder.delivery_date)}</div>}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Price</th>
                    <th className="table-th">Tax</th>
                    <th className="table-th">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewOrder.items?.map(item => (
                    <tr key={item.id}>
                      <td className="table-td">{item.product_name}</td>
                      <td className="table-td">{item.quantity}</td>
                      <td className="table-td">{formatCurrency(item.unit_price)}</td>
                      <td className="table-td">{formatCurrency(item.tax_amount)}</td>
                      <td className="table-td font-medium">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="text-right space-y-1 text-sm">
                <div className="flex gap-8 justify-between"><span className="text-gray-500">Subtotal:</span> <span>{formatCurrency(viewOrder.subtotal)}</span></div>
                <div className="flex gap-8 justify-between"><span className="text-gray-500">Tax:</span> <span>{formatCurrency(viewOrder.tax_amount)}</span></div>
                <div className="flex gap-8 justify-between font-bold text-base border-t pt-1"><span>Total:</span> <span>{formatCurrency(viewOrder.total_amount)}</span></div>
              </div>
            </div>
            {viewOrder.notes && <p className="text-sm text-gray-500 border-t pt-3">{viewOrder.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
