import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showToast(message, type="success") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = type === "error" ? "toast error" : "toast";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

export async function cadastrarProduto() {
  const nome = document.getElementById("nomeProduto").value;
  const sku = document.getElementById("sku").value;
  const preco = document.getElementById("preco").value;

  if(!nome || !sku || !preco) { 
    showToast("Preencha todos os campos!", "error"); 
    return; 
  }

  const { data, error } = await supabase.from("produtos").insert([{ nome, sku, preco }]);
  if(error) { 
    showToast("Erro ao cadastrar!", "error"); 
    console.log(error); 
    return; 
  }

  showToast("Produto cadastrado com sucesso!");
  document.getElementById("formProduto").reset();
  listarProdutos();
}

export async function listarProdutos() {
  const { data, error } = await supabase.from("produtos").select("*");
  if(error) { console.log(error); return; }
  const lista = document.getElementById("listaProdutos");
  let html = '<table><tr><th>ID</th><th>Nome</th><th>SKU</th><th>Preço</th></tr>';
  data.forEach(p => html += `<tr><td>${p.id}</td><td>${p.nome}</td><td>${p.sku}</td><td>${p.preco}</td></tr>`);
  html += '</table>';
  lista.innerHTML = html;

  // Preencher select de produtos no estoque
  const selectProduto = document.getElementById("produto");
  if(selectProduto) {
    selectProduto.innerHTML = '<option value="">Selecione Produto</option>';
    data.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.nome;
      selectProduto.appendChild(option);
    });
  }
}

document.addEventListener("DOMContentLoaded", listarProdutos);
