// =========================================================
// Configuração do Supabase
// Substitui pelos dados do teu projeto (Supabase Studio > Project Settings > API)
// =========================================================
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_PUBLICA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
