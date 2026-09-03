const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL ERROR] Supabase URL or Secret Key is missing in production.');
    process.exit(1);
  } else {
    console.warn('[WARNING] SUPABASE_URL or SUPABASE_SECRET_KEY is missing in dev environment.');
  }
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseSecretKey || 'placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

module.exports = supabase;
