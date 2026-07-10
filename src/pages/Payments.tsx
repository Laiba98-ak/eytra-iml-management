import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Customer {
  id: string
  name: string
  type: string
  previous_balance: number
}

interface Payment {
  id: string
  customer_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string
  created_at: string
}

// Formats a 'YYYY-MM-DD' string without letting JS reinterpret it as UTC
// (new Date('2026-07-03') shifts by a day in some timezones — this avoids that).
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB')
}

// Today's date as 'YYYY-MM-DD' using LOCAL date parts (toISOString() uses UTC,
// which rolls the date backward/forward depending on timezone — this avoids that).
const getTodayDateString = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Payments() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    amount: 0,
    date: getTodayDateString(),
    paymentMethod: '',
    notes: ''
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('*')
      const { data: paymentsData } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
      
      setCustomers(customersData || [])
      setPayments(paymentsData || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customerId })
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
  }

  const handlePayment = async () => {
    if (!formData.customerId) {
      alert('Please select a customer')
      return
    }
    if (formData.amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (!selectedCustomer) {
      alert('Customer not found')
      return
    }

    setLoading(true)
    try {
      // Insert payment record FIRST — if this fails, the customer's balance is never touched.
      const { error: insertError } = await supabase
        .from('payments')
        .insert([
          {
            customer_id: formData.customerId,
            amount: formData.amount,
            payment_date: formData.date,
            payment_method: formData.paymentMethod || null,
            notes: formData.notes || null
          }
        ])

      if (insertError) throw insertError

      // Only deduct the balance once the payment record is safely saved
      const currentBalance = selectedCustomer.previous_balance || 0
      const newBalance = Math.max(0, currentBalance - formData.amount)

      const { error: updateError } = await supabase
        .from('customers')
        .update({ previous_balance: newBalance })
        .eq('id', formData.customerId)

      if (updateError) throw updateError

      alert(`Payment of PKR ${formData.amount.toLocaleString()} recorded for ${selectedCustomer.name}!`)
      handleReset()
      fetchData()
    } catch (err: any) {
      console.error('Error:', err)
      alert(`Failed to record payment: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setShowForm(false)
    setFormData({
      customerId: '',
      amount: 0,
      date: getTodayDateString(),
      paymentMethod: '',
      notes: ''
    })
    setSelectedCustomer(null)
  }

  const handleDeletePayment = async (payment: Payment) => {
    if (!window.confirm(`Delete this payment of PKR ${payment.amount.toLocaleString()}? This amount will be added back to the customer's outstanding balance.`)) return

    try {
      const { error: deleteError } = await supabase.from('payments').delete().eq('id', payment.id)
      if (deleteError) throw deleteError

      const customer = customers.find(c => c.id === payment.customer_id)
      if (customer) {
        const restoredBalance = (customer.previous_balance || 0) + payment.amount
        const { error: updateError } = await supabase
          .from('customers')
          .update({ previous_balance: restoredBalance })
          .eq('id', customer.id)
        if (updateError) throw updateError
      }

      alert('Payment deleted and balance restored.')
      fetchData()
    } catch (err: any) {
      console.error('Error deleting payment:', err)
      alert(`Failed to delete payment: ${err?.message || JSON.stringify(err)}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-2">Manage customer payments and balances</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Record Payment
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Record Customer Payment</h3>
          </div>

          <div className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Customer</label>
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Balance: PKR {(c.previous_balance || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Balance Display */}
            {selectedCustomer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Current Balance:</span>
                  <span className="text-lg font-bold text-gray-900">PKR {(selectedCustomer.previous_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Payment Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">PKR</span>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: Number(e.target.value) || 0})}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  min="0"
                />
              </div>
              {selectedCustomer && formData.amount > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Remaining Balance: PKR {Math.max(0, (selectedCustomer.previous_balance || 0) - formData.amount).toLocaleString()}
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Payment Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Payment Method</label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cash, Bank Transfer, Cheque"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="Any additional notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Balances */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold">Customer Balances</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className={customer.previous_balance > 0 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.type}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={customer.previous_balance > 0 ? 'font-bold text-red-600' : 'text-green-600'}>
                      PKR {(customer.previous_balance || 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Method</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateDisplay(payment.payment_date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {customers.find(c => c.id === payment.customer_id)?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      PKR {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.payment_method || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeletePayment(payment)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showForm && payments.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No payments recorded yet.</p>
        </div>
      )}
    </div>
  )
}
