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

interface QuotationItem {
  id: string
  productId: string
  diopter: string
  quantity: number
  unitPrice: number
  productName: string
}

interface SavedQuotation {
  id: string
  document_number: string
  customer_id: string
  document_date: string
  valid_until: string
  subtotal: number
  total: number
  status: string
  notes: string
  created_at: string
}

import { supabase } from '../lib/supabaseClient'

// Formats/parses a 'YYYY-MM-DD' string without letting JS reinterpret it as UTC
// (new Date('2026-07-03') shifts by a day in some timezones — this avoids that).
const parseDateSafe = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatDateDisplay = (dateStr: string, style: 'long' | 'short' = 'long') => {
  if (!dateStr) return ''
  const date = parseDateSafe(dateStr)
  return style === 'long'
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : date.toLocaleDateString('en-GB')
}

const addDaysToDateString = (dateStr: string, days: number) => {
  const date = parseDateSafe(dateStr)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

export default function Quotations() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
  const [formData, setFormData] = useState({
    customerId: '',
    date: getTodayDateString(),
    notes: 'Valid for 30 days. Prices subject to change without notice. Payment terms as per company policy.'
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
  const [viewingQuotation, setViewingQuotation] = useState<SavedQuotation | null>(null)
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
      const { data: quotationsData } = await supabase.from('quotations').select('*').order('created_at', { ascending: false })
      const { data: itemRows } = await supabase.from('quotation_items').select('quotation_id')

      const counts: Record<string, number> = {}
      ;(itemRows || []).forEach((row: any) => {
        counts[row.quotation_id] = (counts[row.quotation_id] || 0) + 1
      })

      setCustomers(customersData || [])
      setProducts(productsData || [])
      setSavedQuotations(quotationsData || [])
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
      const quotationCounter = counters?.find(c => c.counter_type === 'quotation')
      const liveMax = await getLiveMaxDocumentNumber()

      if (quotationCounter) {
        setSerialNumber(`${quotationCounter.prefix}-${liveMax + 1}`)
      } else {
        setSerialNumber('ERA-200')
      }
    } catch (err) {
      console.error('Error generating preview number:', err)
      setSerialNumber('')
    }
  }

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), productId: '', diopter: '', quantity: 1, unitPrice: 0, productName: '' }])
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

      const quotationCounter = allCounters?.find(c => c.counter_type === 'quotation')
      if (!quotationCounter) throw new Error("document_counters is missing a row for counter_type 'quotation'")

      const liveMax = await getLiveMaxDocumentNumber()
      const nextNumber = liveMax + 1
      const documentNumber = `${quotationCounter.prefix}-${nextNumber}`

      const { error: counterUpdateError } = await supabase
        .from('document_counters')
        .update({ last_number: nextNumber })
        .eq('id', quotationCounter.id)

      if (counterUpdateError) throw counterUpdateError

      const validUntil = addDaysToDateString(formData.date, 30)

      const { data: savedQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          document_number: documentNumber,
          customer_id: formData.customerId,
          document_date: formData.date,
          valid_until: validUntil,
          subtotal: subtotal,
          tax_percentage: 0,
          tax_amount: 0,
          total: subtotal,
          status: 'Confirmed',
          notes: formData.notes
        }])
        .select()
        .single()

      if (quotationError) throw quotationError

      const quotationItemRows = items.map(item => {
        const product = fullProducts?.find(p => p.id === item.productId)
        const isDiopterProd = product?.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0
        return {
          quotation_id: savedQuotation.id,
          product_id: item.productId,
          product_name_snapshot: item.productName,
          product_sku_snapshot: product?.sku || null,
          diopter_snapshot: isDiopterProd ? parseFloat(item.diopter) : null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.quantity * item.unitPrice
        }
      })

      const { error: itemsError } = await supabase.from('quotation_items').insert(quotationItemRows)
      if (itemsError) throw itemsError

      showToast(`Quotation ${documentNumber} saved successfully!`)
      setJustSaved(true)
      fetchData()
    } catch (err) {
      console.error('Error saving:', err)
      alert(`Failed to save quotation: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (quotationId: string) => {
    if (!window.confirm('Delete this quotation?')) return

    try {
      await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)

      const { error } = await supabase.from('quotations').delete().eq('id', quotationId)
      if (error) throw error

      // No manual counter rollback needed — the next document created will automatically
      // pick up the correct next number by checking what's actually still in use.

      showToast('Quotation deleted!')
      fetchData()
      generateSerialNumber()
    } catch (err) {
      console.error('Error deleting:', err)
      alert(`Failed to delete quotation: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const handleViewQuotation = async (quotationId: string) => {
    setViewLoading(true)
    try {
      const quotation = savedQuotations.find(q => q.id === quotationId)
      if (!quotation) {
        alert('Quotation not found')
        return
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId)

      if (itemsError) throw itemsError

      let customer = customers.find(c => c.id === quotation.customer_id) || null
      if (!customer) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', quotation.customer_id)
          .single()
        customer = customerData || null
      }

      setViewingQuotation(quotation)
      setViewingItems(itemRows || [])
      setViewingCustomer(customer)
      setShowSavedView(true)
    } catch (err) {
      console.error('Error loading quotation:', err)
      alert(`Failed to open quotation: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setViewLoading(false)
    }
  }

  const closeSavedView = () => {
    setShowSavedView(false)
    setViewingQuotation(null)
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
      date: getTodayDateString(),
      notes: 'Valid for 30 days. Prices subject to change without notice. Payment terms as per company policy.'
    })
    setSelectedCustomer(null)
    generateSerialNumber()
  }

  const downloadPDF = async (filename?: string) => {
    try {
      const element = document.getElementById('quotation-document')
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

  const shareQuotation = async (filename?: string) => {
    try {
      const element = document.getElementById('quotation-document')
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
          text: `Quotation ${filename || serialNumber} from EYTRA`
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

  if (showSavedView && viewingQuotation && viewingCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div id="quotation-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12 pb-8 border-b-2 border-gray-800">
            <div className="flex items-center gap-0">
              <img src="/eytra-logo.png" alt="EYTRA Logo" className="h-48 w-48 object-contain flex-shrink-0" />
              <div className="-ml-6">
                <h1 className="text-5xl font-bold text-gray-900">EYTRA</h1>
                <p className="text-sm text-gray-600 mt-1 leading-tight">Deals in Intraocular Lenses<br/>and Medical Equipment</p>
                <p className="text-base text-gray-700 font-semibold mt-2">NTN no: 8212989-3</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">QUOTATION</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{viewingQuotation.document_number}</p>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDateDisplay(viewingQuotation.document_date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">BILL TO:</h3>
              <p className="font-semibold text-gray-900 text-lg">{viewingCustomer.name}</p>
              <p className="text-gray-600 text-sm mt-1">{viewingCustomer.type}</p>
              {viewingCustomer.address && <p className="text-gray-600 text-sm">{viewingCustomer.address}</p>}
              {viewingCustomer.email && <p className="text-gray-600 text-sm">{viewingCustomer.email}</p>}
              {viewingCustomer.phone && <p className="text-gray-600 text-sm">{viewingCustomer.phone}</p>}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">FROM:</h3>
              <p className="font-semibold text-gray-900">EYTRA</p>
              <p className="text-gray-600 text-sm">eytra.pk@gmail.com</p>
              <p className="text-gray-600 text-sm">0336-0402870 | 0308-4488421</p>
              <p className="text-gray-600 text-sm">Lahore, Pakistan</p>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-3 px-0 font-bold text-gray-900">Description</th>
                  <th className="text-center py-3 px-0 font-bold text-gray-900 w-20">Qty</th>
                  <th className="text-right py-3 px-0 font-bold text-gray-900 w-28">Unit Price</th>
                  <th className="text-right py-3 px-0 font-bold text-gray-900 w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewingItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-4 px-0 text-gray-900">
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      {item.diopter_snapshot != null && (
                        <p className="text-sm text-gray-600">Diopter: {item.diopter_snapshot} D</p>
                      )}
                    </td>
                    <td className="text-center py-4 px-0 text-gray-900">{item.quantity}</td>
                    <td className="text-right py-4 px-0 text-gray-900">PKR {Number(item.unit_price).toLocaleString()}</td>
                    <td className="text-right py-4 px-0 text-gray-900">PKR {Number(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="flex justify-between py-4 border-t-2 border-gray-800">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="text-2xl font-bold text-blue-600">PKR {Number(viewingQuotation.total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <p className="font-semibold text-gray-900 mb-2">Notes:</p>
            <p className="text-gray-700 text-sm">{viewingQuotation.notes}</p>
          </div>

          <div className="mb-12">
            <p className="font-bold text-gray-900 mb-3">Terms & Conditions:</p>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• This quotation is valid until {formatDateDisplay(viewingQuotation.valid_until)}.</li>
              <li>• Prices are subject to change without notice.</li>
              <li>• Payment terms: As per company policy.</li>
            </ul>
          </div>

          <div className="flex justify-between mt-16">
            <div>
              <p className="mb-8 h-10"></p>
              <p className="font-semibold text-gray-900">Customer Signature</p>
              <p className="text-sm text-gray-600">Authorized Person</p>
            </div>
            <div>
              <p className="mb-8 h-10"></p>
              <p className="font-semibold text-gray-900">Prepared By</p>
              <p className="text-sm text-gray-600">EYTRA Representative</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8 flex gap-4">
          <button
            onClick={() => downloadPDF(viewingQuotation.document_number)}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => shareQuotation(viewingQuotation.document_number)}
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
        <div id="quotation-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12 pb-8 border-b-2 border-gray-800">
            <div className="flex items-center gap-0">
              <img src="/eytra-logo.png" alt="EYTRA Logo" className="h-48 w-48 object-contain flex-shrink-0" />
              <div className="-ml-6">
                <h1 className="text-5xl font-bold text-gray-900">EYTRA</h1>
                <p className="text-sm text-gray-600 mt-1 leading-tight">Deals in Intraocular Lenses<br/>and Medical Equipment</p>
                <p className="text-base text-gray-700 font-semibold mt-2">NTN no: 8212989-3</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">QUOTATION</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{serialNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDateDisplay(formData.date)}</p>
            </div>
          </div>

          {/* Bill To / From */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">BILL TO:</h3>
              <p className="font-semibold text-gray-900 text-lg">{selectedCustomer.name}</p>
              <p className="text-gray-600 text-sm mt-1">{selectedCustomer.type}</p>
              {selectedCustomer.address && <p className="text-gray-600 text-sm">{selectedCustomer.address}</p>}
              {selectedCustomer.email && <p className="text-gray-600 text-sm">{selectedCustomer.email}</p>}
              {selectedCustomer.phone && <p className="text-gray-600 text-sm">{selectedCustomer.phone}</p>}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">FROM:</h3>
              <p className="font-semibold text-gray-900">EYTRA</p>
              <p className="text-gray-600 text-sm">eytra.pk@gmail.com</p>
              <p className="text-gray-600 text-sm">0336-0402870 | 0308-4488421</p>
              <p className="text-gray-600 text-sm">Lahore, Pakistan</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-3 px-0 font-bold text-gray-900">Description</th>
                  <th className="text-center py-3 px-0 font-bold text-gray-900 w-20">Qty</th>
                  <th className="text-right py-3 px-0 font-bold text-gray-900 w-28">Unit Price</th>
                  <th className="text-right py-3 px-0 font-bold text-gray-900 w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-4 px-0 text-gray-900">
                      <p className="font-medium">{item.productName}</p>
                      {isDiopterProduct(item.productId) && (
                        <p className="text-sm text-gray-600">Diopter: {item.diopter} D</p>
                      )}
                    </td>
                    <td className="text-center py-4 px-0 text-gray-900">{item.quantity}</td>
                    <td className="text-right py-4 px-0 text-gray-900">PKR {item.unitPrice.toLocaleString()}</td>
                    <td className="text-right py-4 px-0 text-gray-900">PKR {(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="flex justify-between py-4 border-t-2 border-gray-800">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="text-2xl font-bold text-blue-600">PKR {subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <p className="font-semibold text-gray-900 mb-2">Notes:</p>
            <p className="text-gray-700 text-sm">{formData.notes}</p>
          </div>

          {/* Terms & Conditions */}
          <div className="mb-12">
            <p className="font-bold text-gray-900 mb-3">Terms & Conditions:</p>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• This quotation is valid for 30 days from the date of issue.</li>
              <li>• Prices are subject to change without notice.</li>
              <li>• Payment terms: As per company policy.</li>
            </ul>
          </div>

          {/* Signature */}
          <div className="flex justify-between mt-16">
            <div>
              <p className="mb-8 h-10"></p>
              <p className="font-semibold text-gray-900">Customer Signature</p>
              <p className="text-sm text-gray-600">Authorized Person</p>
            </div>
            <div>
              <p className="mb-8 h-10"></p>
              <p className="font-semibold text-gray-900">Prepared By</p>
              <p className="text-sm text-gray-600">EYTRA Representative</p>
            </div>
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
            onClick={() => shareQuotation()}
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
              {loading ? 'Saving...' : 'Save Quotation'}
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
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 mt-2">Create and manage quotations</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + New Quotation
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Create New Quotation</h3>
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
                              const val = e.target.value
                              updateItem(item.id, 'quantity', val === '' ? 1 : Math.max(1, Number(val)))
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
                            placeholder="Enter price"
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

            {items.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">PKR {subtotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
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

      {/* Saved Quotations List */}
      {!showForm && savedQuotations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold">Saved Quotations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quotation Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Items</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {savedQuotations.map((quot) => (
                  <tr key={quot.id}>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{quot.document_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customers.find(c => c.id === quot.customer_id)?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateDisplay(quot.document_date, 'short')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{itemCounts[quot.id] || 0} items</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">PKR {Number(quot.total || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button
                        onClick={() => handleViewQuotation(quot.id)}
                        disabled={viewLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:text-gray-400"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(quot.id)}
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

      {!showForm && savedQuotations.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No quotations yet. Click "New Quotation" to create one.</p>
        </div>
      )}
    </div>
  )
}
