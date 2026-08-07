import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Customer {
  id: string
  name: string
  type: string
  email?: string
  phone?: string
  previous_balance: number
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Doctor',
    email: '',
    phone: '',
    previousBalance: 0
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, typeFilter, searchTerm])

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('name')
      setCustomers(data || [])
    } catch (err: any) {
      console.error('Error:', err)
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    if (typeFilter !== 'All Types') {
      filtered = filtered.filter(c => c.type === typeFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCustomers(filtered)
  }

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert('Please enter customer name')
      return
    }

    setLoading(true)
    try {
      if (editingCustomerId) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            type: formData.type,
            email: formData.email || null,
            phone: formData.phone || null,
            previous_balance: formData.previousBalance
          })
          .eq('id', editingCustomerId)

        if (error) throw error

        alert(`Customer ${formData.name} updated successfully!`)
      } else {
        const { error } = await supabase.from('customers').insert([
          {
            name: formData.name,
            type: formData.type,
            email: formData.email || null,
            phone: formData.phone || null,
            previous_balance: 0
          }
        ])

        if (error) throw error

        alert(`Customer ${formData.name} added successfully!`)
      }

      handleCancelForm()
      fetchCustomers()
    } catch (err: any) {
      console.error('Error:', err)
      alert(`Failed to save customer: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id)
    setFormData({
      name: customer.name,
      type: customer.type,
      email: customer.email || '',
      phone: customer.phone || '',
      previousBalance: customer.previous_balance || 0
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCustomerId(null)
    setFormData({ name: '', type: 'Doctor', email: '', phone: '', previousBalance: 0 })
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm('Delete this customer?')) return

    try {
      const { error } = await supabase.from('customers').delete().eq('id', customerId)
      if (error) throw error
      alert('Customer deleted!')
      fetchCustomers()
    } catch (err: any) {
      console.error('Error:', err)
      const isFkViolation = err?.code === '23503'
      alert(isFkViolation
        ? 'This customer has saved invoices/quotations/delivery orders or payments and can\'t be deleted.'
        : `Failed to delete customer: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const totalCustomers = customers.length
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.previous_balance || 0), 0)
  const withBalance = customers.filter(c => (c.previous_balance || 0) > 0).length

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Doctor':
        return 'bg-blue-100 text-blue-700'
      case 'Hospital':
        return 'bg-green-100 text-green-700'
      case 'Clinic':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">Manage your doctors, hospitals and clinics</p>
      </div>

      {/* Filter and Add Section */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-48 border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>All Types</option>
            <option>Doctor</option>
            <option>Hospital</option>
            <option>Clinic</option>
          </select>
          <button
            onClick={() => {
              setEditingCustomerId(null)
              setFormData({ name: '', type: 'Doctor', email: '', phone: '', previousBalance: 0 })
              setShowForm(true)
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Add<br/>Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Total Outstanding</p>
          <p className="text-3xl font-bold text-gray-900">PKR {totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Customers With a Balance</p>
          <p className="text-3xl font-bold text-gray-900">{withBalance}</p>
        </div>
      </div>

      {/* Add/Edit Customer Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold mb-6">{editingCustomerId ? 'Edit Customer' : 'Add New Customer'}</h3>
          <form onSubmit={handleSubmitCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Doctor</option>
                  <option>Hospital</option>
                  <option>Clinic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+92-XXX-XXXXXXX"
                />
              </div>
              {editingCustomerId && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Outstanding Balance (PKR)</label>
                  <input
                    type="number"
                    value={formData.previousBalance === 0 ? '' : formData.previousBalance}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') { setFormData({...formData, previousBalance: 0}); return }
                      const num = Number(val)
                      if (!isNaN(num)) setFormData({...formData, previousBalance: Math.max(0, num)})
                    }}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Manual correction only — normally this updates automatically from invoices and payments.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : editingCustomerId ? 'Update Customer' : 'Add Customer'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Balance</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(customer.type)}`}>
                      {customer.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      PKR {(customer.previous_balance || 0).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-3">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
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

      {filteredCustomers.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No customers found. Click "Add Customer" to create one.</p>
        </div>
      )}
    </div>
  )
}
