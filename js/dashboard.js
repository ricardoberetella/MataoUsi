import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Proteção da página
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
  }
}

protegerPagina();

// ----------------------------------------------------------------------------------
// CARREGAR MÓDULOS
// ----------------------------------------------------------------------------------

window.carregarModulo = async function (modulo) {
  const conteudo = document.getElementById("conteudo");

  if (modulo === "pecas") {
    const html = await fetch("pecas.html").then(r => r.text());
    conteudo.innerHTML = html;
  }
};

// ----------------------------------------------------------------------------------
// LOGOUT
// ----------------------------------------------------------------------------------

window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};
