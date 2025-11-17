import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO — MODO DEBUG (SEM REDIRECIONAMENTO)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const { data, error } = await supabase.auth.getSession();

  console.log("Sessão atual:", data);

  // 🔥 NÃO REDIRECIONA — só exibe no console
  if (!data || !data.session) {
    console.warn("⚠ Nenhuma sessão encontrada! (mas não redirecionando)");
    return;
  }

  console.log("Sessão OK → painel liberado");
}

protegerPagina();

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
