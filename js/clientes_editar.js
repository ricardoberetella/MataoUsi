import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// PEGAR ID DA URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// CAMPOS
const razao = document.getElementById("razao");
const cnpj = document.getElementById("cnpj");
const telefone = document.getElementById("telefone");
const email = document.getElementById("email");
const endereco = document.getElementById("endereco");
const form = document.getElementById("formEditar");

async function carregar() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar dados");
    return;
  }

  razao.value = data.razao_social;
  cnpj.value = data.cpf_cnpj;
  telefone.value = data.telefone;
  email.value = data.email;
  endereco.value = data.endereco;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { error } = await supabase
    .from("clientes")
    .update({
      razao_social: razao.value,
      cpf_cnpj: cnpj.value,
      telefone: telefone.value,
      email: email.value,
      endereco: endereco.value
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao salvar");
    return;
  }

  alert("Alterações salvas!");
  window.location = "clientes.html";
});

carregar();
