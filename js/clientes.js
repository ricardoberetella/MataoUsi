import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showToast(message, type="success") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = type === "error" ? "toast error" : "toast";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

export async function cadastrarCliente() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  if(!nome || !email) { showToast("Preencha todos os campos!", "error"); return; }

  const { data, error } = await supabase.from("clientes").insert([{ nome, email }]);
  if(error) { showToast("Erro ao cadastrar!", "error"); console.log(error); return; }

  showToast("Cliente cadastrado com sucesso!");
  document.getElementById("formCliente").reset();
  listarClientes();
}

export async function listarClientes() {
  const { data, error } = await supabase.from("clientes").select("*");
  if(error) { console.log(error); return; }
  const lista = document.getElementById("listaClientes");
  let html = '<table><tr><th>ID</th><th>Nome</th><th>Email</th></tr>';
  data.forEach(c => html += `<tr><td>${c.id}</td><td>${c.nome}</td><td>${c.email}</td></tr>`);
  html += '</table>';
  lista.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", listarClientes);
