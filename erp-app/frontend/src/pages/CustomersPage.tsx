import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Customer, PaginatedResponse } from '@/types'
import {
  PageHeader, SearchInput, Modal, ConfirmDialog,
  Spinner, EmptyState, Field, Badge,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

type FormData = {
  name: string; email: string; phone: string; company: string
  gst_number: string; city: string; state: string; country: string
  pincode: string; credit_limit: number; notes: string
}

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search, limit: 100 } }).then(r => r.data),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { country: 'India', credit_limit: 0 },
  })

  const saveMutation = useMutation({
    mutationFn: (body: Partial<FormData>) =>
      editing
        ? api.patch(`/customers/${editing.id}`, body).then(r => r.data)
        : api.post('/customers', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success(editing ? 'Customer updated' : 'Customer created')
      closeForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted')
      setDeleting(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  function openCreate() {
    reset({ country: 'India', credit_limit: 0 })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    reset({
      name: c.name, email: c.email ?? '', phone: c.phone ?? '',
      company: c.company ?? '', gst_number: c.gst_number ?? '',
      city: c.city ?? '', state: c.state ?? '', country: c.country,
      pincode: '', credit_limit: c.credit_limit, notes: '',
    })
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null) }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${data?.total ?? 0} total customers`}
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Customer
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, company…" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No customers found. Add your first customer!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Company</th>
                  <th className="table-th">City</th>
                  <th className="table-th">Credit Limit</th>
                  <th className="table-th">Outstanding</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium text-gray-900">{c.name}</td>
                    <td className="table-td">
                      <div>{c.email ?? '—'}</div>
                      <div className="text-gray-400 text-xs">{c.phone ?? ''}</div>
                    </td>
                    <td className="table-td">{c.company ?? '—'}</td>
                    <td className="table-td">{c.city ?? '—'}</td>
                    <td className="table-td">{formatCurrency(c.credit_limit)}</td>
                    <td className="table-td">{formatCurrency(c.outstanding_balance)}</td>
                    <td className="table-td">
                      <Badge
                        label={c.is_active ? 'Active' : 'Inactive'}
                        className={c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                      />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => openEdit(c)}>
                          <Pencil size={14} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" onClick={() => setDeleting(c)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Customer' : 'New Customer'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name?.message}>
            <input className="input" {...register('name', { required: 'Required' })} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input className="input" type="email" {...register('email')} />
          </Field>
          <Field label="Phone">
            <input className="input" {...register('phone')} />
          </Field>
          <Field label="Company">
            <input className="input" {...register('company')} />
          </Field>
          <Field label="GST Number">
            <input className="input" {...register('gst_number')} />
          </Field>
          <Field label="Credit Limit">
            <input className="input" type="number" step="0.01" {...register('credit_limit', { valueAsNumber: true })} />
          </Field>
          <Field label="City">
            <input className="input" {...register('city')} />
          </Field>
          <Field label="State">
            <input className="input" {...register('state')} />
          </Field>
          <Field label="Country">
            <input className="input" {...register('country')} />
          </Field>
          <Field label="Pincode">
            <input className="input" {...register('pincode')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea className="input" rows={2} {...register('notes')} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
