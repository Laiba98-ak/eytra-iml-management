import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { isSupabaseConfigured } from './lib/supabaseClient'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (!isSupabaseConfigured) {
  // Without this, a missing config throws inside supabaseClient.ts at module load,
  // before React ever renders — the page just goes blank with no visible reason why.
  root.render(
    <div style={{ maxWidth: 560, margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', color: '#1f2937' }}>
      <h1 style={{ color: '#dc2626', fontSize: '1.5rem' }}>Configuration Missing</h1>
      <p style={{ marginTop: '1rem' }}>
        This app can't connect to its database because <code>VITE_SUPABASE_URL</code> and/or{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> aren't set for this deployment.
      </p>
      <p style={{ marginTop: '1rem' }}>
        Add them in your hosting platform's Environment Variables settings, then redeploy.
      </p>
    </div>
  )
} else {
  root.render(<App />)
}