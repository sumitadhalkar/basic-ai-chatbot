import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Product, PaginatedResponse } from '@/types'
import { PageHeader, SearchInput, Modal, ConfirmDialog, Spinner, EmptyState, Field, Badge } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

type FormData = {
  sku: string; name: string; description: string; product_type: 'goods' | 'service'
  category: string; unit: string; purchase_price: number; selling_price: number
  tax_rate: number; hsn_code: string; stock_quantity: number; reorder_level: number
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', search, lowStock],
    queryFn: () => api.get('/products', { params: { search, low_stock: lowStock, limit: 100 } }).then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { product_type: 'goods', unit: 'pcs', tax_rate: 18, reorder_level: 10, stock_quantity: 0 },
  })

  const saveMutation = useMutation({
    mutationFn: (body: Partial<FormData>) =>
      editing
        ? api.patch(`/products/${editing.id}`, body).then(r => r.data)
        : api.post('/products', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success(editing ? 'Product updated' : 'Product created')
      closeForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deactivated')
      setDeleting(null)
    },
  })

  function openCreate() { reset({ product_type: 'goods', unit: 'pcs', tax_rate: 18, reorder_level: 10, stock_quantity: 0 }); setEditing(null); setShowForm(true) }
  function openEdit(p: Product) {
    setEditing(p)
    reset({ sku: p.sku, name: p.name, description: p.description ?? '', product_type: p.product_type, category: p.category ?? '', unit: p.unit, purchase_price: p.purchase_price, selling_price: p.selling_price, tax_rate: p.tax_rate, hsn_code: p.hsn_code ?? '', stock_quantity: p.stock_quantity, reorder_level: p.reorder_level })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  return (
    <div>
      <PageHeader
        title="Products & Inventory"
        subtitle={`${data?.total ?? 0} total products`}
        action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Product</button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or SKU…" />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="rounded" />
            <AlertTriangle size={14} className="text-orange-500" /> Low stock only
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data?.items.length ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Purchase Price</th>
                  <th className="table-th">Selling Price</th>
                  <th className="table-th">GST %</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs">{p.sku}</td>
                    <td className="table-td font-medium text-gray-900">{p.name}</td>
                    <td className="table-td">{p.category ?? '—'}</td>
                    <td className="table-td">
                      <Badge label={p.product_type} className="bg-purple-100 text-purple-700" />
                    </td>
                    <td className="table-td">{formatCurrency(p.purchase_price)}</td>
                    <td className="table-td font-medium">{formatCurrency(p.selling_price)}</td>
                    <td className="table-td">{p.tax_rate}%</td>
                    <td className="table-td">
                      <span className={p.stock_quantity <= p.reorder_level ? 'text-orange-600 font-semibold' : ''}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" onClick={() => setDeleting(p)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Product' : 'New Product'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SKU" required error={errors.sku?.message}>
            <input className="input" {...register('sku', { required: 'Required' })} disabled={!!editing} />
          </Field>
          <Field label="Product Name" required error={errors.name?.message}>
            <input className="input" {...register('name', { required: 'Required' })} />
          </Field>
          <Field label="Type">
            <select className="input" {...register('product_type')}>
              <option value="goods">Goods</option>
              <option value="service">Service</option>
            </select>
          </Field>
          <Field label="Category">
            <input className="input" {...register('category')} />
          </Field>
          <Field label="Unit">
            <input className="input" {...register('unit')} placeholder="pcs, kg, hr…" />
          </Field>
          <Field label="HSN Code">
            <input className="input" {...register('hsn_code')} />
          </Field>
          <Field label="Purchase Price">
            <input className="input" type="number" step="0.01" {...register('purchase_price', { valueAsNumber: true })} />
          </Field>
          <Field label="Selling Price">
            <input className="input" type="number" step="0.01" {...register('selling_price', { valueAsNumber: true })} />
          </Field>
          <Field label="GST Rate (%)">
            <input className="input" type="number" step="0.01" {...register('tax_rate', { valueAsNumber: true })} />
          </Field>
          <Field label="Stock Quantity">
            <input className="input" type="number" {...register('stock_quantity', { valueAsNumber: true })} />
          </Field>
          <Field label="Reorder Level">
            <input className="input" type="number" {...register('reorder_level', { valueAsNumber: true })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea className="input" rows={2} {...register('description')} />
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
        title="Deactivate Product"
        message={`Deactivate "${deleting?.name}"?`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
