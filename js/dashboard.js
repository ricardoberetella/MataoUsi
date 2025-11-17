import { carregarFormularioPecas } from "./pecas.js";
import { supabase } from "./config.js";

// Proteger acesso
async function protegerPagina() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
  }
}
protegerPagina();

window.carregarModulo = function (modulo) {
  const conteudo = document.getElementById("conteudo");

  switch (modulo) {
    case "pecas":
      carregarFormularioPecas();
      break;

    default:
      conteudo.innerHTML = "<h1>MataoUsi</h1>";
  }
};

window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};
