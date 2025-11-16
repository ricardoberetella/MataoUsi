import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarEmpresas();

  document.getElementById("btnSalvarEmpresa").addEventListener("click", salvarEmpresa);
});

async function salvarEmpresa() {
  const empresa = {
    razao_social: document.getElementById("emp-razao").value,
    nome_fantasia: document.getElementById("emp-fantasia").value,
    cpf_cnpj: document.getElementById("emp-cnpj").value,
    telefone: document.getElementById("emp-telefone").value,
    email: document.getElementById("emp-email").value,
    endereco: document.getElementById("emp-endereco").value,
  };

  const { error } = await supabase.from("empresas").insert([empresa]);

  if (error) alert("Erro ao salvar empresa!");
  else {
    alert("Empresa salva!");
    carregarEmpresas();
  }
}

async function carregarEmpresas() {
  const tabela = document.querySelector("#tabela-empresas tbody");
  tabela.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data } = await supabase.from("empresas").select("*").order("id", { ascending: false });

  tabela.innerHTML = "";

  data.forEach(emp => {
    tabela.innerHTML += `
      <tr>
        <td>${emp.id}</td>
        <td>${emp.razao_social}</td>
        <td>${emp.nome_fantasia}</td>
        <td>${emp.telefone}</td>
        <td>${emp.email}</td>
      </tr>
    `;
  });
}
