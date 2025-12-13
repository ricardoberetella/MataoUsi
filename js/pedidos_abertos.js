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
    // ====================================================
// PREENCHER CABEÇALHO (CLIENTE E PRODUTO)
// ====================================================
const clienteSelect = document.getElementById("clienteFiltro");
const produtoSelect = document.getElementById("produtoFiltro");

const clienteHeader = document.getElementById("clienteHeader");
const produtoHeader = document.getElementById("produtoHeader");

if (clienteHeader) {
    clienteHeader.textContent =
        clienteSelect?.value
            ? clienteSelect.options[clienteSelect.selectedIndex].text
            : "Todos os Clientes";
}

if (produtoHeader) {
    produtoHeader.textContent =
        produtoSelect?.value
            ? produtoSelect.options[produtoSelect.selectedIndex].text
            : "Todos os Produtos";
}

    if (itensSeguros.length === 0) {
        renderizarTabela([]);
        return;
    }

    // 3) Buscar baixas na tabela REAL: notas_pedidos_baixas
    //    Relacionamento mais confiável: pedido_item_id -> pedidos_itens.id
    const itemIds = itensSeguros.map(i => i.id);

    const { data: baixas, error: errBaixas } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_item_id, quantidade_baixada")
        .in("pedido_item_id", itemIds);

    if (errBaixas) {
        // Se RLS bloquear, pelo menos não quebra; baixado ficará 0
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
// RENDERIZAR TABELA (AGRUPADO + ORDENADO + ATRASADOS)
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

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Agrupar por produto
    const grupos = {};
    dados.forEach(item => {
        const codigo = item.produtos.codigo;
        if (!grupos[codigo]) grupos[codigo] = [];
        grupos[codigo].push(item);
    });

    Object.values(grupos).forEach(itensProduto => {

        // Ordem por data crescente
        itensProduto.sort((a, b) => new Date(a.data_entrega) - new Date(b.data_entrega));

        itensProduto.forEach(item => {

            const total = Number(item.quantidade || 0);
            const baixado = Number(item._baixado_calc || 0);
            const emAberto = total - baixado;

            // Mostrar somente os que ainda têm saldo em aberto
            if (emAberto <= 0) return;

            const dataEntregaObj = new Date(item.data_entrega + "T00:00:00");
            const atrasado = dataEntregaObj < hoje;

            const tr = document.createElement("tr");

            if (atrasado) {
                tr.style.background = "rgba(220,38,38,0.15)";
                tr.style.color = "#fecaca";
                tr.title = "Pedido atrasado";
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

        // separador entre produtos
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
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}
