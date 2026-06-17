export interface PaginatedResponse<T> {
  total: number
  items: T[]
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  company: string | null
  gst_number: string | null
  city: string | null
  state: string | null
  country: string
  credit_limit: number
  outstanding_balance: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: number
  sku: string
  name: string
  description: string | null
  product_type: 'goods' | 'service'
  category: string | null
  unit: string
  purchase_price: number
  selling_price: number
  tax_rate: number
  hsn_code: string | null
  stock_quantity: number
  reorder_level: number
  is_active: boolean
}

export type OrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  tax_rate: number
  tax_amount: number
  discount: number
  line_total: number
}

export interface Order {
  id: number
  order_number: string
  customer_id: number
  status: OrderStatus
  order_date: string
  delivery_date: string | null
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  items: OrderItem[]
  created_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: number
  invoice_number: string
  order_id: number | null
  customer_id: number
  status: InvoiceStatus
  invoice_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  notes: string | null
  created_at: string
}

export interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  department: string | null
  designation: string | null
  employment_type: string
  status: string
  join_date: string
  salary: number
  is_active: boolean
}

export interface LedgerEntry {
  id: number
  reference_number: string
  transaction_type: 'credit' | 'debit'
  account_head: string
  amount: number
  balance: number
  description: string | null
  transaction_date: string
}

export interface DashboardStats {
  customers: number
  products: number
  employees: number
  total_orders: number
  orders_this_month: number
  pending_orders: number
  revenue_this_month: number
  total_revenue: number
  outstanding_receivables: number
  low_stock_products: number
  overdue_invoices: number
  recent_orders: Array<{
    id: number
    order_number: string
    customer_id: number
    status: OrderStatus
    total_amount: number
    created_at: string
  }>
}
