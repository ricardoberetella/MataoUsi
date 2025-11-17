import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO — VERSÃO DEFINITIVA (sem loop, sem piscar!)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const session = (await supabase.auth.getSession())?.data?.session;

  // Só redireciona se 100% confirmado que NÃO tem sessão
  if (!session) {
    console.log("🛑 Sem sessão → voltando para login");
    setTimeout(() => {
      window.location.replace("index.html");
    }, 500); // Espera meio segundo para evitar loop
  } else {
    console.log("✅ Sessão encontrada → acesso liberado");
  }
}

// Só executa depois da página estar totalmente carregada
window.onload = protegerPagina;

// -----------------------------------------------------------------------------
// MÓDULOS
// -----------------------------------------------------------------------------
window.carregarModulo = async modulo => {
  const conteudo = document.getElementById("conteudo");

  if (modulo === "pecas") {
    const html = await fetch("pecas.html").then(r => r.text());
    conteudo.innerHTML = html;
  }
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
window.logout = async () => {
  await supabase.auth.signOut();
  window.location.replace("index.html");
};
