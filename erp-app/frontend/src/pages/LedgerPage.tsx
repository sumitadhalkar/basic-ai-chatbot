import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { LedgerEntry, PaginatedResponse } from '@/types'
import { PageHeader, Modal, Spinner, EmptyState, Field, StatCard, Badge } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/lib/utils'

type FormData = {
  transaction_type: 'credit' | 'debit'
  account_head: string
  amount: number
  description: string
  transaction_date: string
}

interface LedgerSummary {
  total_credits: number
  total_debits: number
  net_balance: number
}

export default function LedgerPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery<PaginatedResponse<LedgerEntry>>({
    queryKey: ['ledger'],
    queryFn: () => api.get('/ledger', { params: { limit: 200 } }).then(r => r.data),
  })

  const { data: summary } = useQuery<LedgerSummary>({
    queryKey: ['ledger-summary'],
    queryFn: () => api.get('/ledger/summary').then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      transaction_type: 'credit',
      transaction_date: new Date().toISOString().slice(0, 16),
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: FormData) => api.post('/ledger', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger'] })
      qc.invalidateQueries({ queryKey: ['ledger-summary'] })
      toast.success('Transaction recorded')
      setShowForm(false)
      reset()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed'),
  })

  return (
    <div>
      <PageHeader
        title="Ledger"
        subtitle="General ledger & transaction history"
        action={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Entry
          </button>
        }
      />

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Credits"
            value={formatCurrency(summary.total_credits)}
            icon={<TrendingUp size={22} />}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            label="Total Debits"
            value={formatCurrency(summary.total_debits)}
            icon={<TrendingDown size={22} />}
            color="bg-red-50 text-red-600"
          />
          <StatCard
            label="Net Balance"
            value={formatCurrency(summary.net_balance)}
            icon={<DollarSign size={22} />}
            color={summary.net_balance >= 0 ? 'bg-primary-50 text-primary-600' : 'bg-orange-50 text-orange-600'}
          />
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No ledger entries yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Reference</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Account Head</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Type</th>
                  <th className="table-th text-right">Amount</th>
                  <th className="table-th text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs text-gray-500">{entry.reference_number}</td>
                    <td className="table-td">{formatDateTime(entry.transaction_date)}</td>
                    <td className="table-td font-medium">{entry.account_head}</td>
                    <td className="table-td text-gray-500">{entry.description ?? '—'}</td>
                    <td className="table-td">
                      <Badge
                        label={entry.transaction_type}
                        className={
                          entry.transaction_type === 'credit'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      />
                    </td>
                    <td className={`table-td text-right font-semibold ${entry.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </td>
                    <td className="table-td text-right font-medium">
                      {formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Ledger Entry" size="md">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <Field label="Transaction Type" required>
            <select className="input" {...register('transaction_type')}>
              <option value="credit">Credit (Income / Receipt)</option>
              <option value="debit">Debit (Expense / Payment)</option>
            </select>
          </Field>
          <Field label="Account Head" required error={errors.account_head?.message}>
            <input
              className="input"
              placeholder="e.g. Sales Revenue, Rent, Salary"
              {...register('account_head', { required: 'Required' })}
            />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { required: 'Required', valueAsNumber: true })}
            />
          </Field>
          <Field label="Transaction Date" required>
            <input
              className="input"
              type="datetime-local"
              {...register('transaction_date', { required: 'Required' })}
            />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={2} {...register('description')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Record Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
