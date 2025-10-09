import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plgcegacfsyezmpazunm.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZ2NlZ2FjZnN5ZXptcGF6dW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzQ3NDgsImV4cCI6MjA3MjkxMDc0OH0.XUh9P9LJw_IGQKx505RBd9qZN-_7UzaB5p_eqx4RgWo'

export const supabase = createClient(supabaseUrl, supabaseKey)