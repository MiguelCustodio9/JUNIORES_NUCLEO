// =========================================================
// Configuração do Supabase
// Substitui pelos dados do teu projeto (Supabase Studio > Project Settings > API)
// =========================================================
const SUPABASE_URL = "https://mfsywwojegtyyofzpvca.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mc3l3d29qZWd0eXlvZnpwdmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwOTU3MzAsImV4cCI6MjEwMDY3MTczMH0.y5UJ8_hdKcOVScqttTUpdeVOMfipWy280CYwiaCWUiA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
