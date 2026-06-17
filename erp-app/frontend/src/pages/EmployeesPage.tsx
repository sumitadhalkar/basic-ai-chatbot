import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Employee, PaginatedResponse } from '@/types'
import { PageHeader, SearchInput, Modal, ConfirmDialog, Spinner, EmptyState, Field, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'

type FormData = {
  first_name: string; last_name: string; email: string; phone: string
  department: string; designation: string; employment_type: string
  join_date: string; salary: number; pan_number: string
  bank_account: string; bank_ifsc: string
}

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deactivating, setDeactivating] = useState<Employee | null>(null)

  const { data, isLoading } = useQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees', search],
    queryFn: () => api.get('/employees', { params: { search, limit: 100 } }).then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { employment_type: 'full_time', salary: 0 },
  })

  const saveMutation = useMutation({
    mutationFn: (body: Partial<FormData>) =>
      editing
        ? api.patch(`/employees/${editing.id}`, body).then(r => r.data)
        : api.post('/employees', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(editing ? 'Employee updated' : 'Employee created')
      closeForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee deactivated')
      setDeactivating(null)
    },
  })

  function openCreate() { reset({ employment_type: 'full_time', salary: 0 }); setEditing(null); setShowForm(true) }
  function openEdit(e: Employee) {
    setEditing(e)
    reset({ first_name: e.first_name, last_name: e.last_name, email: e.email, phone: e.phone ?? '', department: e.department ?? '', designation: e.designation ?? '', employment_type: e.employment_type, join_date: e.join_date, salary: e.salary })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    on_leave: 'bg-yellow-100 text-yellow-700',
    terminated: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${data?.total ?? 0} active employees`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Employee</button>}
      />
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No employees found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Department</th>
                  <th className="table-th">Designation</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Salary</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs">{e.employee_id}</td>
                    <td className="table-td font-medium">{e.first_name} {e.last_name}</td>
                    <td className="table-td">{e.email}</td>
                    <td className="table-td">{e.department ?? '—'}</td>
                    <td className="table-td">{e.designation ?? '—'}</td>
                    <td className="table-td"><Badge label={e.employment_type} className="bg-blue-100 text-blue-700" /></td>
                    <td className="table-td font-medium">{formatCurrency(e.salary)}</td>
                    <td className="table-td">{formatDate(e.join_date)}</td>
                    <td className="table-td"><Badge label={e.status} className={STATUS_COLORS[e.status] ?? ''} /></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 hover:text-red-600" onClick={() => setDeactivating(e)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Employee' : 'New Employee'} size="lg">
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.first_name?.message}><input className="input" {...register('first_name', { required: 'Required' })} /></Field>
          <Field label="Last Name" required error={errors.last_name?.message}><input className="input" {...register('last_name', { required: 'Required' })} /></Field>
          <Field label="Email" required error={errors.email?.message}><input className="input" type="email" {...register('email', { required: 'Required' })} /></Field>
          <Field label="Phone"><input className="input" {...register('phone')} /></Field>
          <Field label="Department"><input className="input" {...register('department')} /></Field>
          <Field label="Designation"><input className="input" {...register('designation')} /></Field>
          <Field label="Employment Type">
            <select className="input" {...register('employment_type')}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </Field>
          <Field label="Join Date" required error={errors.join_date?.message}><input className="input" type="date" {...register('join_date', { required: 'Required' })} /></Field>
          <Field label="Salary"><input className="input" type="number" step="0.01" {...register('salary', { valueAsNumber: true })} /></Field>
          <Field label="PAN Number"><input className="input" {...register('pan_number')} /></Field>
          <Field label="Bank Account"><input className="input" {...register('bank_account')} /></Field>
          <Field label="IFSC Code"><input className="input" {...register('bank_ifsc')} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        title="Deactivate Employee"
        message={`Deactivate ${deactivating?.first_name} ${deactivating?.last_name}?`}
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
