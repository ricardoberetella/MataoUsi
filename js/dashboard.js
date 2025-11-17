import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Impede acesso sem login
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();

  if (!data || !data.session) {
    window.location.href = "index.html";
    return;
  }
}

protegerPagina();

// Logout
window.logout = async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};
