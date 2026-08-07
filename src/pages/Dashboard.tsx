import { useEffect, useState } from 'react'

// Products with total stock below this are counted as "Low Stock"
const LOW_STOCK_THRESHOLD = 100

interface DashboardProps {
  onNavigate: (page: string) => void
}

interface RecentActivityItem {
  label: string
  timeAgo: string
  timestamp: number
}

import { supabase } from '../lib/supabaseClient'

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

const detectDateField = (row: Record<string, any>) => {
  const candidates = ['created_at', 'invoice_date', 'date']
  return candidates.find(c => row[c]) || null
}

const getProductTotalStock = (product: any) => {
  if (product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0) {
    return Object.values(product.stock_by_diopter as Record<string, number>)
      .reduce((sum, qty) => sum + (qty || 0), 0)
  }
  return product.stock_quantity || 0
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    customers: 0,
    outstandingBalance: 0,
    lowStockItems: 0,
    thisMonthInvoices: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: customers } = await supabase.from('customers').select('*')
      const { data: products } = await supabase.from('products').select('*')
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      // Outstanding balance = sum of every customer's previous_balance (same source as Payments page)
      const outstandingBalance = (customers || []).reduce(
        (sum, c) => sum + (c.previous_balance || 0), 0
      )

      // Low stock = products whose total stock (diopter sum or simple quantity) is below threshold
      const lowStockItems = (products || []).filter(
        p => getProductTotalStock(p) < LOW_STOCK_THRESHOLD
      ).length

      // This month invoices — detect the date column name safely, don't guess wrong numbers
      let thisMonthInvoices = 0
      const { data: invoicesData, error: invoicesError } = await supabase.from('invoices').select('*')
      if (!invoicesError && invoicesData && invoicesData.length > 0) {
        const dateField = detectDateField(invoicesData[0])
        if (dateField) {
          const now = new Date()
          thisMonthInvoices = invoicesData.filter(inv => {
            const d = new Date(inv[dateField])
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length
        } else {
          console.warn('Could not detect a date field on invoices table; showing 0 instead of a guessed count.')
        }
      }

      setStats({
        customers: customers?.length || 0,
        outstandingBalance,
        lowStockItems,
        thisMonthInvoices
      })

      setRecentActivity(
        (payments || []).map(p => {
          const customerName = (customers || []).find(c => c.id === p.customer_id)?.name || 'Unknown'
          return {
            label: `Payment received: PKR ${(p.amount || 0).toLocaleString()} from ${customerName}`,
            timeAgo: timeAgo(p.created_at),
            timestamp: new Date(p.created_at).getTime()
          }
        })
      )
    } catch (err: any) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-base">Overview of your IOL business</p>
        </div>
        <div className="text-right text-sm md:text-base text-gray-600">
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Metrics Grid - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Total Customers */}
        <button
          onClick={() => onNavigate('customers')}
          className="text-left bg-white rounded-lg border border-gray-200 p-6 md:p-8 hover:shadow-md transition"
        >
          <p className="text-xs md:text-sm text-gray-600 font-medium mb-2 md:mb-3">Total Customers</p>
          <p className="text-4xl md:text-5xl font-bold text-gray-900">{stats.customers}</p>
          <p className="text-xs text-gray-500 mt-3">Active customers in system</p>
        </button>

        {/* Outstanding Balance */}
        <button
          onClick={() => onNavigate('payments')}
          className="text-left bg-white rounded-lg border border-gray-200 p-6 md:p-8 hover:shadow-md transition"
        >
          <p className="text-xs md:text-sm text-gray-600 font-medium mb-2 md:mb-3">Outstanding Balance</p>
          <p className="text-4xl md:text-5xl font-bold text-red-600">
            PKR {stats.outstandingBalance.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-3">Total amount pending</p>
        </button>

        {/* Low Stock Items */}
        <button
          onClick={() => onNavigate('products')}
          className="text-left bg-white rounded-lg border border-gray-200 p-6 md:p-8 hover:shadow-md transition"
        >
          <p className="text-xs md:text-sm text-gray-600 font-medium mb-2 md:mb-3">Low Stock Items</p>
          <p className="text-4xl md:text-5xl font-bold text-gray-900">{stats.lowStockItems}</p>
          <p className="text-xs text-gray-500 mt-3">Need immediate attention</p>
        </button>

        {/* This Month Invoices */}
        <button
          onClick={() => onNavigate('invoices')}
          className="text-left bg-white rounded-lg border border-gray-200 p-6 md:p-8 hover:shadow-md transition"
        >
          <p className="text-xs md:text-sm text-gray-600 font-medium mb-2 md:mb-3">This Month Invoices</p>
          <p className="text-4xl md:text-5xl font-bold text-gray-900">{stats.thisMonthInvoices}</p>
          <p className="text-xs text-gray-500 mt-3">Invoices created</p>
        </button>
      </div>

      {/* Quick Actions & Recent Activity - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Quick Actions</h3>
          <div className="space-y-2 md:space-y-3">
            <button
              onClick={() => onNavigate('quotations')}
              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 md:py-4 px-4 rounded-lg font-medium text-center transition active:scale-95"
            >
              New Quotation
            </button>
            <button
              onClick={() => onNavigate('customers')}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 md:py-4 px-4 rounded-lg font-medium text-center transition active:scale-95"
            >
              New Customer
            </button>
            <button
              onClick={() => onNavigate('payments')}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 md:py-4 px-4 rounded-lg font-medium text-center transition active:scale-95"
            >
              Record Payment
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Recent Activity</h3>
          <div className="space-y-4 md:space-y-6">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500">No recent activity yet.</p>
            )}
            {recentActivity.map((item, idx) => (
              <div
                key={idx}
                className={idx < recentActivity.length - 1 ? 'pb-4 md:pb-6 border-b border-gray-200' : ''}
              >
                <p className="font-medium text-gray-900 text-sm md:text-base">{item.label}</p>
                <p className="text-xs md:text-sm text-gray-500 mt-1">{item.timeAgo}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
