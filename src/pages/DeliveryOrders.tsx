import { useEffect, useState } from 'react'

interface Customer {
  id: string
  name: string
  type: string
  email?: string
  phone?: string
  address?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  stock_by_diopter?: Record<string, number>
}

interface DeliveryItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  diopter: string
  productName: string
}

interface SavedDeliveryOrder {
  id: string
  document_number: string
  customer_id: string
  po_number: string
  document_date: string
  delivery_date: string
  status: string
  subtotal: number
  total: number
  notes: string
  created_at: string
}

import { supabase } from '../lib/supabaseClient'

// Formats a 'YYYY-MM-DD' string without letting JS reinterpret it as UTC
// (new Date('2026-07-03') shifts by a day in some timezones — this avoids that).
const formatDateDisplay = (dateStr: string, style: 'numeric' | 'short' = 'numeric') => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return style === 'numeric'
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : date.toLocaleDateString('en-GB')
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

export default function DeliveryOrders() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [items, setItems] = useState<DeliveryItem[]>([])
  const [savedDeliveryOrders, setSavedDeliveryOrders] = useState<SavedDeliveryOrder[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    customerId: '',
    poNumber: '',
    date: getTodayDateString(),
    notes: ''
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [serialNumber, setSerialNumber] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }
  const [showSavedView, setShowSavedView] = useState(false)
  const [viewingDO, setViewingDO] = useState<SavedDeliveryOrder | null>(null)
  const [viewingItems, setViewingItems] = useState<any[]>([])
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => {
    fetchData()
    generateSerialNumber()
  }, [])

  const fetchData = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('*')
      const { data: productsData } = await supabase.from('products').select('*')
      const { data: doData } = await supabase.from('delivery_orders').select('*').order('created_at', { ascending: false })
      const { data: itemRows } = await supabase.from('delivery_order_items').select('delivery_order_id')

      const counts: Record<string, number> = {}
      ;(itemRows || []).forEach((row: any) => {
        counts[row.delivery_order_id] = (counts[row.delivery_order_id] || 0) + 1
      })

      setCustomers(customersData || [])
      setProducts(productsData || [])
      setSavedDeliveryOrders(doData || [])
      setItemCounts(counts)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const isDiopterProduct = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return !!(product?.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0)
  }

  const getProductDiopters = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product?.stock_by_diopter) return []
    return Object.keys(product.stock_by_diopter).sort((a, b) => parseFloat(a) - parseFloat(b))
  }

  const getLiveMaxDocumentNumber = async () => {
    const [{ data: invRows }, { data: quotRows }, { data: doRows }] = await Promise.all([
      supabase.from('invoices').select('document_number'),
      supabase.from('quotations').select('document_number'),
      supabase.from('delivery_orders').select('document_number')
    ])

    const allNumbers = [
      ...(invRows || []).map((r: any) => parseInt((r.document_number || '').split('-').pop() || '0', 10)),
      ...(quotRows || []).map((r: any) => parseInt((r.document_number || '').split('-').pop() || '0', 10)),
      ...(doRows || []).map((r: any) => parseInt((r.document_number || '').split('-').pop() || '0', 10))
    ].filter(n => !isNaN(n))

    return Math.max(199, ...allNumbers)
  }

  const generateSerialNumber = async () => {
    try {
      const { data: counters } = await supabase.from('document_counters').select('*')
      const doCounter = counters?.find(c => c.counter_type === 'delivery_order')
      const liveMax = await getLiveMaxDocumentNumber()

      if (doCounter) {
        setSerialNumber(`${doCounter.prefix}-${liveMax + 1}`)
      } else {
        setSerialNumber('DO-ERA-200')
      }
    } catch (err) {
      console.error('Error generating preview number:', err)
      setSerialNumber('')
    }
  }

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), productId: '', quantity: 1, unitPrice: 0, diopter: '', productName: '' }])
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'productId') {
          const product = products.find(p => p.id === value)
          const validDiopters = getProductDiopters(value)
          return {
            ...item,
            productId: value,
            productName: product?.name || '',
            diopter: validDiopters.length > 0 ? validDiopters[0] : ''
          }
        }
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const subtotal = calculateSubtotal()

  const handleCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customerId })
    const customer = customers.find(c => c.id === customerId)
    setSelectedCustomer(customer || null)
  }

  const handlePreview = () => {
    if (!formData.customerId) {
      alert('Please select a customer')
      return
    }
    if (!formData.poNumber) {
      alert('Please enter Purchase Order Number')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }
    setShowPreview(true)
  }

  const handleSave = async () => {
    if (!formData.customerId) {
      alert('Please select a customer')
      return
    }
    if (!formData.poNumber) {
      alert('Please enter Purchase Order Number')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))]
    if (productIds.length === 0) {
      alert('Please select a product for every item before saving.')
      return
    }

    setLoading(true)
    try {
      const { data: fullProducts, error: productsFetchError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      if (productsFetchError) throw productsFetchError

      // Claim the next number based on what's ACTUALLY in use right now across
      // Invoice + Quotation + Delivery Order — self-healing regardless of delete order.
      const { data: allCounters, error: counterFetchError } = await supabase
        .from('document_counters')
        .select('*')

      if (counterFetchError) throw counterFetchError

      const doCounter = allCounters?.find(c => c.counter_type === 'delivery_order')
      if (!doCounter) throw new Error("document_counters is missing a row for counter_type 'delivery_order'")

      const liveMax = await getLiveMaxDocumentNumber()
      const nextNumber = liveMax + 1
      const documentNumber = `${doCounter.prefix}-${nextNumber}`

      const { error: counterUpdateError } = await supabase
        .from('document_counters')
        .update({ last_number: nextNumber })
        .eq('id', doCounter.id)

      if (counterUpdateError) throw counterUpdateError

      // NOTE: Delivery Orders never deduct stock — stock is only deducted when an Invoice is saved.
      const { data: savedDO, error: doError } = await supabase
        .from('delivery_orders')
        .insert([{
          document_number: documentNumber,
          customer_id: formData.customerId,
          po_number: formData.poNumber,
          document_date: formData.date,
          delivery_date: formData.date,
          subtotal: subtotal,
          tax_percentage: 0,
          tax_amount: 0,
          total: subtotal,
          status: 'Confirmed',
          notes: formData.notes
        }])
        .select()
        .single()

      if (doError) throw doError

      const doItemRows = items.map(item => {
        const product = fullProducts?.find(p => p.id === item.productId)
        const isDiopterProd = product?.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0
        return {
          delivery_order_id: savedDO.id,
          product_id: item.productId,
          product_name_snapshot: item.productName,
          product_sku_snapshot: product?.sku || null,
          diopter_snapshot: isDiopterProd ? parseFloat(item.diopter) : null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.quantity * item.unitPrice
        }
      })

      const { error: itemsError } = await supabase.from('delivery_order_items').insert(doItemRows)
      if (itemsError) throw itemsError

      showToast(`Delivery Order ${documentNumber} saved successfully!`)
      setJustSaved(true)
      fetchData()
    } catch (err) {
      console.error('Error saving:', err)
      alert(`Failed to save delivery order: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (doId: string) => {
    if (!window.confirm('Delete this delivery order?')) return

    try {
      await supabase.from('delivery_order_items').delete().eq('delivery_order_id', doId)

      const { error } = await supabase.from('delivery_orders').delete().eq('id', doId)
      if (error) throw error

      // No manual counter rollback needed — the next document created will automatically
      // pick up the correct next number by checking what's actually still in use.

      showToast('Delivery Order deleted!')
      fetchData()
      generateSerialNumber()
    } catch (err) {
      console.error('Error deleting:', err)
      alert(`Failed to delete delivery order: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const handleViewDO = async (doId: string) => {
    setViewLoading(true)
    try {
      const deliveryOrder = savedDeliveryOrders.find(d => d.id === doId)
      if (!deliveryOrder) {
        alert('Delivery order not found')
        return
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from('delivery_order_items')
        .select('*')
        .eq('delivery_order_id', doId)

      if (itemsError) throw itemsError

      let customer = customers.find(c => c.id === deliveryOrder.customer_id) || null
      if (!customer) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', deliveryOrder.customer_id)
          .single()
        customer = customerData || null
      }

      setViewingDO(deliveryOrder)
      setViewingItems(itemRows || [])
      setViewingCustomer(customer)
      setShowSavedView(true)
    } catch (err) {
      console.error('Error loading delivery order:', err)
      alert(`Failed to open delivery order: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setViewLoading(false)
    }
  }

  const closeSavedView = () => {
    setShowSavedView(false)
    setViewingDO(null)
    setViewingItems([])
    setViewingCustomer(null)
  }

  const handleReset = () => {
    setShowForm(false)
    setShowPreview(false)
    setJustSaved(false)
    setItems([])
    setFormData({
      customerId: '',
      poNumber: '',
      date: getTodayDateString(),
      notes: ''
    })
    setSelectedCustomer(null)
    generateSerialNumber()
  }

  const downloadPDF = async (filename?: string) => {
    try {
      const element = document.getElementById('delivery-order-document')
      if (!element) return

      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')
      
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${filename || serialNumber}.pdf`)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('PDF download failed')
    }
  }

  const shareDeliveryOrder = async (filename?: string) => {
    try {
      const element = document.getElementById('delivery-order-document')
      if (!element) return

      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

      const pdfBlob = pdf.output('blob')
      const finalName = `${filename || serialNumber}.pdf`
      const file = new File([pdfBlob], finalName, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: finalName,
          text: `Delivery Order ${filename || serialNumber} from EYTRA`
        })
      } else {
        pdf.save(finalName)
        alert('Direct share isn\'t supported on this device/browser — the PDF has been downloaded instead. Please attach it in WhatsApp manually.')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share error:', err)
        alert('Sharing failed')
      }
    }
  }

  if (showSavedView && viewingDO && viewingCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div id="delivery-order-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex justify-between items-center mb-8 pb-8 border-b-2 border-gray-800">
              <div className="flex items-center gap-0">
                <img src="/eytra-logo.png" alt="EYTRA Logo" className="h-48 w-48 object-contain flex-shrink-0" />
                <div className="-ml-6">
                  <h1 className="text-5xl font-bold text-gray-900">EYTRA</h1>
                  <p className="text-sm text-gray-600 mt-2 leading-tight">Deals in Intraocular Lenses<br/>and Medical Equipment</p>
                  <p className="text-base text-gray-700 font-semibold mt-2">Ntn no: 8212989-3</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery Order</h2>
                <p className="text-sm text-gray-900"><span className="font-bold">Serial No:</span> {viewingDO.document_number}</p>
                <p className="text-sm text-gray-900"><span className="font-bold">Date:</span> {formatDateDisplay(viewingDO.document_date)}</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="font-bold text-gray-900 mb-2">To:</p>
              <p className="text-gray-900 font-semibold">{viewingCustomer.name}</p>
              <p className="text-gray-600 text-sm">{viewingCustomer.type}</p>
              {viewingCustomer.address && <p className="text-gray-600 text-sm">{viewingCustomer.address}</p>}
              {viewingCustomer.email && <p className="text-gray-600 text-sm">{viewingCustomer.email}</p>}
              {viewingCustomer.phone && <p className="text-gray-600 text-sm">{viewingCustomer.phone}</p>}
            </div>

            <div className="mb-8 bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm text-gray-600"><span className="font-bold">Purchase Order No:</span> {viewingDO.po_number}</p>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 underline">Delivery Order</h3>
            </div>
          </div>

          <div className="mb-12">
            <table className="w-full border-collapse border border-gray-800">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-3 py-2 text-left text-sm font-bold text-gray-900 w-12">Sr No.</th>
                  <th className="border border-gray-800 px-3 py-2 text-left text-sm font-bold text-gray-900">Description</th>
                  <th className="border border-gray-800 px-3 py-2 text-center text-sm font-bold text-gray-900 w-24">Quantity</th>
                  <th className="border border-gray-800 px-3 py-2 text-right text-sm font-bold text-gray-900 w-32">Unit Price</th>
                  <th className="border border-gray-800 px-3 py-2 text-right text-sm font-bold text-gray-900 w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewingItems.map((item, idx) => (
                  <tr key={item.id} className="border border-gray-800">
                    <td className="border border-gray-800 px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                    <td className="border border-gray-800 px-3 py-2 text-sm text-gray-900">
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      {item.diopter_snapshot != null && <p className="text-xs text-gray-600">Diopter: {item.diopter_snapshot} D</p>}
                    </td>
                    <td className="border border-gray-800 px-3 py-2 text-center text-sm text-gray-900">{item.quantity}</td>
                    <td className="border border-gray-800 px-3 py-2 text-right text-sm text-gray-900">Rs. {Number(item.unit_price).toLocaleString()}</td>
                    <td className="border border-gray-800 px-3 py-2 text-right text-sm text-gray-900">Rs. {Number(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border border-gray-800 bg-gray-50">
                  <td colSpan={4} className="border border-gray-800 px-3 py-2 text-right font-bold text-gray-900">TOTAL</td>
                  <td className="border border-gray-800 px-3 py-2 text-right font-bold text-gray-900">Rs. {Number(viewingDO.total).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="font-bold text-gray-900 mb-12">Authorized By:</p>
              <p className="text-gray-900 font-semibold">EYTRA</p>
              <p className="text-gray-600 text-sm">Lahore</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-4">Acknowledgement By Hospital:</p>
              <p className="text-sm text-gray-700 mb-6">We hereby confirm receipt of above-mentioned goods in good condition.</p>
              <p className="font-bold text-gray-900 mb-4 mt-8">Received By (Hospital Use Only):</p>
              <div className="space-y-4 text-sm">
                <div><p className="text-gray-600">Name: _______________________________</p></div>
                <div><p className="text-gray-600">Designation: _______________________________</p></div>
                <div><p className="text-gray-600">Signature & Stamp: _______________________________</p></div>
                <div><p className="text-gray-600">Date: _______________________________</p></div>
              </div>
            </div>
          </div>

          {viewingDO.notes && (
            <div className="mb-8">
              <p className="font-bold text-gray-900 mb-2">Terms and conditions:</p>
              <p className="text-sm text-gray-700">• {viewingDO.notes}</p>
            </div>
          )}

          <div className="border-t-2 border-gray-800 pt-6">
            <div className="flex gap-4 text-sm">
              <p className="text-gray-700">0336-0402870  0308-4488421</p>
              <p className="text-gray-700">eytra.pk@gmail.com</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">BF-06 SQ99 MALL AND APPARTMENT 1C-8C NISHTAR BLOCK</p>
            <p className="text-xs text-gray-600">MAIN BOULEVARD BAHRIA TOWN LAHORE</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8 flex gap-4">
          <button
            onClick={() => downloadPDF(viewingDO.document_number)}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => shareDeliveryOrder(viewingDO.document_number)}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            Share
          </button>
          <button
            onClick={closeSavedView}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Back to List
          </button>
        </div>
      </div>
    )
  }

  if (showPreview && selectedCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div id="delivery-order-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          {/* Header with Logo and Details */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-8 pb-8 border-b-2 border-gray-800">
              <div className="flex items-center gap-0">
                <img src="/eytra-logo.png" alt="EYTRA Logo" className="h-48 w-48 object-contain flex-shrink-0" />
                <div className="-ml-6">
                  <h1 className="text-5xl font-bold text-gray-900">EYTRA</h1>
                  <p className="text-sm text-gray-600 mt-2 leading-tight">Deals in Intraocular Lenses<br/>and Medical Equipment</p>
                  <p className="text-base text-gray-700 font-semibold mt-2">Ntn no: 8212989-3</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery Order</h2>
                <p className="text-sm text-gray-900"><span className="font-bold">Serial No:</span> {serialNumber}</p>
                <p className="text-sm text-gray-900"><span className="font-bold">Date:</span> {formatDateDisplay(formData.date)}</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="font-bold text-gray-900 mb-2">To:</p>
              <p className="text-gray-900 font-semibold">{selectedCustomer.name}</p>
              <p className="text-gray-600 text-sm">{selectedCustomer.type}</p>
              {selectedCustomer.address && <p className="text-gray-600 text-sm">{selectedCustomer.address}</p>}
              {selectedCustomer.email && <p className="text-gray-600 text-sm">{selectedCustomer.email}</p>}
              {selectedCustomer.phone && <p className="text-gray-600 text-sm">{selectedCustomer.phone}</p>}
            </div>

            <div className="mb-8 bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm text-gray-600"><span className="font-bold">Purchase Order No:</span> {formData.poNumber}</p>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 underline">Delivery Order</h3>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-12">
            <table className="w-full border-collapse border border-gray-800">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-3 py-2 text-left text-sm font-bold text-gray-900 w-12">Sr No.</th>
                  <th className="border border-gray-800 px-3 py-2 text-left text-sm font-bold text-gray-900">Description</th>
                  <th className="border border-gray-800 px-3 py-2 text-center text-sm font-bold text-gray-900 w-24">Quantity</th>
                  <th className="border border-gray-800 px-3 py-2 text-right text-sm font-bold text-gray-900 w-32">Unit Price</th>
                  <th className="border border-gray-800 px-3 py-2 text-right text-sm font-bold text-gray-900 w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border border-gray-800">
                    <td className="border border-gray-800 px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                    <td className="border border-gray-800 px-3 py-2 text-sm text-gray-900">
                      <p className="font-medium">{item.productName}</p>
                      {isDiopterProduct(item.productId) && <p className="text-xs text-gray-600">Diopter: {item.diopter} D</p>}
                    </td>
                    <td className="border border-gray-800 px-3 py-2 text-center text-sm text-gray-900">{item.quantity}</td>
                    <td className="border border-gray-800 px-3 py-2 text-right text-sm text-gray-900">Rs. {item.unitPrice.toLocaleString()}</td>
                    <td className="border border-gray-800 px-3 py-2 text-right text-sm text-gray-900">Rs. {(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border border-gray-800 bg-gray-50">
                  <td colSpan={4} className="border border-gray-800 px-3 py-2 text-right font-bold text-gray-900">TOTAL</td>
                  <td className="border border-gray-800 px-3 py-2 text-right font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Authorized By & Acknowledgement */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="font-bold text-gray-900 mb-12">Authorized By:</p>
              <p className="text-gray-900 font-semibold">EYTRA</p>
              <p className="text-gray-600 text-sm">Lahore</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-4">Acknowledgement By Hospital:</p>
              <p className="text-sm text-gray-700 mb-6">We hereby confirm receipt of above-mentioned goods in good condition.</p>
              <p className="font-bold text-gray-900 mb-4 mt-8">Received By (Hospital Use Only):</p>
              <div className="space-y-4 text-sm">
                <div><p className="text-gray-600">Name: _______________________________</p></div>
                <div><p className="text-gray-600">Designation: _______________________________</p></div>
                <div><p className="text-gray-600">Signature & Stamp: _______________________________</p></div>
                <div><p className="text-gray-600">Date: _______________________________</p></div>
              </div>
            </div>
          </div>

          {formData.notes && (
            <div className="mb-8">
              <p className="font-bold text-gray-900 mb-2">Terms and conditions:</p>
              <p className="text-sm text-gray-700">• {formData.notes}</p>
            </div>
          )}

          <div className="border-t-2 border-gray-800 pt-6">
            <div className="flex gap-4 text-sm">
              <p className="text-gray-700">0336-0402870  0308-4488421</p>
              <p className="text-gray-700">eytra.pk@gmail.com</p>
            </div>
            <p className="text-xs text-gray-600 mt-2">BF-06 SQ99 MALL AND APPARTMENT 1C-8C NISHTAR BLOCK</p>
            <p className="text-xs text-gray-600">MAIN BOULEVARD BAHRIA TOWN LAHORE</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto mt-8 flex gap-4">
          <button
            onClick={() => downloadPDF()}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => shareDeliveryOrder()}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            Share
          </button>
          {!justSaved && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Delivery Order'}
            </button>
          )}
          <button
            onClick={() => justSaved ? handleReset() : setShowPreview(false)}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            {justSaved ? 'Back to List' : 'Back to Editor'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg text-sm max-w-sm">
          {toast}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Orders</h1>
          <p className="text-gray-600 mt-2">Create and manage delivery orders</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + New Delivery Order
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Create New Delivery Order</h3>
            <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{serialNumber}</span>
          </div>

          <div className="space-y-8">
            {/* Customer Section */}
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Purchase Order Number */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Purchase Order Number</label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., PO-001, PO-2026-123"
                required
              />
            </div>

            {/* Date Section */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Items</h4>
                {items.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-lg">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">No items added yet</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600 font-medium block mb-1">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        {isDiopterProduct(item.productId) && (
                          <div>
                            <label className="text-xs text-gray-600 font-medium block mb-1">Diopter</label>
                            <select
                              value={item.diopter}
                              onChange={(e) => updateItem(item.id, 'diopter', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {getProductDiopters(item.productId).map(d => (
                                <option key={d} value={d}>{d} D</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-600 font-medium block mb-1">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(item.id, 'quantity', val === '' ? 1 : Math.max(1, Number(val)));
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 font-medium block mb-1">Unit Price</label>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-full text-red-600 hover:text-red-700 font-medium text-sm py-2 px-3 border border-red-200 rounded hover:bg-red-50 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={addItem}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                + Add Item
              </button>
            </div>

            {/* Total Summary */}
            {items.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">Rs. {subtotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="e.g., Terms and conditions"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handlePreview}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Preview
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

      {/* Saved Delivery Orders List */}
      {!showForm && savedDeliveryOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold">Saved Delivery Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Serial Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">PO Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {savedDeliveryOrders.map((do_) => (
                  <tr key={do_.id}>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{do_.document_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customers.find(c => c.id === do_.customer_id)?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{do_.po_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateDisplay(do_.document_date, 'short')}</td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button
                        onClick={() => handleViewDO(do_.id)}
                        disabled={viewLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:text-gray-400"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(do_.id)}
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

      {!showForm && savedDeliveryOrders.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No delivery orders yet. Click "New Delivery Order" to create one.</p>
        </div>
      )}
    </div>
  )
}
