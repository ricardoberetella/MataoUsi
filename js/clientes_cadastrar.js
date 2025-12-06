import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCliente");
  const btnCancelar = document.getElementById("btnCancelar");
  const msg = document.getElementById("msg");

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

    // REMOVE MÁSCARA DO CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, "");

    // FORMATA TELEFONE
    const telefoneLimpo = telefone.replace(/\D/g, "");
    const telefoneFormatado =
      telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1)$2-$3");

    // 🔥 CONSULTA NA COLUNA CORRETA
    const { data: jaExiste, error: erroBusca } = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf_cnpj", cnpjLimpo);

    if (erroBusca) {
      console.error(erroBusca);
      msg.textContent = "Erro ao verificar CNPJ.";
      msg.classList.add("msg-error");
      return;
    }

    if (jaExiste && jaExiste.length > 0) {
      msg.textContent = "Já existe um cliente com esse CNPJ.";
      msg.classList.add("msg-error");
      return;
    }

    // 🔥 SALVA USANDO A COLUNA CORRETA
    const { error } = await supabase.from("clientes").insert([
      {
        razao_social,
        cpf_cnpj: cnpjLimpo,
        telefone: telefoneFormatado || null,
        email: email || null,
        endereco: endereco || null
      }
    ]);

    if (error) {
      console.error(error);
      msg.textContent = "Erro ao salvar cliente.";
      msg.classList.add("msg-error");
      return;
    }

    msg.textContent = "Cliente cadastrado com sucesso!";
    msg.classList.add("msg-success");

    setTimeout(() => {
      window.location.href = "clientes.html";
    }, 800);
  });

  btnCancelar.addEventListener("click", () => {
    window.location.href = "clientes.html";
  });
});
