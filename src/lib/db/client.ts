import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Database client is unavailable.');
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('localhost:8000') &&
  !supabaseUrl.includes('your-project') &&
  supabaseServiceKey &&
  !supabaseServiceKey.includes('dummy') &&
  !supabaseServiceKey.includes('your-service-role-key')
);

const createMockChain = () => {
  const chain: any = {
    select: () => chain,
    insert: () => Promise.resolve({ data: null, error: new Error('Supabase offline / not configured') }),
    update: () => Promise.resolve({ data: null, error: new Error('Supabase offline / not configured') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Supabase offline / not configured') }),
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: new Error('Supabase offline / not configured') }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return chain;
};

const mockClient: any = {
  from: () => createMockChain(),
};

// Client for public operations and browser environments
export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : mockClient;

// Client strictly for server-side secure operations (bypasses RLS)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : mockClient;

// Function to generate a client dynamically bound to a user's JWT
// This enforces RLS and prevents IDOR (as per Hostile Review Architecture updates)
export const createAuthenticatedClient = (jwt: string) => {
  if (!isSupabaseConfigured) return mockClient;
  return createClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    }
  );
};

