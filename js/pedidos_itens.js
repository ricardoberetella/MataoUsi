import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =====================================================================
   ELEMENTOS
===================================================================== */
const listaItens = document.getElementById("listaItens");
const modal = document.getElementById("modalItem");
const produtoSelect = document.getElementById("produtoId");
const totalSpan = document.getElementById("totalPedido");

document.getElementById("btnAddItem").onclick = () => abrirModal();
document.getElementById("btnCancelarItem").onclick = () => fecharModal();
document.getElementById("btnSalvarItem").onclick = () => salvarItem();

/* =====================================================================
   PEGAR ID DO PEDIDO (via URL)
===================================================================== */
const urlParams = new URLSearchParams(window.location.search);
const pedidoId = urlParams.get("pedido");

/* =====================================================================
   ALERTA FUTURISTA
===================================================================== */
function alerta(msg, tipo = "info") {
  const box = document.createElement("div");
  box.className = `alert ${tipo}`;
  box.innerText = msg;

  document.body.appendChild(box);
  setTimeout(() => box.classList.add("show"), 20);

  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

/* =====================================================================
   FORMATADOR BR
===================================================================== */
function formatBR(v) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/* =====================================================================
   INICIALIZAÇÃO
===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  carregarItens();
});

/* =====================================================================
   CARREGAR PRODUTOS
===================================================================== */
async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("descricao");

  if (error) {
    alerta("Erro ao carregar produtos!", "erro");
    return;
  }

  produtoSelect.innerHTML = "";

  data.forEach(p => {
    const op = document.createElement("option");
    op.value = p.id;
    op.textContent = `${p.codigo} - ${p.descricao}`;
    produtoSelect.appendChild(op);
  });
}

/* =====================================================================
   CARREGAR ITENS DO PEDIDO
===================================================================== */
async function carregarItens() {
  const { data: itens, error } = await supabase
    .from("pedidos_itens")
    .select("*, produtos(codigo, descricao)")
    .eq("pedido_id", pedidoId)
    .order("id", { ascending: true });

  if (error) {
    alerta("Erro ao carregar itens!", "erro");
    return;
  }

  listaItens.innerHTML = "";

  if (!itens || itens.length === 0) {
    listaItens.innerHTML = `<div class="item" style="opacity:0.7;">Nenhum item adicionado.</div>`;
    totalSpan.textContent = "0,00";
    return;
  }

  let totalPedido = 0;

  itens.forEach(i => {
    totalPedido += Number(i.total);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>${i.produtos.codigo} - ${i.produtos.descricao}</strong><br>
        Qtd: ${i.quantidade} — Preço: R$ ${formatBR(i.preco)}<br>
        <small>Total: R$ ${formatBR(i.total)}</small>
      </div>
      <button class="btn-excluir" onclick="excluirItem(${i.id})">Excluir</button>
    `;

    listaItens.appendChild(div);
  });

  totalSpan.textContent = formatBR(totalPedido);

  // Atualiza total no pedido
  await supabase
    .from("pedidos")
    .update({ total: totalPedido })
    .eq("id", pedidoId);
}

/* =====================================================================
   EXCLUIR ITEM
===================================================================== */
window.excluirItem = async function (id) {
  const { error } = await supabase
    .from("pedidos_itens")
    .delete()
    .eq("id", id);

  if (error) {
    alerta("Erro ao excluir item!", "erro");
    return;
  }

  alerta("Item removido!", "sucesso");
  carregarItens();
};

/* =====================================================================
   MODAL
===================================================================== */
function abrirModal() {
  document.getElementById("quantidade").value = "";
  document.getElementById("preco").value = "";
  modal.classList.remove("hidden");
}

function fecharModal() {
  modal.classList.add("hidden");
}

/* =====================================================================
   SALVAR ITEM
===================================================================== */
async function salvarItem() {
  const produto_id = produtoSelect.value;
  const qtd = Number(document.getElementById("quantidade").value);
  let preco = document.getElementById("preco").value.replace(",", ".");

  if (!produto_id) return alerta("Selecione um produto!", "erro");
  if (!qtd || qtd <= 0) return alerta("Quantidade inválida!", "erro");
  if (!preco || isNaN(preco)) return alerta("Preço inválido!", "erro");

  preco = Number(preco);
  const total = qtd * preco;

  const { error } = await supabase.from("pedidos_itens").insert({
    pedido_id: pedidoId,
    produto_id,
    quantidade: qtd,
    preco,
    total
  });

  if (error) {
    alerta("Erro ao adicionar item!", "erro");
    return;
  }

  alerta("Item adicionado!", "sucesso");
  fecharModal();
  carregarItens();
}
