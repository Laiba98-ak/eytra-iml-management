import { useEffect, useState } from 'react'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  stock_by_diopter: Record<string, number>
  stock_quantity: number
}

interface StockData {
  [key: string]: number
}

import { supabase } from '../lib/supabaseClient'

const diopters = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  ...Array.from({ length: 60 }, (_, i) => {
    const val = 10.5 + i * 0.5
    return Number.isInteger(val) ? val.toString() : val.toFixed(1)
  })
]

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showStockView, setShowStockView] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'IOL Lens'
  })
  const [stockData, setStockData] = useState<StockData>({})
  const [showSimpleStockView, setShowSimpleStockView] = useState(false)
  const [simpleQty, setSimpleQty] = useState(0)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('sku')
      setProducts(data || [])
    } catch (err: any) {
      console.error('Error:', err)
    }
  }

  const isDiopterProduct = (product: Product) => {
    return !!product.stock_by_diopter && Object.keys(product.stock_by_diopter).length > 0
  }

  const getTotalStock = (product: Product) => {
    if (isDiopterProduct(product)) {
      return Object.values(product.stock_by_diopter).reduce((sum, qty) => sum + (qty || 0), 0)
    }
    return product.stock_quantity || 0
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sku || !formData.name) {
      alert('Please fill SKU and Name')
      return
    }

    setLoading(true)
    try {
      const isIolLens = formData.category === 'IOL Lens'
      const initialStock: StockData = {}
      if (isIolLens) {
        diopters.forEach(d => {
          initialStock[d] = 0
        })
      }

      const { error } = await supabase.from('products').insert([
        {
          sku: formData.sku,
          name: formData.name,
          category: formData.category,
          stock_by_diopter: initialStock,
          stock_quantity: 0
        }
      ])

      if (error) throw error

      alert(`Product ${formData.name} added successfully!`)
      setFormData({ sku: '', name: '', category: 'IOL Lens' })
      setShowForm(false)
      fetchProducts()
    } catch (err: any) {
      console.error('Error:', err)
      alert('Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = async () => {
    if (!selectedProduct) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_by_diopter: stockData })
        .eq('id', selectedProduct.id)

      if (error) throw error

      alert('Stock updated successfully!')
      fetchProducts()
      setShowStockView(false)
      setSelectedProduct(null)
    } catch (err: any) {
      console.error('Error:', err)
      alert('Failed to update stock')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Delete this product?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) throw error
      alert('Product deleted!')
      fetchProducts()
    } catch (err: any) {
      console.error('Error:', err)
      alert('Failed to delete product')
    }
  }

  const openStockView = (product: Product) => {
    setSelectedProduct(product)
    if (isDiopterProduct(product)) {
      setStockData(product.stock_by_diopter || {})
      setShowStockView(true)
    } else {
      setSimpleQty(product.stock_quantity || 0)
      setShowSimpleStockView(true)
    }
  }

  const handleUpdateSimpleStock = async () => {
    if (!selectedProduct) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: Math.max(0, simpleQty) })
        .eq('id', selectedProduct.id)

      if (error) throw error

      alert('Stock updated successfully!')
      fetchProducts()
      setShowSimpleStockView(false)
      setSelectedProduct(null)
    } catch (err: any) {
      console.error('Error:', err)
      alert('Failed to update stock')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSimpleStock = async () => {
    if (!selectedProduct) return
    if (!window.confirm('Clear stock to 0 for this product?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: 0 })
        .eq('id', selectedProduct.id)

      if (error) throw error

      alert('Stock cleared!')
      fetchProducts()
      setShowSimpleStockView(false)
      setSelectedProduct(null)
    } catch (err: any) {
      console.error('Error:', err)
      alert('Failed to clear stock')
    } finally {
      setLoading(false)
    }
  }

  if (showSimpleStockView && selectedProduct) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-gray-600 mt-2">{selectedProduct.name} - {selectedProduct.sku}</p>
          </div>
          <button
            onClick={() => {
              setShowSimpleStockView(false)
              setSelectedProduct(null)
            }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Back to Products
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-4xl font-bold text-green-600">{simpleQty}</p>
          </div>

          <label className="block text-sm font-semibold mb-2 text-gray-900">Quantity</label>
          <input
            type="number"
            value={simpleQty}
            onChange={(e) => setSimpleQty(Math.max(0, Number(e.target.value) || 0))}
            onFocus={(e) => e.target.select()}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />

          <div className="flex gap-3">
            <button
              onClick={handleUpdateSimpleStock}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Update Stock'}
            </button>
            <button
              onClick={handleClearSimpleStock}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition disabled:bg-gray-400"
            >
              Clear Stock
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showStockView && selectedProduct) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-gray-600 mt-2">{selectedProduct.name} - {selectedProduct.sku}</p>
          </div>
          <button
            onClick={() => {
              setShowStockView(false)
              setSelectedProduct(null)
            }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Back to Products
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {Array.from({ length: 3 }, (_, i) => {
              const start = i * 10
              const diopRange = diopters.slice(start, start + 10)
              const rangeStock = diopRange.reduce((sum, d) => sum + (stockData[d] || 0), 0)
              return (
                <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Diopter {start + 1}-{start + 10}</p>
                  <p className="text-2xl font-bold text-blue-600">{rangeStock}</p>
                </div>
              )
            })}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Total Stock</p>
            <p className="text-4xl font-bold text-green-600">
              {Object.values(stockData).reduce((sum, qty) => sum + (qty || 0), 0)}
            </p>
          </div>

          <h3 className="text-lg font-bold mb-4">Update Stock by Diopter</h3>

          <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
            {diopters.map((diopter) => (
              <div key={diopter} className="flex items-center gap-4 bg-white p-3 rounded border border-gray-200">
                <label className="w-20 font-medium text-gray-700">{diopter} D</label>
                <input
                  type="number"
                  value={stockData[diopter] || 0}
                  onChange={(e) => setStockData({
                    ...stockData,
                    [diopter]: Math.max(0, Number(e.target.value) || 0)
                  })}
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <span className="text-sm text-gray-500 w-20">units</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={handleUpdateStock}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Stock'}
            </button>
            <button
              onClick={() => {
                setShowStockView(false)
                setSelectedProduct(null)
              }}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">IOL products and medical equipment</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Add Product
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold mb-6">Add New Product</h3>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., UVF600-125FL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>IOL Lens</option>
                  <option>Medical Equipment</option>
                  <option>Accessories</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Foldable Hydrophilic Lens with Injectors"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Adding...' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ sku: '', name: '', category: 'IOL Lens' })
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">SKU</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Total Stock</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-blue-600">{product.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                      {getTotalStock(product)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button
                      onClick={() => openStockView(product)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Manage Stock
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
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

      {products.length === 0 && !showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No products yet. Click "Add Product" to create one.</p>
        </div>
      )}
    </div>
  )
}
