import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCliente");
  const btnCancelar = document.getElementById("btnCancelar");
  const msg = document.getElementById("msg");

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    msg.textContent = "ID do cliente não informado.";
    msg.classList.add("msg-error");
    return;
  }

  carregarCliente(id);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "msg";

    const razao_social = document.getElementById("razao_social").value.trim();
    const cnpj = document.getElementById("cnpj").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const email = document.getElementById("email").value.trim();
    const endereco = document.getElementById("endereco").value.trim();

    if (!razao_social || !cnpj) {
      msg.textContent = "Preencha Razão Social e CNPJ.";
      msg.classList.add("msg-error");
      return;
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");

    // Anti duplicação ao editar: não deixar outro cliente com mesmo CNPJ
    const { data: jaExiste, error: erroBusca } = await supabase
      .from("clientes")
      .select("id")
      .eq("cnpj", cnpjLimpo)
      .neq("id", id);

    if (erroBusca) {
      console.error(erroBusca);
      msg.textContent = "Erro ao verificar CNPJ. Tente novamente.";
      msg.classList.add("msg-error");
      return;
    }

    if (jaExiste && jaExiste.length > 0) {
      msg.textContent = "Já existe outro cliente com esse CNPJ.";
      msg.classList.add("msg-error");
      return;
    }

    const { error } = await supabase
      .from("clientes")
      .update({
        razao_social,
        cnpj: cnpjLimpo,
        telefone: telefone || null,
        email: email || null,
        endereco: endereco || null
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      msg.textContent = "Erro ao atualizar cliente.";
      msg.classList.add("msg-error");
      return;
    }

    msg.textContent = "Cliente atualizado com sucesso!";
    msg.classList.add("msg-success");

    setTimeout(() => {
      window.location.href = "clientes.html";
    }, 800);
  });

  btnCancelar.addEventListener("click", () => {
    window.location.href = "clientes.html";
  });
});

async function carregarCliente(id) {
  const msg = document.getElementById("msg");

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    msg.textContent = "Erro ao carregar dados do cliente.";
    msg.classList.add("msg-error");
    return;
  }

  document.getElementById("razao_social").value = data.razao_social || "";
  document.getElementById("cnpj").value = data.cnpj || "";
  document.getElementById("telefone").value = data.telefone || "";
  document.getElementById("email").value = data.email || "";
  document.getElementById("endereco").value = data.endereco || "";
}
