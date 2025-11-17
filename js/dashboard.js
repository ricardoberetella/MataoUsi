import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO DO PAINEL (versão segura, sem loop!)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();

  // 👉 Só redireciona se o Supabase REALMENTE confirmou a ausência da sessão
  if (data?.session === null) {
    window.location.replace("index.html"); // replace evita “voltar”
  }
}

// NÃO chama protegerPagina imediatamente.
// Espera o navegador carregar tudo primeiro.
window.addEventListener("DOMContentLoaded", protegerPagina);

// -----------------------------------------------------------------------------
// CARREGAR MÓDULOS
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
  window.location.replace("index.html");
};
