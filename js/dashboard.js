import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Proteção da página
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();

  // Se não estiver logado, volta para o login
  if (!data.session) {
    window.location.href = "index.html";
  }
}

protegerPagina();
