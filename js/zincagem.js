import { supabase, verificarLogin } from "./auth.js";

let produtos = [];
let produtoSelecionado = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  await carregarProdutos();
  configurarEventos();
});

// =============================
// Carregar produtos (SEM FILTRO NA API)
// =============================
async function carregarProdutos(){
  const { data, error } = await supabase
    .from("produtos")
    .select("id, codigo, comprimento, acabamento, peso_liquido, peso_bruto, pecas_por_caixa, usar_em_acabamento")
    .order("codigo");

  if(error){
    alert("Erro ao carregar produtos");
    console.error(error);
    return;
  }

  // Filtra no JS, não no Supabase
  produtos = data.filter(p => p.usar_em_acabamento === true);

  const select = document.getElementById("produtoSelect");
  select.innerHTML = `<option value="">Selecione</option>`;

  produtos.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.codigo;
    select.appendChild(opt);
  });
}

// =============================
// Eventos
// =============================
function configurarEventos(){
  document.getElementById("produtoSelect").addEventListener("change", e=>{
    produtoSelecionado = produtos.find(p=>p.id == e.target.value);
    if(!produtoSelecionado) return;

    document.getElementById("comp").value = produtoSelecionado.comprimento || "";
    document.getElementById("servico").value = produtoSelecionado.acabamento || "";
    document.getElementById("ppc").value = produtoSelecionado.pecas_por_caixa || "";

    recalcular();
  });

  document.getElementById("kg").addEventListener("input", recalcular);
  document.getElementById("btnSalvar").addEventListener("click", salvar);
}

// =============================
// Cálculos
// =============================
function recalcular(){
  if(!produtoSelecionado) return;

  const kg = parseFloat(document.getElementById("kg").value || 0);

  const quantidade = kg / (produtoSelecionado.peso_liquido || 1);
  const kgBruto = quantidade * (produtoSelecionado.peso_bruto || 0);

  document.getElementById("quantidade").value = quantidade.toFixed(0);
  document.getElementById("kgBruto").value = kgBruto.toFixed(2);
}

// =============================
// Salvar
// =============================
async function salvar(){
  if(!produtoSelecionado){
    alert("Selecione o produto");
    return;
  }

  const payload = {
    op: document.getElementById("op").value,
    data: document.getElementById("data").value,
    produto_id: produtoSelecionado.id,
    codigo_peca: produtoSelecionado.codigo,
    comp: produtoSelecionado.comprimento,
    pecas_por_caixa: produtoSelecionado.pecas_por_caixa,
    servico: produtoSelecionado.acabamento,
    kg: parseFloat(document.getElementById("kg").value),
    quantidade: parseFloat(document.getElementById("quantidade").value),
    kg_material_bruto: parseFloat(document.getElementById("kgBruto").value),
    peso_caixa: produtoSelecionado.peso_bruto,
    entregue: document.getElementById("entregue").value === "true",
    boleto: document.getElementById("boleto").value === "true"
  };

  const { error } = await supabase
    .from("zincagem_tratamento")
    .insert(payload);

  if(error){
    alert("Erro ao salvar");
    console.error(error);
  } else {
    alert("Registro salvo");
    window.location.reload();
  }
}
