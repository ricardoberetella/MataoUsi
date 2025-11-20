import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const listaItens = document.getElementById("listaItens");
const modal = document.getElementById("modalItem");
const produtoSelect = document.getElementById("produtoId");
const totalSpan = document.getElementById("totalPedido");

document.getElementById("btnAddItem").onclick = () => abrirModal();
document.getElementById("btnCancelarItem").onclick = () => fecharModal();
document.getElementById("btnSalvarItem").onclick = () => salvarItem();

// PEGAR ID DO PEDIDO DA URL
const urlParams = new URLSearchParams(window.location.search);
const pedidoId = urlParams.get("pedido");

document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  carregarItens();
});

// ------------------------------------
// CARREGAR PRODUTOS
// ------------------------------------
async function carregarProdutos() {
  const { data } = await supabase.from("produtos").select("*").order("descricao");

  produtoSelect.innerHTML = "";

  data.forEach(p => {
    const op = document.createElement("option");
    op.value = p.id;
    op.textContent = `${p.codigo} - ${p.descricao}`;
    produtoSelect.appendChild(op);
  });
}

// ------------------------------------
// CARREGAR ITENS DO PEDIDO
// ------------------------------------
async function carregarItens() {
  const { data: itens } = await supabase
    .from("pedidos_itens")
    .select("*, produtos(descricao, codigo)")
    .eq("pedido_id", pedidoId);

  listaItens.innerHTML = "";

  let totalPedido = 0;

  itens.forEach(i => {
    totalPedido += Number(i.total);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>${i.produtos.codigo} - ${i.produtos.descricao}</strong><br>
        Qtd: ${i.quantidade} — Preço: R$ ${Number(i.preco).toFixed(2)}
      </div>
      <button class="btn-excluir" onclick="excluirItem(${i.id})">Excluir</button>
    `;

    listaItens.appendChild(div);
  });

  totalSpan.textContent = totalPedido.toFixed(2);

  // Atualizar o total do pedido na tabela PEDIDOS
  await supabase
    .from("pedidos")
    .update({ total: totalPedido })
    .eq("id", pedidoId);
}

// ------------------------------------
// EXCLUIR ITEM
// ------------------------------------
window.excluirItem = async function (id) {
  await supabase.from("pedidos_itens").delete().eq("id", id);
  carregarItens();
};

// ------------------------------------
// ADICIONAR ITEM
// ------------------------------------
function abrirModal() {
  modal.classList.remove("hidden");
}

function fecharModal() {
  modal.classList.add("hidden");
}

async function salvarItem() {
  const produto_id = produtoSelect.value;
  const quantidade = Number(document.getElementById("quantidade").value);
  const preco = Number(document.getElementById("preco").value.replace(",", "."));
  const total = quantidade * preco;

  await supabase.from("pedidos_itens").insert({
    pedido_id: pedidoId,
    produto_id,
    quantidade,
    preco,
    total
  });

  fecharModal();
  carregarItens();
}
