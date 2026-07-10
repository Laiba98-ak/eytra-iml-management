import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const productsData = [
  {
    sku: "UVF600-125FL",
    name: "Foldable Hydrophilic Lens with Injectors (Optic Plus)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 5, "2": 5, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 5, "9": 5, "10": 100,
      "11": 90, "12": 90, "13": 90, "14": 58, "15": 95, "15.5": 60,
      "16": 115, "16.5": 80, "17": 385, "17.5": 240,
      "18": 410, "18.5": 260, "19": 1025, "19.5": 600,
      "20": 1700, "20.5": 648, "21": 1275, "21.5": 819,
      "22": 1525, "22.5": 700, "23": 1120, "23.5": 350,
      "24": 630, "24.5": 380, "25": 430, "25.5": 250,
      "26": 260, "27": 129, "28": 50, "29": 31, "30": 50,
      "31": 0, "32": 0, "33": 0, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  {
    sku: "SQFL600ASP",
    name: "Foldable Hydrophilic Lens without Injectors (Vision Plus)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 5, "2": 5, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5, "8": 5, "9": 5, "10": 5,
      "11": 45, "12": 45, "13": 45, "14": 47, "15": 47, "15.5": 12,
      "16": 75, "16.5": 35, "17": 95, "17.5": 95,
      "18": 100, "18.5": 90, "19": 215, "19.5": 215,
      "20": 440, "20.5": 405, "21": 430, "21.5": 380,
      "22": 368, "22.5": 367, "23": 365, "23.5": 245,
      "24": 165, "24.5": 165, "25": 115, "25.5": 85,
      "26": 65, "27": 35, "28": 30, "29": 25, "30": 20,
      "31": 5, "32": 5, "33": 4, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  {
    sku: "CBFY32UVFLEX",
    name: "Foldable Yellow Lens (Occu Gold)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0,
      "11": 0, "12": 0, "13": 0, "14": 0, "15": 0, "15.5": 0,
      "16": 10, "16.5": 0, "17": 10, "17.5": 10,
      "18": 20, "18.5": 20, "19": 300, "19.5": 150,
      "20": 400, "20.5": 230, "21": 400, "21.5": 230,
      "22": 400, "22.5": 200, "23": 100, "23.5": 50,
      "24": 75, "24.5": 0, "25": 15, "25.5": 0,
      "26": 10, "27": 10, "28": 0, "29": 0, "30": 0,
      "31": 0, "32": 0, "33": 0, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  {
    sku: "B65130",
    name: "Hard Lens 6.5 (Rigid 6.5)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 21,
      "11": 26, "12": 60, "13": 97, "14": 0, "14.5": 33,
      "15": 25, "15.5": 50, "16": 100, "16.5": 100, "17": 300,
      "17.5": 150, "18": 300, "18.5": 200, "19": 900, "19.5": 450,
      "20": 1158, "20.5": 400, "21": 1047, "21.5": 500,
      "22": 1106, "22.5": 500, "23": 1040, "23.5": 345,
      "24": 475, "24.5": 292, "25": 325, "25.5": 200,
      "26": 200, "27": 200, "28": 200, "29": 200, "30": 100,
      "31": 0, "32": 0, "33": 0, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  {
    sku: "B525",
    name: "Hard Lens 5.25 (Rigid 5.25)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0,
      "11": 5, "12": 5, "13": 5, "14": 5, "15": 10, "15.5": 10,
      "16": 20, "16.5": 20, "17": 30, "17.5": 20,
      "18": 100, "18.5": 50, "19": 400, "19.5": 200,
      "20": 500, "20.5": 250, "21": 500, "21.5": 250,
      "22": 500, "22.5": 270, "23": 300, "23.5": 150,
      "24": 100, "24.5": 40, "25": 100, "25.5": 40,
      "26": 40, "27": 20, "28": 20, "29": 20, "30": 20,
      "31": 0, "32": 0, "33": 0, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  {
    sku: "CBHF33 UV",
    name: "Hydrophobic Lens (Hydrophobic IOL)",
    category: "IOL Lens",
    stock_by_diopter: {
      "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0,
      "11": 0, "12": 0, "13": 0, "14": 0, "15": 0, "15.5": 0,
      "16": 0, "16.5": 0, "17": 5, "17.5": 5,
      "18": 10, "18.5": 10, "19": 70, "19.5": 30,
      "20": 80, "20.5": 30, "21": 0, "21.5": 0,
      "22": 0, "22.5": 0, "23": 0, "23.5": 0,
      "24": 5, "24.5": 5, "25": 0, "25.5": 0,
      "26": 0, "27": 0, "28": 0, "29": 0, "30": 0,
      "31": 0, "32": 0, "33": 0, "34": 0, "35": 0, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0
    }
  },
  { sku: "AQ-S-B-CON24", name: "Seifle Injector Only", category: "Accessories", stock_by_diopter: {} },
  { sku: "KNIFE-2.8", name: "Knife 2.8mm", category: "Accessories", stock_by_diopter: {} },
  { sku: "KNIFE-3.2", name: "Knife 3.2mm", category: "Accessories", stock_by_diopter: {} },
  { sku: "KNIFE-15D", name: "Knife 15 Degree", category: "Accessories", stock_by_diopter: {} },
  { sku: "METHYL-GEL-5ML", name: "Methyl Gel 5ml", category: "Medical Equipment", stock_by_diopter: {} },
  { sku: "CARBACHOL", name: "Carbachol", category: "Medical Equipment", stock_by_diopter: {} },
  { sku: "TRYPAN-BLUE", name: "Trypan Blue", category: "Medical Equipment", stock_by_diopter: {} },
  { sku: "OPSITE-SHEET", name: "Opsite Sheet", category: "Medical Equipment", stock_by_diopter: {} }
]

export default function InsertProducts() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleInsert = async () => {
    setLoading(true)
    setResult('Starting insert...')
    
    let successCount = 0
    let errorCount = 0

    try {
      for (const product of productsData) {
        try {
          const { error } = await supabase.from('products').insert([product])
          
          if (error) {
            setResult(prev => prev + `\n❌ ${product.name}: ${error.message}`)
            errorCount++
          } else {
            setResult(prev => prev + `\n✅ ${product.name}`)
            successCount++
          }
        } catch (err: any) {
          setResult(prev => prev + `\n❌ ${product.name}: ${err.message}`)
          errorCount++
        }
      }

      setResult(prev => prev + `\n\n🎉 DONE!\n✅ Success: ${successCount}\n❌ Errors: ${errorCount}`)
    } catch (err) {
      setResult(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Insert Products</h1>
          <p className="text-gray-600 mb-8">Click below to insert all 14 products with stock data into Supabase</p>

          <button
            onClick={handleInsert}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed mb-8"
          >
            {loading ? '⏳ Inserting...' : '✅ Insert All 14 Products'}
          </button>

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96 text-gray-700">
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
