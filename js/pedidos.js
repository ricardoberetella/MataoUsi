import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Ao carregar a página
 */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnFiltrar").addEventListener("click", carregarPedidos);
  carregarPedidos(); // já carrega tudo na abertura
});

/**
 * Carregar pedidos com filtros:
 * - número_documento
 * - cliente (razao_social)
 * - código da peça (via pedido_itens + produtos)
 */
async function carregarPedidos() {
  const msgErro = document.getElementById("msgErro");
  msgErro.textContent = "";

  const numero = document.getElementById("f_numero").value.trim().toLowerCase();
  const cliente = document.getElementById("f_cliente").value.trim().toLowerCase();
  const codPeca = document.getElementById("f_codigo").value.trim().toLowerCase();

  // 1) Buscar todos pedidos com join de clientes
  let { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(`
      id,
      cliente_id,
      data_pedido,
      tipo_documento,
      numero_documento,
      total,
      clientes ( razao_social )
    `)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    msgErro.textContent = "Erro ao carregar pedidos: " + error.message;
    return;
  }

  // 2) Filtro por número do pedido
  if (numero) {
    pedidos = pedidos.filter(p =>
      (p.numero_documento || "").toLowerCase().includes(numero)
    );
  }

  // 3) Filtro por nome do cliente
  if (cliente) {
    pedidos = pedidos.filter(p =>
      (p.clientes?.razao_social || "").toLowerCase().includes(cliente)
    );
  }

  // 4) Filtro por código da peça
  if (codPeca) {
    const { data: itens, error: errItens } = await supabase
      .from("pedido_itens")
      .select(`
        pedido_id,
        produtos ( codigo )
      `);

    if (errItens) {
      console.error(errItens);
      msgErro.textContent = "Erro ao buscar itens para filtro por peça.";
    } else {
      const idsComPeca = new Set(
        itens
          .filter(it =>
            (it.produtos?.codigo || "").toLowerCase().includes(codPeca)
          )
          .map(it => it.pedido_id)
      );

      pedidos = pedidos.filter(p => idsComPeca.has(p.id));
    }
  }

  montarTabela(pedidos);
}

/**
 * Montar tabela de pedidos
 */
function montarTabela(pedidos) {
  const tbody = document.getElementById("listaPedidos");
  tbody.innerHTML = "";

  if (!pedidos || pedidos.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "Nenhum pedido encontrado.";
    td.style.textAlign = "center";
    td.style.color = "#9ca3af";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  pedidos.forEach(p => {
    const tr = document.createElement("tr");

    const razao = p.clientes?.razao_social || "-";
    const dataBR = formatarData(p.data_pedido);
    const totalBR = formatarMoeda(p.total);

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.numero_documento || ""}</td>
      <td>${razao}</td>
      <td>${dataBR}</td>
      <td>${p.tipo_documento || ""}</td>
      <td>${totalBR}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="abrirPedido(${p.id})">
          Ver
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * Formatar data YYYY-MM-DD para DD/MM/YYYY
 */
function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Formatar número em R$ XX,XX
 */
function formatarMoeda(valor) {
  if (valor == null) return "";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/**
 * Abrir tela de itens do pedido
 */
window.abrirPedido = function (id) {
  window.location.href = `pedido_itens.html?pedido_id=${id}`;
};
