import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function atualizarTotais() {
  try {
    // Total de clientes
    const { data: clientes, error: errClientes } = await supabase.from("clientes").select("id");
    if(errClientes) throw errClientes;
    document.getElementById("totalClientes").innerText = clientes.length;

    // Total de produtos
    const { data: produtos, error: errProdutos } = await supabase.from("produtos").select("id");
    if(errProdutos) throw errProdutos;
    document.getElementById("totalProdutos").innerText = produtos.length;

    // Total de movimentações de estoque
    const { data: estoque, error: errEstoque } = await supabase.from("estoque").select("id");
    if(errEstoque) throw errEstoque;
    document.getElementById("totalMovs").innerText = estoque.length;

  } catch(error) {
    console.log("Erro ao atualizar totais:", error);
  }
}

// Atualizar ao carregar a página
document.addEventListener("DOMContentLoaded", atualizarTotais);
