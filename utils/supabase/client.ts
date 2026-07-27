import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  // NEXT_PUBLIC_* values are inlined at build time; read them at call time
  // so a missing value surfaces as a clear runtime error, not a build crash.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
};
