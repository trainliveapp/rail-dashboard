import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const missingConfigMessage =
  'Supabase credentials are missing. Copy .env.example to .env.local and fill in your project URL and anon key.'

function createNoopChain() {
  const chain = {
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: null, error: new Error(missingConfigMessage) }).then(
        onFulfilled,
        onRejected
      )
    },
    catch(onRejected) {
      return Promise.resolve({ data: null, error: new Error(missingConfigMessage) }).catch(onRejected)
    },
    finally(onFinally) {
      return Promise.resolve({ data: null, error: new Error(missingConfigMessage) }).finally(onFinally)
    },
  }

  return new Proxy(chain, {
    get(target, prop) {
      if (prop in target) return target[prop]
      return () => chain
    },
  })
}

function createNoopSupabaseClient() {
  const chain = createNoopChain()

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({ data: { session: null }, error: new Error(missingConfigMessage) }),
      signInWithPassword: async () => ({ data: { session: null }, error: new Error(missingConfigMessage) }),
    },
    channel: () => ({
      on() {
        return this
      },
      subscribe() {
        return this
      },
    }),
    removeChannel: async () => null,
    from: () => chain,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error(missingConfigMessage) }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : (() => {
        console.warn(missingConfigMessage)
        return createNoopSupabaseClient()
      })()

export { supabase }