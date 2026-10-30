import { createClient } from '@supabase/supabase-js';
import { createRiverRepository } from './riverRepository';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey
  && !supabaseUrl.includes('your-project') && !supabaseAnonKey.includes('your-anon-key'));
export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const riverService = {
  ...createRiverRepository(supabase),
  isConfigured: () => isConfigured,
  getConfigInfo: () => ({ isConfigured, url: supabaseUrl ? supabaseUrl.replace(/(https?:\/\/)(.*)/, '$1***') : 'Não configurado', hasKey: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key')) }),
};
