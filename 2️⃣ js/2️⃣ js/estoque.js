import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showToast(message, type="success") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = type === "error" ? "toast error" : "toast";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

export async function movimentarEstoque() {
  const produto_id = document.getElementById("produto").value;
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const tipo = document.getElementById("tipo").value;

  if(!produto_id || !quantidade || !tipo) { 
    showToast("Preencha todos os campos!", "error"); 
    return; 
  }

  const { data, error } = await supabase.from("estoque").insert([{ produto_id, quantidade, tipo }]);
  if(error) { 
    showToast("Erro ao registrar!", "error"); 
    console.log(error); 
    return; 
  }

  showToast("Movimentação registrada!");
  document.getElementById("formEstoque").reset();
  listarEstoque();
}

export async function listarEstoque() {
  const { data, error } = await supabase
    .from("estoque")
    .select("id, produto_id, quantidade, tipo, criado_em, produtos(nome)")
    .order("criado_em", { ascending: false });
    
  if(error) { console.log(error); return; }
  const lista = document.getElementById("listaEstoque");
  let html = '<table><tr><th>ID</th><th>Produto</th><th>Quantidade</th><th>Tipo</th><th>Data</th></tr>';
  data.forEach(e => {
    const produtoNome = e.produtos ? e.produtos.nome : "Produto removido";
    html += `<tr${e.tipo === "saida" ? ' class="alert-low"' : ''}><td>${e.id}</td><td>${produtoNome}</td><td>${e.quantidade}</td><td>${e.tipo}</td><td>${new Date(e.criado_em).toLocaleString()}</td></tr>`;
  });
  html += '</table>';
  lista.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", listarEstoque);
