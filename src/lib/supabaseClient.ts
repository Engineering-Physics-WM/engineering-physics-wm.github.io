import { createClient } from "@supabase/supabase-js";

import type { AppDatabase } from "../types/domain";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const supabase = isSupabaseConfigured
  ? createClient<AppDatabase>(supabaseUrl, supabasePublishableKey)
  : null;

export { isSupabaseConfigured, supabase };
