import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Missing Supabase URL. Please check your .env file.');
}

if (!supabaseAnonKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing Supabase Anon Key. Please check your .env file.');
}

console.log('✅ Supabase configuration loaded:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection on initialization
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', error);
  } else {
    console.log('✅ Supabase connected successfully');
  }
});