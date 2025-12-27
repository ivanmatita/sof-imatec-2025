
import { createClient } from '@supabase/supabase-js';

/**
 * Conexão segura com o banco de dados via Supabase.
 * Credenciais de produção atualizadas para a base de dados: software.
 */
const SUPABASE_URL = "https://snnqhefxvjkwgvllzecw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnFoZWZ4dmprd2d2bGx6ZWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTA4NzYsImV4cCI6MjA4MTcyNjg3Nn0.PMCXMOxms5saVEY1BV1n5PHjVzTB12lIE2NR-o_3K6k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
