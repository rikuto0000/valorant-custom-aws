"use client";

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<Database>(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return browserClient;
}
