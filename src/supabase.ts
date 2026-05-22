import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://gzjkehpqjixarriignrt.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6amtlaHBxaml4YXJyaWlnbnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDAzOTcsImV4cCI6MjA5MzcxNjM5N30.7WXQTB3CB5bu6Orbl7PBxFXenPbRhS4fi61XdVI0oNU"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
