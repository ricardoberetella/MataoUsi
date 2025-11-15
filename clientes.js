import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) window.location.href = "index.html";
}

// Função para cadastrar cliente
async function cadastrarCliente() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;

  if (!nome || !email) {
    alert("Nome e email são obrigatórios!");
    return;
  }

  const { data, error } = await supabase.from('clientes').insert([
    { nome, email, telefone }
  ]);

  if (error) {
    alert("Erro: " + error.message);
  } else {
    alert("Cliente cadastrado com sucesso!");
    document.getElementById("nome").value = '';
    document.getElementById("email").value = '';
    document.getElementById("telefone").value = '';
    listarClientes();
  }
}

// Função para listar clientes
async function listarClientes() {
  const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true });

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  const tbody = document.querySelector("#tabelaClientes tbody");
  tbody.innerHTML = '';
  data.forEach(cliente => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cliente.nome}</td>
      <td>${cliente.email}</td>
      <td>${cliente.telefone || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Evento do botão
document.getElementById("btnCadastrar").onclick = cadastrarCliente;

// Checa se usuário está logado
checkUser();
listarClientes();
