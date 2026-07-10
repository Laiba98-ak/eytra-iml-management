# 🚀 COMPLETE LOCAL SETUP GUIDE
## Run EYTRA IOL System on Your Computer - Full Testing

---

## ⏰ SETUP TIME: 30-45 MINUTES

```
Step 1: Install Node.js           (5 min)
Step 2: Download Project Files     (2 min)
Step 3: Setup Supabase DB          (10 min)
Step 4: Configure .env             (3 min)
Step 5: Install Dependencies       (10 min)
Step 6: Run Project                (2 min)
Step 7: Test in Browser            (10 min)

TOTAL: 42 MINUTES
```

---

## 📋 REQUIREMENTS

Before you start, make sure you have:

```
✅ Windows/Mac/Linux computer
✅ Internet connection
✅ A text editor (VS Code recommended - free)
✅ 5 GB free disk space
✅ 30 minutes
```

---

## STEP 1: INSTALL NODE.JS (5 MINUTES)

### Windows:
```
1. Go to: nodejs.org
2. Click: "Download LTS" (left side)
3. Run installer (next → next → finish)
4. Restart computer
```

### Mac:
```
1. Go to: nodejs.org
2. Click: "Download LTS"
3. Run .pkg file
4. Follow installer
```

### Verify installation:
```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

---

## STEP 2: DOWNLOAD ALL PROJECT FILES (2 MINUTES)

### Option A: From this chat (easiest)

1. Go to `/mnt/user-data/outputs/` folder
2. Download these files:
   - `001_create_tables.sql`
   - `002_seed_data.sql`
   - `.env.example`
   - `database.types.ts`
   - `supabase.ts`
   - `DocumentNumberingService.ts`
   - `CustomerService.ts`
   - `ProductService.ts`
   - `LedgerService.ts`
   - `AllRemainingServices.ts`

3. Create this folder structure:
```
eytra-iml-management/
├── src/
│   ├── types/
│   │   └── database.types.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   ├── DocumentNumberingService.ts
│   │   ├── CustomerService.ts
│   │   ├── ProductService.ts
│   │   ├── LedgerService.ts
│   │   └── AllRemainingServices.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Customers.tsx
│   │   └── ...
│   ├── components/
│   ├── App.tsx
│   └── main.tsx
├── .env.local
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Option B: Create from scratch (advanced)

```bash
# Create new Vite project
npm create vite@latest eytra-iml-management -- --template react-ts

cd eytra-iml-management

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Supabase
npm install @supabase/supabase-js

# Install routing
npm install react-router-dom

# Install UI icons
npm install lucide-react
```

---

## STEP 3: SETUP SUPABASE DATABASE (10 MINUTES)

### 3.1: Create Supabase Account
```
1. Go to: supabase.com
2. Click: "Start Your Project"
3. Sign up with GitHub (easiest)
4. Authorize Supabase
```

### 3.2: Create Project
```
In Supabase Dashboard:
1. Click: "New Project"
2. Fill:
   - Name: eytra-iml-dev
   - Password: Strong password (save it!)
   - Region: Singapore (Asia)
   - Plan: FREE
3. Click: "Create new project"
4. Wait: 3-5 minutes for setup
```

### 3.3: Run Database Migrations
```
In Supabase Dashboard:

1. Click: "SQL Editor"
2. Click: "New Query"
3. Copy-paste ALL content from: 001_create_tables.sql
4. Click: "RUN"
5. Wait: 10-20 seconds
6. Check "Tables" in left sidebar - should show 18 tables ✓

7. Click: "New Query" again
8. Copy-paste ALL content from: 002_seed_data.sql
9. Click: "RUN"
10. Wait: 10-20 seconds
11. Check results:
    - Tables → products → should show 14 rows
    - Tables → customers → should show 5 rows
    - Tables → stock_entries → should show data
```

### 3.4: Get Your Credentials
```
In Supabase:
1. Click: "Settings" (left sidebar)
2. Click: "API"
3. Copy: Project URL (top)
4. Copy: anon public key
5. Save both somewhere safe
```

---

## STEP 4: CONFIGURE .ENV.LOCAL (3 MINUTES)

### 4.1: Create .env.local file
```
In your project root folder:
1. Create new file: .env.local
2. Paste this (fill your credentials):
```

```env
# .env.local

# Supabase (from Step 3.4)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...xxxxx

# App Settings
VITE_APP_TITLE=EYTRA IML Management System
VITE_APP_VERSION=1.0.0
```

### 4.2: Verify
```
✅ Check: .env.local exists in root folder
✅ Check: Has your Supabase URL
✅ Check: Has your Supabase Anon Key
⚠️  NEVER commit this file to Git!
```

---

## STEP 5: INSTALL DEPENDENCIES (10 MINUTES)

### 5.1: Open Terminal/Command Prompt
```
Windows:
- Press: Windows key + R
- Type: cmd
- Press: Enter

Mac:
- Open: Applications → Utilities → Terminal

Linux:
- Ctrl + Alt + T
```

### 5.2: Navigate to project
```bash
cd path/to/eytra-iml-management
```

### 5.3: Install packages
```bash
npm install

# If errors, try:
npm install --legacy-peer-deps

# Wait: 5-10 minutes (first time is slower)
```

### 5.4: Verify
```bash
# Should see no red errors at the end
# Should show: added XXX packages
```

---

## STEP 6: RUN PROJECT LOCALLY (2 MINUTES)

### 6.1: Start development server
```bash
npm run dev
```

### 6.2: Open in browser
```
Terminal will show:
  ➜  Local:   http://localhost:5173/

Open this URL in your browser:
- Chrome, Firefox, Edge, Safari - any works
```

### 6.3: Verify App Loads
```
You should see:
✅ EYTRA IML Management page
✅ Sidebar with menu items
✅ Dashboard with metrics
✅ No red errors in terminal
✅ No errors in browser console (F12)
```

---

## STEP 7: TEST ALL FEATURES (10 MINUTES)

Now **you test everything yourself**!

### Test 1: Dashboard
```
1. Go to: Dashboard (default page)
2. Check:
   ✓ Shows "Welcome back"
   ✓ Shows "5" Total Customers
   ✓ Shows "PKR 810k" Outstanding Balance
   ✓ Shows quick actions (New Quotation, etc.)
   ✓ Shows recent activity
   
If all showing: ✅ DASHBOARD WORKS
If error: Check browser console (F12)
```

### Test 2: Customers
```
1. Click: "Customers" in sidebar
2. Check:
   ✓ Shows table with 5 rows
   ✓ Dr. Ahmed Hassan visible
   ✓ Shifa Hospital visible
   ✓ Dr. Sana Malik visible
   ✓ Al Baseer Medical visible
   ✓ Dr. Muhammad Rizwan visible
   ✓ All show balance amounts
   ✓ All show "Active" status
   
If all showing: ✅ CUSTOMERS WORKS
If error: Check browser console (F12)
```

### Test 3: Products
```
1. Click: "Products" in sidebar
2. Check:
   ✓ Shows 14 products in table
   ✓ UVF600-125FL visible (10,120 units)
   ✓ B65130 visible (11,100 units)
   ✓ CBFY32UVFLEX visible (5,880 units)
   ✓ All products have prices
   ✓ Shows diopter ranges for lens products
   
If all showing: ✅ PRODUCTS WORKS
If error: Check database connection in console
```

### Test 4: Quotations
```
1. Click: "Quotations" in sidebar
2. Check:
   ✓ Can see quotation list
   ✓ Shows ERA-200 format numbering
   ✓ Can create new quotation
   ✓ Professional template shown
   ✓ Diopter selection works
   
If all working: ✅ QUOTATIONS WORK
```

### Test 5: Invoices
```
1. Click: "Invoices" in sidebar
2. Check:
   ✓ Can see invoice list
   ✓ Shows INV-ERA-200 format
   ✓ Can create from quotation
   ✓ Shows balance calculation
   ✓ Professional layout works
   
If all working: ✅ INVOICES WORK
```

### Test 6: Stock Management
```
1. Click: "Stock Management" in sidebar
2. Check:
   ✓ Shows total stock: 37,280 units
   ✓ Lists all 14 products
   ✓ Shows quantities per product
   ✓ Shows low stock warning (CBHF33 UV = 500)
   
If all showing: ✅ STOCK WORKS
```

### Test 7: Payments
```
1. Click: "Payments" in sidebar
2. Check:
   ✓ Can record payment
   ✓ Shows payment history
   ✓ Updates customer balance
   ✓ Shows payment methods
   
If all working: ✅ PAYMENTS WORK
```

### Test 8: Ledger
```
1. Click: "Ledger" in sidebar
2. Check:
   ✓ Shows transaction history
   ✓ Shows debit/credit entries
   ✓ Shows running balance
   ✓ All amounts correct
   
If all showing: ✅ LEDGER WORKS
```

### Test 9: Delivery Orders
```
1. Click: "Delivery Orders" in sidebar
2. Check:
   ✓ Shows DO-ERA-200 format
   ✓ Can create new order
   ✓ Professional format
   ✓ Status tracking works
   
If all working: ✅ DELIVERY ORDERS WORK
```

---

## ✅ FINAL VERIFICATION CHECKLIST

After testing everything, check:

**Frontend Working:**
- [ ] App loads without errors
- [ ] Sidebar menu visible
- [ ] All 9 modules accessible
- [ ] No red errors in console

**Database Connected:**
- [ ] Dashboard loads metrics
- [ ] Customers page shows 5 rows
- [ ] Products page shows 14 items
- [ ] Stock shows 37,280 total

**All Features Working:**
- [ ] Quotations can be created
- [ ] Invoices can be created
- [ ] Customers show balances
- [ ] Payments can be recorded
- [ ] Ledger shows transactions

**No Errors:**
- [ ] Console clean (F12)
- [ ] No red warnings
- [ ] Terminal shows no errors
- [ ] Everything loads fast

---

## 🐛 TROUBLESHOOTING

### "App not loading" / Blank page
```
1. Check: npm run dev is running (terminal)
2. Check: Browser showing http://localhost:5173
3. Check: No red errors in terminal
4. Try: Press F5 to refresh browser
5. Try: Clear browser cache (Ctrl+Shift+Delete)
```

### "Supabase not connected" error
```
1. Check: .env.local has your credentials
2. Check: Supabase project still active
3. Check: URL and key are correct (no spaces)
4. Try: Copy credentials again from Supabase
5. Restart: npm run dev
```

### "Tables not found" error
```
1. Check: Migrations were run (001 then 002)
2. Go to Supabase SQL Editor
3. Check "Tables" sidebar - should show 18 tables
4. If missing: Re-run 001_create_tables.sql
5. Then re-run 002_seed_data.sql
```

### "Products not showing" / Empty tables
```
1. Check: 002_seed_data.sql was executed
2. In Supabase, go to: Tables → products
3. Should show 14 rows
4. If empty: Run 002_seed_data.sql again
```

### "npm install fails"
```
Try:
npm install --legacy-peer-deps

If still fails:
1. Delete: node_modules folder
2. Delete: package-lock.json
3. Run: npm install --legacy-peer-deps
```

### "Port 5173 already in use"
```
Use different port:
npm run dev -- --port 5174

Then open:
http://localhost:5174
```

---

## 🎯 ONCE EVERYTHING WORKS

When you verify all 9 modules work:

```
✅ Dashboard working
✅ Customers working
✅ Products working
✅ Quotations working
✅ Invoices working
✅ Stock working
✅ Payments working
✅ Ledger working
✅ Delivery Orders working

THEN: You're ready to deploy!

(We'll handle deployment AFTER you're 100% satisfied)
```

---

## 📞 NEXT STEPS

1. **Follow this guide step-by-step**
2. **Run project locally**
3. **Test all 9 modules**
4. **Check everything works**
5. **Let me know what needs fixing**
6. **Then we deploy to Vercel**

---

## ⏱️ EXPECTED RESULTS

**After 45 minutes you should have:**

✅ Project running on http://localhost:5173
✅ All 9 modules accessible
✅ Real data from Supabase showing
✅ 5 customers loaded
✅ 14 products showing
✅ 37,280 units stock visible
✅ Everything working perfectly
✅ Ready to test and deploy

---

## 💬 REMEMBER

- Don't skip any steps
- Follow exactly as written
- If stuck, check troubleshooting
- Terminal errors = look at console
- Browser errors = press F12 and check
- You've got this! ✅

---

**Ab start karo! 🚀**

1. Install Node.js
2. Download files
3. Setup Supabase
4. Create .env.local
5. npm install
6. npm run dev
7. Test everything
8. Tell me if any issues!

**Mubarak! Happy testing! 🎉**

