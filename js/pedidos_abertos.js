// ====================================================
// PEDIDOS COM SALDO EM ABERTO
// - Datas corretas (pedidos_itens.data_entrega)
// - Agrupado por produto
// - Ordenado por data crescente (mais antigas primeiro)
// - Atrasados destacados
// - BAIXADOS calculados via notas_pedidos_baixas (quantidade_baixada)
// ====================================================

import { supabase, protegerPagina } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 🔐 Blindagem: exige login para acessar esta tela
    await protegerPagina();

    await carregarFiltros();
    document.getElementById("btnFiltrar").addEventListener("click", carregarPedidos);
    await carregarPedidos();
});

// ====================================================
// CARREGAR FILTROS
// ====================================================
async function carregarFiltros() {
    const clienteSelect = document.getElementById("clienteFiltro");
    const produtoSelect = document.getElementById("produtoFiltro");

    clienteSelect.innerHTML = `<option value="">Todos</option>`;
    produtoSelect.innerHTML = `<option value="">Todos</option>`;

    const { data: clientes, error: errClientes } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social");

    if (errClientes) console.error("Erro clientes:", errClientes);

    (clientes || []).forEach(c => {
        clienteSelect.innerHTML += `<option value="${c.id}">${c.razao_social}</option>`;
    });

    const { data: produtos, error: errProdutos } = await supabase
        .from("produtos")
        .select("id, codigo, descricao")
        .order("codigo");

    if (errProdutos) console.error("Erro produtos:", errProdutos);

    (produtos || []).forEach(p => {
        produtoSelect.innerHTML += `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`;
    });
}

// ====================================================
// CARREGAR PEDIDOS
// ====================================================
async function carregarPedidos() {
    const clienteId = document.getElementById("clienteFiltro").value;
    const produtoId = document.getElementById("produtoFiltro").value;
    const dataFiltro = document.getElementById("dataFiltro").value;

    // 1) Se tiver cliente, pegar ids dos pedidos desse cliente
    let pedidosIds = null;

    if (clienteId) {
        const { data: pedidosCliente, error: errPedidosCliente } = await supabase
            .from("pedidos")
            .select("id")
            .eq("cliente_id", clienteId);

        if (errPedidosCliente) {
            console.error("Erro pedidosCliente:", errPedidosCliente);
            alert("Erro ao carregar pedidos");
            return;
        }

        pedidosIds = (pedidosCliente || []).map(p => p.id);

        if (pedidosIds.length === 0) {
            renderizarTabela([]);
            atualizarCabecalhoPrint();
            return;
        }
    }

    // 2) Buscar itens do pedido
    let query = supabase
        .from("pedidos_itens")
        .select(`
            id,
            pedido_id,
            produto_id,
            quantidade,
            data_entrega,
            pedidos ( numero_pedido ),
            produtos ( codigo, descricao )
        `)
        .gt("quantidade", 0);

    if (pedidosIds) query = query.in("pedido_id", pedidosIds);
    if (produtoId) query = query.eq("produto_id", produtoId);
    if (dataFiltro) query = query.lte("data_entrega", dataFiltro);

    const { data: itens, error: errItens } = await query;

    if (errItens) {
        console.error("Erro itens:", errItens);
        alert("Erro ao carregar pedidos");
        return;
    }

    const itensSeguros = itens || [];

    // 👉 ATUALIZA CABEÇALHO DO PRINT (CLIENTE / PRODUTO)
    atualizarCabecalhoPrint();

    if (itensSeguros.length === 0) {
        renderizarTabela([]);
        return;
    }

    // 3) Buscar baixas na tabela REAL: notas_pedidos_baixas
    const itemIds = itensSeguros.map(i => i.id);

    const { data: baixas, error: errBaixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_item_id, quantidade_baixada")
        .in("pedido_item_id", itemIds);

    if (errBaixas) {
        console.error("Erro baixas (notas_pedidos_baixas):", errBaixas);
    }

    // Mapa: pedido_item_id -> soma(quantidade_baixada)
    const mapaBaixado = new Map();
    (baixas || []).forEach(b => {
        const k = b.pedido_item_id;
        const q = Number(b.quantidade_baixada || 0);
        mapaBaixado.set(k, (mapaBaixado.get(k) || 0) + q);
    });

    // anexar baixado calculado
    const itensComBaixa = itensSeguros.map(i => ({
        ...i,
        _baixado_calc: mapaBaixado.get(i.id) || 0
    }));

    renderizarTabela(itensComBaixa);
}

// ====================================================
// ATUALIZAR CABEÇALHO DO PRINT
// ====================================================
function atualizarCabecalhoPrint() {
    const clienteSelect = document.getElementById("clienteFiltro");
    const produtoSelect = document.getElementById("produtoFiltro");

    const relCliente = document.getElementById("relCliente");
    const relProduto = document.getElementById("relProduto");

    if (relCliente) {
        relCliente.textContent =
            clienteSelect && clienteSelect.value
                ? clienteSelect.options[clienteSelect.selectedIndex].text
                : "Todos";
    }

    if (relProduto) {
        relProduto.textContent =
            produtoSelect && produtoSelect.value
                ? produtoSelect.options[produtoSelect.selectedIndex].text
                : "Todos";
    }
}

// ====================================================
// RENDERIZAR TABELA
// ====================================================
function renderizarTabela(dados) {
    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "";

    if (!dados || dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    Nenhum pedido em aberto encontrado
                </td>
            </tr>`;
        return;
    }

    // Hoje em ISO local (YYYY-MM-DD) para comparar sem "shift" de fuso
    const hoje = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    })();

    const grupos = {};
    dados.forEach(item => {
        const codigo = item.produtos.codigo;
        if (!grupos[codigo]) grupos[codigo] = [];
        grupos[codigo].push(item);
    });

    Object.values(grupos).forEach(itensProduto => {
        itensProduto.sort((a, b) => {
            const da = String(a.data_entrega || "").split("T")[0];
            const db = String(b.data_entrega || "").split("T")[0];
            return da.localeCompare(db);
        });

        itensProduto.forEach(item => {
            const total = Number(item.quantidade || 0);
            const baixado = Number(item._baixado_calc || 0);
            const emAberto = total - baixado;
            if (emAberto <= 0) return;

            const dataEntregaISO = String(item.data_entrega || "").split("T")[0];
            const atrasado = dataEntregaISO && dataEntregaISO < hoje;

            const tr = document.createElement("tr");
            if (atrasado) {
                tr.style.background = "rgba(220,38,38,0.15)";
                tr.style.color = "#fecaca";
            }

            tr.innerHTML = `
                <td>${item.pedidos.numero_pedido}</td>
                <td>${item.produtos.codigo} - ${item.produtos.descricao}</td>
                <td>${formatarData(item.data_entrega)}</td>
                <td>${total}</td>
                <td>${baixado}</td>
                <td>${emAberto}</td>
            `;

            tbody.appendChild(tr);
        });

        const sep = document.createElement("tr");
        sep.innerHTML = `<td colspan="6" style="background:#0b1f33;height:6px;"></td>`;
        tbody.appendChild(sep);
    });
}

// ====================================================
// FORMATAR DATA
// ====================================================
function formatarData(data) {
    if (!data) return "";
    const s = String(data).split("T")[0];
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
}
