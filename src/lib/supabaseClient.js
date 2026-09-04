import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY PREFIX:", supabaseAnonKey?.slice(0, 15));
const missingConfigMessage =
  "Supabase credentials are missing. Copy .env.example to .env.local and fill in your project URL and anon key.";

const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
);

function createNoopSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({
        data: { session: null },
        error: new Error(missingConfigMessage),
      }),
      signInWithPassword: async () => ({
        data: { session: null },
        error: new Error(missingConfigMessage),
      }),
    },

    from: () => ({
      select() {
        return this;
      },
      insert() {
        return this;
      },
      update() {
        return this;
      },
      delete() {
        return this;
      },
      eq() {
        return this;
      },
      in() {
        return this;
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      then(resolve) {
        return Promise.resolve({
          data: null,
          error: new Error(missingConfigMessage),
        }).then(resolve);
      },
    }),

    storage: {
      from: () => ({
        upload: async () => ({
          data: null,
          error: new Error(missingConfigMessage),
        }),
        getPublicUrl: () => ({
          data: { publicUrl: "" },
        }),
      }),
    },

    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),

    removeChannel: async () => null,
  };
}

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
  flowType: 'pkce',
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
},
    })
  : createNoopSupabaseClient();

export { supabase, isSupabaseConfigured };