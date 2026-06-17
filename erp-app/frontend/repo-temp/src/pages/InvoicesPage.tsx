import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Eye, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Invoice, PaginatedResponse, InvoiceStatus } from '@/types'
import { PageHeader, Modal, Spinner, EmptyState, Badge, Field } from '@/components/ui'
import { formatCurrency, formatDate, INVOICE_STATUS_COLORS } from '@/lib/utils'

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']

type PaymentForm = { amount: number }

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)

  const { data, isLoading } = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get('/invoices', { params: { status: statusFilter || undefined, limit: 100 } }).then(r => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InvoiceStatus }) =>
      api.patch(`/invoices/${id}/status`, null, { params: { new_status: status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Status updated') },
  })

  const { register, handleSubmit, reset } = useForm<PaymentForm>()
  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      api.post(`/invoices/${id}/payment`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Payment recorded')
      setPayingInvoice(null)
      reset()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Payment failed'),
  })

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${data?.total ?? 0} total invoices`} />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <select className="input max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No invoices found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Invoice #</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Due Date</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Balance</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium text-primary-600">{inv.invoice_number}</td>
                    <td className="table-td">{formatDate(inv.invoice_date)}</td>
                    <td className="table-td">{formatDate(inv.due_date)}</td>
                    <td className="table-td font-semibold">{formatCurrency(inv.total_amount)}</td>
                    <td className="table-td text-green-600">{formatCurrency(inv.paid_amount)}</td>
                    <td className="table-td text-red-600 font-medium">{formatCurrency(inv.balance_due)}</td>
                    <td className="table-td">
                      <Badge label={inv.status} className={INVOICE_STATUS_COLORS[inv.status]} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => setViewInvoice(inv)} title="View"><Eye size={14} /></button>
                        {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                          <button className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600" onClick={() => { setPayingInvoice(inv); reset({ amount: inv.balance_due }) }} title="Record Payment">
                            <CreditCard size={14} />
                          </button>
                        )}
                        <select className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white" value={inv.status} onChange={e => statusMutation.mutate({ id: inv.id, status: e.target.value as InvoiceStatus })}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
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

      {/* View modal */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoice_number}`} size="md">
        {viewInvoice && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Invoice Date:</span><br />{formatDate(viewInvoice.invoice_date)}</div>
              <div><span className="text-gray-500">Due Date:</span><br />{formatDate(viewInvoice.due_date)}</div>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewInvoice.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(viewInvoice.tax_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatCurrency(viewInvoice.discount_amount)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatCurrency(viewInvoice.total_amount)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{formatCurrency(viewInvoice.paid_amount)}</span></div>
              <div className="flex justify-between text-red-600 font-semibold"><span>Balance Due</span><span>{formatCurrency(viewInvoice.balance_due)}</span></div>
            </div>
            {viewInvoice.notes && <p className="text-gray-500 italic">{viewInvoice.notes}</p>}
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payingInvoice} onClose={() => setPayingInvoice(null)} title="Record Payment" size="sm">
        {payingInvoice && (
          <form onSubmit={handleSubmit(d => paymentMutation.mutate({ id: payingInvoice.id, amount: d.amount }))} className="space-y-4">
            <p className="text-sm text-gray-600">Balance due: <strong>{formatCurrency(payingInvoice.balance_due)}</strong></p>
            <Field label="Payment Amount" required>
              <input className="input" type="number" step="0.01" max={payingInvoice.balance_due} {...register('amount', { valueAsNumber: true, required: true })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPayingInvoice(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Record'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
