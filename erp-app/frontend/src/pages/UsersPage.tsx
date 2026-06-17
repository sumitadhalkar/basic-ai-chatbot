import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PageHeader, SearchInput, Modal, ConfirmDialog, Spinner, EmptyState, Field, Badge } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  is_superuser: boolean
  last_login: string | null
  created_at: string
}

type CreateForm = { email: string; full_name: string; password: string; role: string }
type UpdateForm = { full_name: string; role: string; is_active: boolean }

const ROLES = ['admin', 'manager', 'accountant', 'sales', 'viewer']
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  accountant: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const { data, isLoading } = useQuery<{ total: number; items: User[] }>({
    queryKey: ['users', search],
    queryFn: () => api.get('/users', { params: { search, limit: 100 } }).then(r => r.data),
  })

  const createForm = useForm<CreateForm>({ defaultValues: { role: 'viewer' } })
  const updateForm = useForm<UpdateForm>()

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      setShowCreate(false)
      createForm.reset({ role: 'viewer' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Create failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateForm }) =>
      api.patch(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditing(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
      setDeleting(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  function openEdit(u: User) {
    setEditing(u)
    updateForm.reset({ full_name: u.full_name, role: u.role, is_active: u.is_active })
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${data?.total ?? 0} users`}
        action={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add User
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search users…" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No users found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Last Login</th>
                  <th className="table-th">Created</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                          {u.full_name[0].toUpperCase()}
                        </div>
                        <span className="font-medium">{u.full_name}</span>
                        {u.is_superuser && <Shield size={12} className="text-red-500" title="Superuser" />}
                      </div>
                    </td>
                    <td className="table-td text-gray-500">{u.email}</td>
                    <td className="table-td">
                      <Badge label={u.role} className={ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'} />
                    </td>
                    <td className="table-td">
                      <Badge
                        label={u.is_active ? 'Active' : 'Inactive'}
                        className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                      />
                    </td>
                    <td className="table-td text-gray-400 text-xs">
                      {u.last_login ? formatDateTime(u.last_login) : 'Never'}
                    </td>
                    <td className="table-td text-gray-400 text-xs">{formatDateTime(u.created_at)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                          onClick={() => openEdit(u)}
                          disabled={u.is_superuser && !currentUser?.is_superuser}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                          onClick={() => setDeleting(u)}
                          disabled={u.id === currentUser?.id || u.is_superuser}
                        >
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

      {/* Create user */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User" size="md">
        <form onSubmit={createForm.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <Field label="Full Name" required error={createForm.formState.errors.full_name?.message}>
            <input className="input" {...createForm.register('full_name', { required: 'Required' })} />
          </Field>
          <Field label="Email" required error={createForm.formState.errors.email?.message}>
            <input className="input" type="email" {...createForm.register('email', { required: 'Required' })} />
          </Field>
          <Field label="Password" required error={createForm.formState.errors.password?.message}>
            <input className="input" type="password" {...createForm.register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          </Field>
          <Field label="Role">
            <select className="input" {...createForm.register('role')}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit user */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.full_name}`} size="md">
        <form onSubmit={updateForm.handleSubmit(d => editing && updateMutation.mutate({ id: editing.id, body: d }))} className="space-y-4">
          <Field label="Full Name" required>
            <input className="input" {...updateForm.register('full_name', { required: 'Required' })} />
          </Field>
          <Field label="Role">
            <select className="input" {...updateForm.register('role')}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...updateForm.register('is_active')} className="rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active account</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete User"
        message={`Permanently delete "${deleting?.full_name}"? This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
