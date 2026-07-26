// =========================================================
// Configuração do Supabase
// Substitui pelos dados do teu projeto (Supabase Studio > Project Settings > API)
// =========================================================
const SUPABASE_URL = "https://mfsywwojegtyyofzpvca.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OaTYRFWZG7cici5Rnxe20A_7zxUAFqd";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
