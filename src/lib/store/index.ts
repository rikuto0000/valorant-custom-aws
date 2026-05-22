import type { IDataStore } from './interface';
import { DemoStore } from './demo-store';
import { hasSupabaseServerConfig } from '../supabase/server';

let store: IDataStore | null = null;

export function getStore(): IDataStore {
  if (store) return store;

  if (hasSupabaseServerConfig()) {
    // Dynamic require keeps the local demo mode build-safe when env vars are absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseStore } = require('./supabase-store');
    store = new SupabaseStore();
  } else {
    store = DemoStore.getInstance();
  }

  return store!;
}

export type { IDataStore } from './interface';
