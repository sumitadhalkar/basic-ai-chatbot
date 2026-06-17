import { Fragment, ReactNode } from 'react'
import { X, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin h-5 w-5 text-primary-600', className)} />
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative w-full rounded-xl bg-white shadow-2xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading?: boolean
}
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm text-gray-600 mt-1.5">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No records found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

// ─── Page Header ─────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color?: string
  sub?: string
}
export function StatCard({ label, value, icon, color = 'bg-primary-50 text-primary-600', sub }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Search Input ─────────────────────────────────────────────────────────────
interface SearchProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}
export function SearchInput({ value, onChange, placeholder = 'Search…' }: SearchProps) {
  return (
    <input
      className="input max-w-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('badge', className)}>
      {label.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  error?: string
  children: ReactNode
  required?: boolean
}
export function Field({ label, error, children, required }: FieldProps) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
