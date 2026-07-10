import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials are missing. Copy .env.example to .env.local and fill in your project URL and anon key.'
  )
}

// flowType: 'pkce' is required here, not optional. The app uses HashRouter
// (needed for GitHub Pages), and Supabase's default "implicit" auth flow
// puts tokens in the URL hash, which collides with hash-based routing.
// PKCE puts the code in a ?code= query param instead, which is safe to
// combine with a #/route hash.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // we exchange the code manually on the pages that need it
  },
})
