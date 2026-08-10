import { useEffect, useRef, useState } from 'react'

interface Customer {
  id: string
  name: string
  type: string
  email: string
  phone: string
  address?: string
  previous_balance?: number
}

interface Product {
  id: string
  name: string
  category?: string
  stock_by_diopter?: Record<string, number>
  stock_quantity?: number
}

interface InvoiceItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  diopter: string
  productName: string
}

interface SavedInvoice {
  id: string
  document_number: string
  customer_id: string
  customer_name: string
  document_date: string
  subtotal: number
  tax_amount: number
  total: number
  previous_balance: number
  balance_due: number
  notes: string
  status: string
  created_at: string
}

import { supabase } from '../lib/supabaseClient'

// Formats a 'YYYY-MM-DD' string without letting JS reinterpret it as UTC
// (new Date('2026-07-03') shifts by a day in some timezones — this avoids that).
const formatDateDisplay = (dateStr: string, style: 'long' | 'short' = 'long') => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return style === 'long'
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
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

export default function Invoices() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([])
  const [formData, setFormData] = useState({
    customerId: '',
    date: getTodayDateString(),
    notes: '',
    includePreviousBalance: false
  })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [serialNumber, setSerialNumber] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [bulkProductId, setBulkProductId] = useState('')
  const [bulkUnitPrice, setBulkUnitPrice] = useState(0)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }
  const [showSavedView, setShowSavedView] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<SavedInvoice | null>(null)
  const [viewingItems, setViewingItems] = useState<any[]>([])
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Number inputs/selects otherwise silently change value when the page is scrolled
  // while they're focused — blur on wheel so scrolling never edits a line item.
  const blurOnWheel = (e: React.WheelEvent<HTMLElement>) => {
    e.currentTarget.blur()
  }

  useEffect(() => {
    fetchData()
    generateSerialNumber()
  }, [])

  const fetchData = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('*')
      const { data: productsData } = await supabase.from('products').select('*')
      const { data: invoicesData } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
      setCustomers(customersData || [])
      setProducts(productsData || [])
      setSavedInvoices(invoicesData || [])
    } catch (err: any) {
      console.error('Error:', err)
    }
  }

  const getLiveMaxDocumentNumber = async () => {
    // Explicit high limit — Supabase/PostgREST caps unbounded selects at 1000 rows by
    // default, which would silently truncate the max-number scan once any table grows past that.
    const [{ data: invRows }, { data: quotRows }, { data: doRows }] = await Promise.all([
      supabase.from('invoices').select('document_number').limit(100000),
      supabase.from('quotations').select('document_number').limit(100000),
      supabase.from('delivery_orders').select('document_number').limit(100000)
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
      const { data: counters } = await supabase
        .from('document_counters')
        .select('*')

      const invoiceCounter = counters?.find(c => c.counter_type === 'invoice')
      const liveMax = await getLiveMaxDocumentNumber()

      if (invoiceCounter) {
        setSerialNumber(`${invoiceCounter.prefix}-${liveMax + 1}`)
      } else {
        setSerialNumber('INV-ERA-200')
      }
    } catch (err: any) {
      console.error('Error generating preview number:', err)
      setSerialNumber('')
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

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), productId: '', quantity: 1, unitPrice: 0, diopter: '1', productName: '' }])
  }

  const addAllStockForProduct = (productId: string, unitPrice: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (!unitPrice || unitPrice <= 0) {
      alert('Please enter a unit price first')
      return
    }

    const isDiopterProd = product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0

    if (isDiopterProd) {
      const newItems = Object.entries(product.stock_by_diopter!)
        .filter(([, qty]) => (qty as number) > 0)
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
        .map(([diopter, qty]) => ({
          id: `${Date.now()}-${diopter}`,
          productId,
          productName: product.name,
          diopter,
          quantity: qty as number,
          unitPrice
        }))

      if (newItems.length === 0) {
        alert('This product has no stock in any diopter right now.')
        return
      }

      setItems([...items, ...newItems])
    } else {
      const qty = product.stock_quantity || 0
      if (qty <= 0) {
        alert('This product has no stock right now.')
        return
      }
      setItems([...items, {
        id: `${Date.now()}`,
        productId,
        productName: product.name,
        diopter: '',
        quantity: qty,
        unitPrice
      }])
    }
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'productId') {
          const product = products.find(p => p.id === value)
          const validDiopters = getProductDiopters(value)
          // If this product is already used in another item, reuse its price
          const existingSamePrice = items.find(i => i.productId === value && i.id !== id)?.unitPrice
          return {
            ...item,
            productId: value,
            productName: product?.name || '',
            diopter: validDiopters.length > 0 ? validDiopters[0] : '',
            unitPrice: existingSamePrice !== undefined ? existingSamePrice : item.unitPrice
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
  const customerPreviousBalance = selectedCustomer?.previous_balance || 0
  const total = formData.includePreviousBalance ? subtotal + customerPreviousBalance : subtotal

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
    // A Qty box left blank (not yet blurred) holds a transient 0 in state — clamp it
    // back to 1 now so the preview/save never carries a 0-quantity line.
    if (items.some(i => !i.quantity || i.quantity < 1)) {
      setItems(items.map(i => (!i.quantity || i.quantity < 1) ? { ...i, quantity: 1 } : i))
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

    if (items.some(i => !i.productId)) {
      alert('Please select a product for every item before saving.')
      return
    }

    setLoading(true)
    try {
      // Fetch full product records for the items on this invoice
      const productIds = [...new Set(items.map(i => i.productId))]

      const { data: fullProducts, error: productsFetchError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      if (productsFetchError) throw productsFetchError

      // Check stock is sufficient BEFORE saving anything
      // Non-diopter products (Accessories + Medical Equipment) are purchased-to-order —
      // never block the invoice for these. Only real lens/diopter products enforce stock limits.
      for (const item of items) {
        const product = fullProducts?.find(p => p.id === item.productId)
        if (!product) continue

        const isDiopterProd = product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0
        if (!isDiopterProd) continue

        const available = product.stock_by_diopter[item.diopter] || 0
        if (available < item.quantity) {
          alert(`Not enough stock for ${item.productName} (${item.diopter}D). Available: ${available}, Requested: ${item.quantity}`)
          setLoading(false)
          return
        }
      }

      // Claim the next number based on what's ACTUALLY in use right now across
      // Invoice + Quotation + Delivery Order — self-healing regardless of delete order.
      const { data: allCounters, error: counterFetchError } = await supabase
        .from('document_counters')
        .select('*')

      if (counterFetchError) throw counterFetchError

      const invoiceCounter = allCounters?.find(c => c.counter_type === 'invoice')
      if (!invoiceCounter) throw new Error("document_counters is missing a row for counter_type 'invoice'")

      const liveMax = await getLiveMaxDocumentNumber()
      const nextNumber = liveMax + 1
      const documentNumber = `${invoiceCounter.prefix}-${nextNumber}`

      const { error: counterUpdateError } = await supabase
        .from('document_counters')
        .update({ last_number: nextNumber })
        .eq('id', invoiceCounter.id)

      if (counterUpdateError) throw counterUpdateError

      // Compute amounts. previousBalance/newBalanceDue track the customer's REAL running
      // balance and must always include the full sale value regardless of the "Include
      // Previous Balance" checkbox below — that checkbox only controls what gets PRINTED
      // on this invoice, not what the customer actually owes going forward.
      const previousBalance = selectedCustomer?.previous_balance || 0
      const taxAmount = 0 // 0% tax for this business
      const invoiceTotal = subtotal + taxAmount
      const newBalanceDue = previousBalance + invoiceTotal

      // What gets stored/reprinted on the invoice itself must match what the checkbox
      // showed on the preview the user already saw (and may have sent as a PDF) —
      // otherwise re-opening the saved invoice later shows a different Total Due.
      const displayPreviousBalance = formData.includePreviousBalance ? previousBalance : 0
      const displayBalanceDue = formData.includePreviousBalance ? newBalanceDue : invoiceTotal

      // Save the invoice header
      const { data: savedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          document_number: documentNumber,
          customer_id: formData.customerId,
          customer_name: selectedCustomer?.name,
          document_date: formData.date,
          invoice_date: formData.date,
          subtotal: subtotal,
          tax_percentage: 0,
          tax_amount: taxAmount,
          previous_balance: displayPreviousBalance,
          total: invoiceTotal,
          amount_paid: 0,
          balance_due: displayBalanceDue,
          status: 'Confirmed',
          notes: formData.notes
        }])
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Save each line item into invoice_items
      const invoiceItemRows = items.map(item => {
        const product = fullProducts?.find(p => p.id === item.productId)
        const isDiopterProd = product?.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0
        return {
          invoice_id: savedInvoice.id,
          product_id: item.productId,
          product_name_snapshot: item.productName,
          product_sku_snapshot: product?.sku || null,
          diopter_snapshot: isDiopterProd ? parseFloat(item.diopter) : null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.quantity * item.unitPrice
        }
      })

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItemRows)
      if (itemsError) {
        // Nothing was deducted/charged yet at this point — undo the header insert so a
        // failed save never leaves a phantom invoice with a total but no line items.
        await supabase.from('invoices').delete().eq('id', savedInvoice.id)
        throw itemsError
      }

      // Deduct stock for each item — accumulate ALL changes per product first, so multiple
      // diopters/lines of the SAME product don't overwrite each other's deductions.
      const stockUpdates: Record<string, any> = {}

      for (const item of items) {
        const product = fullProducts?.find(p => p.id === item.productId)
        if (!product) continue
        const isDiopterProd = product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0

        if (!stockUpdates[product.id]) {
          stockUpdates[product.id] = isDiopterProd
            ? { type: 'diopter', diopterStock: { ...product.stock_by_diopter } }
            : { type: 'quantity', quantity: product.stock_quantity || 0 }
        }

        if (isDiopterProd) {
          const current = stockUpdates[product.id].diopterStock[item.diopter] || 0
          stockUpdates[product.id].diopterStock[item.diopter] = Math.max(0, current - item.quantity)
        } else {
          stockUpdates[product.id].quantity = Math.max(0, stockUpdates[product.id].quantity - item.quantity)
        }
      }

      for (const [productId, update] of Object.entries(stockUpdates)) {
        const { error: stockError } = update.type === 'diopter'
          ? await supabase.from('products').update({ stock_by_diopter: update.diopterStock }).eq('id', productId)
          : await supabase.from('products').update({ stock_quantity: update.quantity }).eq('id', productId)
        if (stockError) throw stockError
      }

      // Update customer's outstanding balance to the new cumulative balance
      const { error: balanceError } = await supabase.from('customers').update({ previous_balance: newBalanceDue }).eq('id', formData.customerId)
      if (balanceError) throw balanceError

      // Record this transaction in the ledger
      const { error: ledgerError } = await supabase.from('ledger_entries').insert([{
        customer_id: formData.customerId,
        transaction_type: 'Invoice',
        reference_id: savedInvoice.id,
        transaction_date: formData.date,
        description: `Invoice ${documentNumber}`,
        debit_amount: invoiceTotal,
        credit_amount: 0,
        running_balance: newBalanceDue
      }])
      if (ledgerError) throw ledgerError

      // Keep the preview/PDF in sync with the number actually claimed in the DB — if another
      // document was saved elsewhere in between, the pre-save preview's number is now stale.
      setSerialNumber(documentNumber)
      showToast(`Invoice ${documentNumber} saved! Stock updated and PKR ${invoiceTotal.toLocaleString()} added to ${selectedCustomer?.name}'s balance.`)
      setJustSaved(true)
      fetchData()
    } catch (err: any) {
      console.error('Error saving:', err)
      alert(`Failed to save invoice: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Delete this invoice? Stock will be restored and the customer balance adjusted.')) return

    try {
      const invoice = savedInvoices.find(inv => inv.id === invoiceId)

      const { data: invoiceItemRows } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)

      if (invoiceItemRows && invoiceItemRows.length > 0) {
        const productIds = [...new Set(invoiceItemRows.map((i: any) => i.product_id).filter(Boolean))]
        const { data: fullProducts } = await supabase.from('products').select('*').in('id', productIds)

        // Restore stock for each item on the deleted invoice — accumulate ALL changes per
        // product first, so multiple diopters/lines of the SAME product don't overwrite
        // each other's restoration.
        const stockRestores: Record<string, any> = {}

        for (const item of invoiceItemRows as any[]) {
          const product = fullProducts?.find((p: any) => p.id === item.product_id)
          if (!product) continue
          const isDiopterProd = product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0

          if (!stockRestores[product.id]) {
            stockRestores[product.id] = isDiopterProd
              ? { type: 'diopter', diopterStock: { ...product.stock_by_diopter } }
              : { type: 'quantity', quantity: product.stock_quantity || 0 }
          }

          if (isDiopterProd && item.diopter_snapshot != null) {
            const diopterKey = String(item.diopter_snapshot)
            const current = stockRestores[product.id].diopterStock[diopterKey] || 0
            stockRestores[product.id].diopterStock[diopterKey] = current + item.quantity
          } else {
            stockRestores[product.id].quantity += item.quantity
          }
        }

        for (const [productId, update] of Object.entries(stockRestores)) {
          if (update.type === 'diopter') {
            await supabase.from('products').update({ stock_by_diopter: update.diopterStock }).eq('id', productId)
          } else {
            await supabase.from('products').update({ stock_quantity: update.quantity }).eq('id', productId)
          }
        }
      }

      // Reverse the balance this invoice added. Re-fetch the balance right before
      // adjusting it (rather than trusting the possibly-stale `customers` list already
      // in state) so two deletes done in quick succession don't both compute their new
      // balance from the same starting number.
      if (invoice) {
        const { data: freshCustomer } = await supabase
          .from('customers')
          .select('previous_balance')
          .eq('id', invoice.customer_id)
          .single()

        if (freshCustomer) {
          const newBalance = Math.max(0, Number(freshCustomer.previous_balance || 0) - Number(invoice.total || 0))
          await supabase.from('customers').update({ previous_balance: newBalance }).eq('id', invoice.customer_id)
        }
      }

      // Clean up related records
      await supabase.from('ledger_entries').delete().eq('reference_id', invoiceId)
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
      if (error) throw error

      // No manual counter rollback needed — the next document created will automatically
      // pick up the correct next number by checking what's actually still in use.

      showToast('Invoice deleted! Stock restored and balance adjusted.')
      fetchData()
      generateSerialNumber()
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert(`Failed to delete invoice: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const handleReset = () => {
    setShowForm(false)
    setShowPreview(false)
    setJustSaved(false)
    setItems([])
    setFormData({
      customerId: '',
      date: getTodayDateString(),
      notes: '',
      includePreviousBalance: false
    })
    setSelectedCustomer(null)
    generateSerialNumber()
  }

  const handleViewInvoice = async (invoiceId: string) => {
    setViewLoading(true)
    try {
      const invoice = savedInvoices.find(inv => inv.id === invoiceId)
      if (!invoice) {
        alert('Invoice not found')
        return
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)

      if (itemsError) throw itemsError

      let customer = customers.find(c => c.id === invoice.customer_id) || null
      if (!customer) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', invoice.customer_id)
          .single()
        customer = customerData || null
      }

      setViewingInvoice(invoice)
      setViewingItems(itemRows || [])
      setViewingCustomer(customer)
      setShowSavedView(true)
    } catch (err: any) {
      console.error('Error loading invoice:', err)
      alert(`Failed to open invoice: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setViewLoading(false)
    }
  }

  const closeSavedView = () => {
    setShowSavedView(false)
    setViewingInvoice(null)
    setViewingItems([])
    setViewingCustomer(null)
  }

  const downloadPDF = async (filename?: string) => {
    try {
      const element = document.getElementById('invoice-document')
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
      
      const pageWidth = 210
      const pageHeight = 297
      let imgWidth = pageWidth
      let imgHeight = (canvas.height * imgWidth) / canvas.width

      // If the content is taller than one A4 page, shrink it to fit entirely on one page
      // instead of letting it overflow past the bottom edge.
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight
        imgWidth = (canvas.width * imgHeight) / canvas.height
      }

      const xOffset = (pageWidth - imgWidth) / 2
      pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight)
      pdf.save(`${filename || serialNumber}.pdf`)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      alert('PDF download failed')
    }
  }

  const shareInvoice = async (filename?: string) => {
    try {
      const element = document.getElementById('invoice-document')
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

      const pageWidth = 210
      const pageHeight = 297
      let imgWidth = pageWidth
      let imgHeight = (canvas.height * imgWidth) / canvas.width

      // If the content is taller than one A4 page, shrink it to fit entirely on one page
      // instead of letting it overflow past the bottom edge.
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight
        imgWidth = (canvas.width * imgHeight) / canvas.height
      }

      const xOffset = (pageWidth - imgWidth) / 2
      pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight)

      const pdfBlob = pdf.output('blob')
      const finalName = `${filename || serialNumber}.pdf`
      const file = new File([pdfBlob], finalName, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: finalName,
          text: `Invoice ${filename || serialNumber} from EYTRA`
        })
      } else {
        // Fallback for browsers/devices that don't support sharing files (mostly desktop)
        pdf.save(finalName)
        alert('Direct share isn\'t supported on this device/browser — the PDF has been downloaded instead. Please attach it in WhatsApp manually.')
      }
    } catch (err: any) {
      // Ignore the error when the user simply cancels the native share sheet
      if (err?.name !== 'AbortError') {
        console.error('Share error:', err)
        alert('Sharing failed')
      }
    }
  }

  if (showSavedView && viewingInvoice && viewingCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div id="invoice-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
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
              <p className="text-sm text-gray-600">INVOICE</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{viewingInvoice.document_number}</p>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDateDisplay(viewingInvoice.document_date)}</p>
            </div>
          </div>

          {/* TO Section */}
          <div className="mb-12">
            <h3 className="font-bold text-gray-900 mb-3">TO:</h3>
            <p className="font-semibold text-gray-900">{viewingCustomer.name}</p>
            <p className="text-gray-600 text-sm">{viewingCustomer.type}</p>
            {viewingCustomer.address && <p className="text-gray-600 text-sm">{viewingCustomer.address}</p>}
            {viewingCustomer.email && <p className="text-gray-600 text-sm">{viewingCustomer.email}</p>}
            {viewingCustomer.phone && <p className="text-gray-600 text-sm">Phone: {viewingCustomer.phone}</p>}
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
                {viewingItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-1.5 px-0 text-gray-900 text-sm">
                      {item.product_name_snapshot}
                      {item.diopter_snapshot != null && (
                        <span className="text-gray-600"> — {item.diopter_snapshot}D</span>
                      )}
                    </td>
                    <td className="text-center py-1.5 px-0 text-gray-900 text-sm">{item.quantity}</td>
                    <td className="text-right py-1.5 px-0 text-gray-900 text-sm">PKR {Number(item.unit_price).toLocaleString()}</td>
                    <td className="text-right py-1.5 px-0 text-gray-900 text-sm">PKR {Number(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations - NO TAX */}
          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="text-gray-700 text-sm">Total Quantity</span>
                <span className="text-gray-900 font-medium">{viewingItems.reduce((sum, i) => sum + (i.quantity || 0), 0)} pcs</span>
              </div>
              {viewingInvoice.previous_balance > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t border-gray-300">
                    <span className="text-gray-900">Previous Balance</span>
                    <span className="text-gray-900">PKR {Number(viewingInvoice.previous_balance).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-gray-300">
                    <span className="text-gray-900">Current Invoice</span>
                    <span className="text-gray-900">PKR {Number(viewingInvoice.subtotal).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-4 border-t-2 border-gray-800">
                <span className="font-bold text-gray-900 text-lg">Total Due</span>
                <span className="text-2xl font-bold text-blue-600">PKR {Number(viewingInvoice.balance_due).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {viewingInvoice.notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <p className="font-semibold text-gray-900 mb-2">Notes:</p>
              <p className="text-gray-700 text-sm">{viewingInvoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-800 pt-6">
            <p className="font-semibold text-gray-900 mb-2">Make all checks payable to "EYTRA"</p>
            <p className="text-gray-600 text-sm">For queries, please contact:</p>
            <p className="text-gray-600 text-sm">eytra.pk@gmail.com | 0336-0402870 | 0308-4488421</p>
            <p className="text-center text-gray-900 font-semibold mt-6">THANK YOU FOR YOUR BUSINESS!!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto mt-8 flex gap-4">
          <button
            onClick={() => downloadPDF(viewingInvoice.document_number)}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => shareInvoice(viewingInvoice.document_number)}
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
        <div id="invoice-document" className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12 pb-8 border-b-2 border-gray-800">
            {/* Left side - Logo + Text BILKUL SAATH */}
            <div className="flex items-center gap-0">
              <img src="/eytra-logo.png" alt="EYTRA Logo" className="h-48 w-48 object-contain flex-shrink-0" />
              <div className="-ml-6">
                <h1 className="text-5xl font-bold text-gray-900">EYTRA</h1>
                <p className="text-sm text-gray-600 mt-1 leading-tight">Deals in Intraocular Lenses<br/>and Medical Equipment</p>
                <p className="text-base text-gray-700 font-semibold mt-2">NTN no: 8212989-3</p>
              </div>
            </div>

            {/* Right side - Document Info */}
            <div className="text-right">
              <p className="text-sm text-gray-600">INVOICE</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{serialNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDateDisplay(formData.date)}</p>
            </div>
          </div>

          {/* TO Section */}
          <div className="mb-12">
            <h3 className="font-bold text-gray-900 mb-3">TO:</h3>
            <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
            <p className="text-gray-600 text-sm">{selectedCustomer.type}</p>
            {selectedCustomer.address && <p className="text-gray-600 text-sm">{selectedCustomer.address}</p>}
            {selectedCustomer.email && <p className="text-gray-600 text-sm">{selectedCustomer.email}</p>}
            {selectedCustomer.phone && <p className="text-gray-600 text-sm">Phone: {selectedCustomer.phone}</p>}
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
                    <td className="py-1.5 px-0 text-gray-900 text-sm">
                      {item.productName}
                      {isDiopterProduct(item.productId) && (
                        <span className="text-gray-600"> — {item.diopter}D</span>
                      )}
                    </td>
                    <td className="text-center py-1.5 px-0 text-gray-900 text-sm">{item.quantity}</td>
                    <td className="text-right py-1.5 px-0 text-gray-900 text-sm">PKR {item.unitPrice.toLocaleString()}</td>
                    <td className="text-right py-1.5 px-0 text-gray-900 text-sm">PKR {(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations - NO TAX */}
          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="text-gray-700 text-sm">Total Quantity</span>
                <span className="text-gray-900 font-medium">{items.reduce((sum, i) => sum + (i.quantity || 0), 0)} pcs</span>
              </div>
              {formData.includePreviousBalance && customerPreviousBalance > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t border-gray-300">
                    <span className="text-gray-900">Previous Balance</span>
                    <span className="text-gray-900">PKR {customerPreviousBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-gray-300">
                    <span className="text-gray-900">Current Invoice</span>
                    <span className="text-gray-900">PKR {subtotal.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-4 border-t-2 border-gray-800">
                <span className="font-bold text-gray-900 text-lg">Total Due</span>
                <span className="text-2xl font-bold text-blue-600">PKR {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {formData.notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <p className="font-semibold text-gray-900 mb-2">Notes:</p>
              <p className="text-gray-700 text-sm">{formData.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-800 pt-6">
            <p className="font-semibold text-gray-900 mb-2">Make all checks payable to "EYTRA"</p>
            <p className="text-gray-600 text-sm">For queries, please contact:</p>
            <p className="text-gray-600 text-sm">eytra.pk@gmail.com | 0336-0402870 | 0308-4488421</p>
            <p className="text-center text-gray-900 font-semibold mt-6">THANK YOU FOR YOUR BUSINESS!!</p>
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
            onClick={() => shareInvoice()}
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
              {loading ? 'Saving...' : 'Save Invoice'}
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
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Create and manage invoices</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + New Invoice
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Create New Invoice</h3>
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove all ${items.length} items?`)) {
                          setItems([])
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove All
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Add: optional — add every diopter of a product at once with its full available stock */}
              {showBulkAdd && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-semibold text-blue-900">Add All Stock — sells every diopter of a product at once</p>
                    <button
                      onClick={() => {
                        setShowBulkAdd(false)
                        setBulkProductId('')
                        setBulkUnitPrice(0)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 font-medium block mb-1">Product</label>
                    <select
                      value={bulkProductId}
                      onChange={(e) => setBulkProductId(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {bulkProductId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mt-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-600 font-medium block mb-1">Unit Price</label>
                        <input
                          type="number"
                          value={bulkUnitPrice || ''}
                          onChange={(e) => setBulkUnitPrice(Number(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onWheel={blurOnWheel}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Same price for all"
                          min="0"
                          autoFocus
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            addAllStockForProduct(bulkProductId, bulkUnitPrice)
                            setBulkProductId('')
                            setBulkUnitPrice(0)
                            setShowBulkAdd(false)
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-medium transition"
                        >
                          Add All Stock
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  qtyInputRefs.current[item.id]?.focus()
                                }
                              }}
                              onWheel={blurOnWheel}
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
                            ref={(el) => { qtyInputRefs.current[item.id] = el }}
                            type="number"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '') {
                                updateItem(item.id, 'quantity', 0)
                                return
                              }
                              const num = Number(val)
                              if (!isNaN(num)) updateItem(item.id, 'quantity', Math.max(0, num))
                            }}
                            onBlur={() => {
                              if (!item.quantity || item.quantity < 1) updateItem(item.id, 'quantity', 1)
                            }}
                            onFocus={(e) => e.target.select()}
                            onWheel={blurOnWheel}
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
                            onWheel={blurOnWheel}
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

              <div className="flex justify-between items-center">
                <button
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  + Add Item
                </button>
                {!showBulkAdd && (
                  <button
                    onClick={() => setShowBulkAdd(true)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-sm px-4 py-2 rounded-lg transition"
                  >
                    + Add All Stock
                  </button>
                )}
              </div>
            </div>

            {/* Total Summary - NO TAX */}
            {items.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Subtotal:</span>
                  <span className="text-lg font-bold text-gray-900">PKR {subtotal.toLocaleString()}</span>
                </div>
                {formData.includePreviousBalance && customerPreviousBalance > 0 && (
                  <>
                    <div className="flex justify-between mt-2 pt-2 border-t border-blue-200">
                      <span className="text-gray-900">+ Previous Balance:</span>
                      <span className="text-gray-900">PKR {customerPreviousBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t-2 border-blue-600">
                      <span className="font-bold text-gray-900">Total Due:</span>
                      <span className="text-lg font-bold text-blue-600">PKR {total.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {!formData.includePreviousBalance && (
                  <div className="flex justify-between mt-2">
                    <span className="font-bold text-gray-900">Total Due:</span>
                    <span className="text-lg font-bold text-blue-600">PKR {total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Previous Balance Toggle */}
            {selectedCustomer && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="includePreviousBalance"
                    checked={formData.includePreviousBalance}
                    onChange={(e) => setFormData({...formData, includePreviousBalance: e.target.checked})}
                    disabled={customerPreviousBalance === 0}
                    className="w-5 h-5 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <label htmlFor="includePreviousBalance" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Include Previous Balance {customerPreviousBalance > 0 ? `(PKR ${customerPreviousBalance.toLocaleString()})` : '(No Balance)'}
                  </label>
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

      {/* Saved Invoices List */}
      {!showForm && savedInvoices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold">Saved Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {savedInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{inv.document_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{inv.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateDisplay(inv.document_date, 'short')}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">PKR {Number(inv.total || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button
                        onClick={() => handleViewInvoice(inv.id)}
                        disabled={viewLoading}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:text-gray-400"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
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

      {!showForm && savedInvoices.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No invoices yet. Click "New Invoice" to create one.</p>
        </div>
      )}
    </div>
  )
}
