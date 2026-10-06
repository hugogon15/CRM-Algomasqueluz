import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://vcmrrbzmyvbitnimreak.supabase.co"
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjbXJyYnpteXZiaXRuaW1yZWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc2MjEsImV4cCI6MjA5NTM3MzYyMX0.gyXfMEYPDOLw0tcw-wUVurS6SUECcThE8PCVvQFFR0s"

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)