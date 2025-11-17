import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO — versão estável (SEM LOOP, SEM PISCAR)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();

  // SE NÃO TIVER SESSÃO → MANDA PARA LOGIN APENAS UMA VEZ
  if (!data || !data.session) {
    console.log("Sem sessão → indo para login");
    window.location.replace("index.html");
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
