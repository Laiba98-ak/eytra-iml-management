import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Quotations from './pages/Quotations'
import Invoices from './pages/Invoices'
import DeliveryOrders from './pages/DeliveryOrders'
import Payments from './pages/Payments'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (!window.confirm('Log out?')) return
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />
      case 'customers': return <Customers />
      case 'products': return <Products />
      case 'quotations': return <Quotations />
      case 'invoices': return <Invoices />
      case 'delivery-orders': return <DeliveryOrders />
      case 'payments': return <Payments />
      default: return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customers' },
    { id: 'products', label: 'Products' },
    { id: 'quotations', label: 'Quotations' },
    { id: 'delivery-orders', label: 'Delivery Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' }
  ]

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">EYTRA</h1>
          <p className="text-sm text-gray-600 mt-1">IML Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center gap-3 ${
                currentPage === item.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <p>v1.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg md:text-xl text-gray-900 font-medium">Welcome back, {session.user.email}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={handleLogout}
              title="Log out"
              className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-sm font-bold text-blue-700 hover:bg-blue-300 transition"
            >
              {session.user.email.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 md:hidden z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">EYTRA</h1>
              <p className="text-sm text-gray-600 mt-1">IML Management</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center gap-3 ${
                    currentPage === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
