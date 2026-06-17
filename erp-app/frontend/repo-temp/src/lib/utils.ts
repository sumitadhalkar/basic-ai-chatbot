import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  confirmed:   'bg-blue-100 text-blue-700',
  processing:  'bg-yellow-100 text-yellow-700',
  shipped:     'bg-indigo-100 text-indigo-700',
  delivered:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
  returned:    'bg-orange-100 text-orange-700',
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft:           'bg-gray-100 text-gray-700',
  sent:            'bg-blue-100 text-blue-700',
  partially_paid:  'bg-yellow-100 text-yellow-700',
  paid:            'bg-green-100 text-green-700',
  overdue:         'bg-red-100 text-red-700',
  cancelled:       'bg-gray-100 text-gray-500',
}
