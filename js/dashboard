import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Proteção da página
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
  }
}
protegerPagina();

window.carregarModulo = function (modulo) {
  switch (modulo) {
    case "pecas":
      carregarFormularioPecas();
      break;
    default:
      document.getElementById("conteudo").innerHTML = "<h1>Painel MataoUsi</h1>";
  }
};

window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};
