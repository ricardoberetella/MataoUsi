import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uxtgicfuggpuyjybwawa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdpY2Z1Z2dwdXlqeWJ3YXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNjIyNjIsImV4cCI6MjA3ODgzODI2Mn0.bYAyuTccwk21yWiYrFt_v6mWubDWJGVRWT0rJT74fGg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// logout automático ao clicar
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// para funcionar no botão padrão do dashboard
document.addEventListener("DOMContentLoaded", () => {
  const botao = document.getElementById("btnLogout");
  if (botao) {
    botao.addEventListener("click", logout);
  }
});
