import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let pedidoId = null;
let itens = [];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  pedidoId = Number(params.get("pedido_id"));

  if (!pedidoId) {
    alert("ID do pedido não informado.");
    window.location.href = "pedidos.html";
    return;
  }

  carregarPedido();
  carregarItens();
});

async function carregarPedido() {
  const info = document.getElementById("infoPedido");

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      data_pedido,
      tipo_documento,
      numero_documento,
      total,
      clientes ( razao_social )
    `)
    .eq("id", pedidoId)
    .single();

  if (error) {
    console.error(error);
    info.textContent = "Erro ao carregar cabeçalho do pedido.";
    return;
  }

  info.textContent =
    `Pedido ${data.tipo_documento} ${data.numero_documento} • ` +
    `${data.clientes?.razao_social || ""} • ` +
    `Data: ${formatarDataBR(data.data_pedido)} • Total: ${formatarMoeda(data.total)}`;
}

async function carregarItens() {
  const msgErro = document.getElementById("msgErro");
  msgErro.textContent = "";

  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      produto_id,
      quantidade,
      valor_unitario,
      valor_total,
      data_entrega,
      quantidade_entregue,
      status,
      produtos ( codigo, descricao )
    `)
    .eq("pedido_id", pedidoId)
    .order("id");

  if (error) {
    console.error(error);
    msgErro.textContent = "Erro ao carregar itens: " + error.message;
    return;
  }

  itens = data;
  montarTabelaItens();
}

function montarTabelaItens() {
  const tbody = document.getElementById("listaItens");
  tbody.innerHTML = "";

  if (!itens || itens.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.textContent = "Nenhum item encontrado para este pedido.";
    td.style.textAlign = "center";
    td.style.color = "#9ca3af";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  itens.forEach(item => {
    const restante = Number(item.quantidade) - Number(item.quantidade_entregue || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.produtos?.codigo || ""}</td>
      <td>${item.produtos?.descricao || ""}</td>
      <td>${item.quantidade}</td>
      <td>${item.quantidade_entregue || "0"}</td>
      <td>${restante}</td>
      <td>${formatarMoeda(item.valor_unitario)}</td>
      <td>${formatarMoeda(item.valor_total)}</td>
      <td>${item.data_entrega ? formatarDataBR(item.data_entrega) : ""}</td>
      <td>${item.status || "Aberto"}</td>
      <td>
        <button class="btn btn-secondary btn-sm" data-entrega="${item.id}">Entregar</button>
        <button class="btn btn-secondary btn-sm" data-editar="${item.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-excluir="${item.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-entrega]").forEach(b => {
    b.addEventListener("click", () => {
      const id = Number(b.getAttribute("data-entrega"));
      registrarEntrega(id);
    });
  });

  tbody.querySelectorAll("button[data-editar]").forEach(b => {
    b.addEventListener("click", () => {
      const id = Number(b.getAttribute("data-editar"));
      editarItem(id);
    });
  });

  tbody.querySelectorAll("button[data-excluir]").forEach(b => {
    b.addEventListener("click", () => {
      const id = Number(b.getAttribute("data-excluir"));
      excluirItem(id);
    });
  });
}

/* ----------- REGISTRAR ENTREGA COM HISTÓRICO ----------- */

async function registrarEntrega(itemId) {
  const item = itens.find(i => i.id === itemId);
  if (!item) return;

  const restante = Number(item.quantidade) - Number(item.quantidade_entregue || 0);
  if (restante <= 0) {
    alert("Este item já está totalmente entregue.");
    return;
  }

  const qtdStr = window.prompt(`Quantidade a entregar (restam ${restante}):`, restante);
  if (!qtdStr) return;

  const qtd = Number(qtdStr);
  if (Number.isNaN(qtd) || qtd <= 0 || qtd > restante) {
    alert("Quantidade inválida.");
    return;
  }

  // histórico: insere em pedidos_itens_entregas
  const { error: errHist } = await supabase
    .from("pedidos_itens_entregas")
    .insert({
      pedido_item_id: itemId,
      quantidade: qtd
      // data_entrega = hoje (default)
    });

  if (errHist) {
    console.error(errHist);
    alert("Erro ao registrar entrega (histórico).");
    return;
  }

  // atualiza quantidade_entregue no item
  const novaEntregue = Number(item.quantidade_entregue || 0) + qtd;
  let novoStatus = "Aberto";
  if (novaEntregue >= item.quantidade) {
    novoStatus = "Entregue";
  } else if (novaEntregue > 0 && novaEntregue < item.quantidade) {
    novoStatus = "Parcial";
  }

  const { error: errItem } = await supabase
    .from("pedidos_itens")
    .update({
      quantidade_entregue: novaEntregue,
      status: novoStatus
    })
    .eq("id", itemId);

  if (errItem) {
    console.error(errItem);
    alert("Erro ao atualizar item.");
    return;
  }

  await carregarItens();
}

/* ----------- EDIÇÃO SIMPLES DE ITEM ----------- */

async function editarItem(itemId) {
  const item = itens.find(i => i.id === itemId);
  if (!item) return;

  const novaQtdStr = window.prompt("Nova quantidade solicitada:", item.quantidade);
  if (!novaQtdStr) return;
  const novaQtd = Number(novaQtdStr);
  if (Number.isNaN(novaQtd) || novaQtd <= 0) {
    alert("Quantidade inválida.");
    return;
  }

  const novoUnitStr = window.prompt("Novo valor unitário:", item.valor_unitario);
  if (!novoUnitStr) return;
  const novoUnit = Number(novoUnitStr.replace(",", "."));
  if (Number.isNaN(novoUnit) || novoUnit < 0) {
    alert("Valor inválido.");
    return;
  }

  const novaData = window.prompt(
    "Nova data de entrega (AAAA-MM-DD) ou deixe em branco:",
    item.data_entrega || ""
  );

  const novoTotal = novaQtd * novoUnit;

  const { error } = await supabase
    .from("pedidos_itens")
    .update({
      quantidade: novaQtd,
      valor_unitario: novoUnit,
      valor_total: novoTotal,
      data_entrega: novaData || null
    })
    .eq("id", itemId);

  if (error) {
    console.error(error);
    alert("Erro ao editar item.");
    return;
  }

  await carregarItens();
}

/* ----------- EXCLUIR ITEM ----------- */

async function excluirItem(itemId) {
  if (!window.confirm("Deseja realmente excluir este item?")) return;

  // histórico será removido automaticamente se FK tiver ON DELETE CASCADE
  const { error } = await supabase
    .from("pedidos_itens")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error(error);
    alert("Erro ao excluir item.");
    return;
  }

  await carregarItens();
}

/* ----------- HELPERS ----------- */

function formatarMoeda(v) {
  if (v == null) return "";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}
