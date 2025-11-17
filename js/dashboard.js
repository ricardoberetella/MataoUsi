import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// PROTEÇÃO — MODO PRODUÇÃO (SESSÃO OBRIGATÓRIA)
// -----------------------------------------------------------------------------
async function protegerPagina() {
  const { data, error } = await supabase.auth.getSession();

  // SE NÃO ESTIVER LOGADO → VAI PARA LOGIN
  if (!data || !data.session) {
    console.warn("Nenhuma sessão → voltando para login");
    window.location.replace("index.html");
    return;
  }

  console.log("Sessão válida → painel liberado");
}

protegerPagina();

// -----------------------------------------------------------------------------
// CARREGAR MÓDULOS
// -----------------------------------------------------------------------------
window.carregarModulo = async modulo => {
  const conteudo = document.getElementById("conteudo");

  switch (modulo) {
    case "pecas":
      conteudo.innerHTML = await fetch("pecas.html").then(r => r.text());
      break;

    case "empresas":
      conteudo.innerHTML = await fetch("empresas.html").then(r => r.text());
      break;

    case "produtos":
      conteudo.innerHTML = await fetch("produtos.html").then(r => r.text());
      break;

    case "estoque":
      conteudo.innerHTML = await fetch("estoque.html").then(r => r.text());
      break;

    case "mov":
      conteudo.innerHTML = await fetch("movimentacoes.html").then(r => r.text());
      break;

    case "rel":
      conteudo.innerHTML = await fetch("relatorios.html").then(r => r.text());
      break;

    default:
      conteudo.innerHTML = "<h2>Módulo não encontrado</h2>";
  }
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
window.logout = async () => {
  await supabase.auth.signOut();
  window.location.replace("index.html");
};
