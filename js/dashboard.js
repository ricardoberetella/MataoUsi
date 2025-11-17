import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Criar cliente supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO DO PAINEL (impede acesso sem login)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const { data, error } = await supabase.auth.getSession();

  // Se não estiver logado → manda para login
  if (!data || !data.session) {
    window.location.href = "index.html";
  }
}

protegerPagina();

// -----------------------------------------------------------------------------
// CARREGAR MÓDULOS DINAMICAMENTE
// -----------------------------------------------------------------------------
window.carregarModulo = async function (modulo) {
  const conteudo = document.getElementById("conteudo");

  if (modulo === "pecas") {
    const html = await fetch("pecas.html").then(r => r.text());
    conteudo.innerHTML = html;
  }
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};
