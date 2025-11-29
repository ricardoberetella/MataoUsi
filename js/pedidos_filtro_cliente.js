import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarQuantidade(valor) {
  if (!valor && valor !== 0) return "0";
  return parseInt(valor).toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

document.addEventListener("DOMContentLoaded", () => {
  initFiltroCliente();
});

async function initFiltroCliente() {
  const sel = document.getElementById("clienteSelect");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnImprimir = document.getElementById("btnImprimir");

  if (!sel || !btnBuscar || !btnImprimir) {
    console.error("Erro: elementos não encontrados.");
    return;
  }

  await carregarClientes();

  btnBuscar.addEventListener("click", buscarItensCliente);
  btnImprimir.addEventListener("click", imprimirTabela);
}

async function carregarClientes() {
  const sel = document.getElementById("clienteSelect");
  sel.innerHTML = `<option value="">Carregando...</option>`;

  const { data, error } = await supabase
    .from("clientes")
    .select("id, razao_social")
    .order("razao_social");

  if (error) {
    sel.innerHTML = `<option value="">Erro ao carregar clientes</option>`;
    return;
  }

  sel.innerHTML = `<option value="">Selecione...</option>`;
  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.razao_social;
    sel.appendChild(opt);
  });
}

async function buscarItensCliente() {
  const clienteId = document.getElementById("clienteSelect").value;
  const tbody = document.getElementById("tbodyResultados");
  const totalEl = document.getElementById("totalQuantidade");

  if (!clienteId) {
    tbody.innerHTML = `<tr><td colspan="4">Selecione um cliente.</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="4">Carregando...</td></tr>`;

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, numero_pedido")
    .eq("cliente_id", clienteId);

  if (!pedidos?.length) {
    tbody.innerHTML = `<tr><td colspan="4">Nenhum pedido encontrado.</td></tr>`;
    return;
  }

  const { data: itens } = await supabase
    .from("pedidos_itens")
    .select(`
      id,
      pedido_id,
      quantidade,
      data_entrega,
      produtos (codigo)
    `)
    .in("pedido_id", pedidos.map(p => p.id));

  if (!itens?.length) {
    tbody.innerHTML = `<tr><td colspan="4">Nenhum item encontrado.</td></tr>`;
    return;
  }

  itens.sort((a, b) => {
    const c1 = (a.produtos?.codigo || "").toUpperCase();
    const c2 = (b.produtos?.codigo || "").toUpperCase();
    if (c1 < c2) return -1;
    if (c1 > c2) return 1;
    return (a.data_entrega || "").localeCompare(b.data_entrega || "");
  });

  tbody.innerHTML = "";
  let total = 0;

  itens.forEach(item => {
    const pedido = pedidos.find(p => p.id === item.pedido_id);
    tbody.innerHTML += `
      <tr>
        <td>${pedido.numero_pedido}</td>
        <td>${formatarDataBR(item.data_entrega)}</td>
        <td>${item.produtos?.codigo || ""}</td>
        <td>${formatarQuantidade(item.quantidade)}</td>
      </tr>
    `;
    total += Number(item.quantidade);
  });

  totalEl.textContent = formatarQuantidade(total);
}

/* ======================================================
   IMPRESSÃO COM LOGO PRETO AO LADO DO TÍTULO
====================================================== */
function imprimirTabela() {
  const agora = new Date().toLocaleString("pt-BR");
  const tabelaHTML = document.getElementById("tabelaCliente").outerHTML;
  const cliente =
    document.getElementById("clienteSelect").selectedOptions[0]?.textContent || "";

  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <html>
      <head>
        <title>Relatório Matão Usinagem</title>
        <style>
          body { font-family: Arial; padding: 20px; }

          .header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }

          .header img {
            width: 48px;
            height: 48px;
          }

          .titulo {
            font-size: 22px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
          }

          th, td {
            border: 1px solid #000;
            padding: 8px 12px;
          }

          th {
            background: #e5e5e5;
          }
        </style>
      </head>
      <body>

        <div class="header">
          <img src="img/logo-mataousi2.png">
          <div class="titulo">MATÃO USINAGEM</div>
        </div>

        <div>Relatório gerado em: <b>${agora}</b></div>
        <div>Cliente: <b>${cliente}</b></div>

        ${tabelaHTML}

      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}
