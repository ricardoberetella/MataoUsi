// ====================================================
// PEDIDOS_DETALHES.JS — DETALHES DO PEDIDO + ITENS
// (com botões Editar / Excluir por item)
// ====================================================

import { supabase, verificarLogin } from "./auth.js";

let pedidoId = null;
let roleUsuario = "viewer";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await verificarLogin();
  if (!user) return;

  roleUsuario = user.user_metadata?.role || "viewer";

  const params = new URLSearchParams(window.location.search);
  pedidoId = params.get("id");

  if (!pedidoId) {
    alert("Pedido não informado.");
    window.location.href = "pedidos_lista.html";
    return;
  }

  await carregarPedido();
  await carregarItens();
});

// ===============================================
// HELPERS
// ===============================================
function dinheiroBR(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso) {
  if (!iso) return "—";
  // Não usa new Date() para evitar "dia anterior" e para lidar com timestamps
  const s = String(iso).split("T")[0];
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

async function atualizarTotalPedido() {
  const { data, error } = await supabase
    .from("pedidos_itens")
    .select("total_item")
    .eq("pedido_id", pedidoId);

  if (error) {
    console.error("Erro ao somar itens:", error);
    return;
  }

  const total = (data || []).reduce((acc, it) => acc + Number(it.total_item || 0), 0);

  const { error: errUp } = await supabase
    .from("pedidos")
    .update({ total })
    .eq("id", pedidoId);

  if (errUp) console.error("Erro ao atualizar total do pedido:", errUp);

  // Atualiza o card na tela (se existir)
  const elTotal = document.getElementById("valorTotalPedido");
  if (elTotal) elTotal.textContent = dinheiroBR(total);
}

// ===============================================
// CARREGAR PEDIDO
// ===============================================
async function carregarPedido() {
  const dadosPedido = document.getElementById("dadosPedido");
  if (!dadosPedido) {
    console.error("Elemento #dadosPedido não encontrado no HTML.");
    return;
  }

  const { data, error } = await supabase
    .from("pedidos")
    .select(
      `
      id,
      numero_pedido,
      data_pedido,
      total,
      clientes:cliente_id ( razao_social )
    `
    )
    .eq("id", pedidoId)
    .single();

  if (error) {
    console.error("Erro ao carregar pedido:", error);
    alert("Erro ao carregar pedido");
    return;
  }

  const cliente = data?.clientes?.razao_social || "—";
  const numero = data?.numero_pedido ?? data?.id ?? "—";
  const dt = dataBR(data?.data_pedido);
  const total = dinheiroBR(data?.total);

  const podeEditar = roleUsuario !== "viewer";

  dadosPedido.innerHTML = `
    <div class="info-grid" style="display:grid; gap:10px;">
      <div><strong>Número do Pedido:</strong> ${numero}</div>
      <div><strong>Cliente:</strong> ${cliente}</div>
      <div><strong>Data do Pedido:</strong> ${dt}</div>
      <div><strong>Total:</strong> <span id="valorTotalPedido">${total}</span></div>

      ${
        podeEditar
          ? `
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <a href="pedidos_editar.html?id=${pedidoId}">
            <button class="btn-primario">Editar Pedido</button>
          </a>
        </div>`
          : ""
      }
    </div>
  `;
}

// ===============================================
// CARREGAR ITENS
// ===============================================
async function carregarItens() {
  const tbody = document.getElementById("tbodyItens");
  if (!tbody) {
    console.error("Elemento #tbodyItens não encontrado no HTML.");
    return;
  }

  tbody.innerHTML = "";

  const { data, error } = await supabase
    .from("pedidos_itens")
    .select(
      `
      id,
      produto_id,
      quantidade,
      valor_unitario,
      total_item,
      data_entrega,
      produtos:produto_id ( codigo, descricao )
    `
    )
    .eq("pedido_id", pedidoId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao carregar itens:", error);
    // Não trava a tela: mostra mensagem na tabela
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; opacity:.85;">
          Erro ao carregar itens do pedido.
        </td>
      </tr>
    `;
    return;
  }

  const podeEditar = roleUsuario !== "viewer";

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; opacity:.85;">
          Nenhum item cadastrado neste pedido.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((item) => {
    const prod = item?.produtos
      ? `${item.produtos.codigo} - ${item.produtos.descricao}`
      : "(produto não encontrado)";

    const qtd = Number(item.quantidade || 0);
    const vUnit = Number(item.valor_unitario || 0);
    const totalItem = Number(item.total_item ?? qtd * vUnit);
    const dtEntrega = dataBR(item.data_entrega);

    const acoes = podeEditar
      ? `
        <button class="btn-editar" data-editar="${item.id}">Editar</button>
        <button class="btn-excluir" data-excluir="${item.id}">Excluir</button>
      `
      : `<span style="opacity:.7;">—</span>`;

    tbody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${prod}</td>
        <td>${qtd}</td>
        <td>${dinheiroBR(vUnit)}</td>
        <td>${dtEntrega}</td>
        <td>${dinheiroBR(totalItem)}</td>
        <td>${acoes}</td>
      </tr>
      `
    );
  });

  // Eventos (delegação)
  tbody.addEventListener("click", async (e) => {
    const btnEditar = e.target.closest("[data-editar]");
    const btnExcluir = e.target.closest("[data-excluir]");

    if (btnEditar) {
      const idItem = btnEditar.getAttribute("data-editar");
      window.location.href = `item_editar.html?idItem=${idItem}&idPedido=${pedidoId}`;
      return;
    }

    if (btnExcluir) {
      const idItem = btnExcluir.getAttribute("data-excluir");
      const ok = confirm("Excluir este item do pedido?");
      if (!ok) return;

      const { error: errDel } = await supabase
        .from("pedidos_itens")
        .delete()
        .eq("id", idItem);

      if (errDel) {
        console.error("Erro ao excluir item:", errDel);
        alert("Erro ao excluir item.");
        return;
      }

      await atualizarTotalPedido();
      await carregarItens();
    }
  }, { once: true });
}
