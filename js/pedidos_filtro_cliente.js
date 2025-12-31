import { supabase, verificarLogin } from "./auth.js";

/* ------------------------ FORMATADORES ------------------------ */

function formatarDataBR(dataISO) {
    if (!dataISO) return "";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function parseISO(dataISO) {
    if (!dataISO) return null;
    const [ano, mes, dia] = dataISO.split("-");
    return new Date(ano, mes - 1, dia);
}

function formatarQuantidade(valor) {
    return Number(valor).toLocaleString("pt-BR");
}

/* ------------------------ INICIAR TELA ------------------------ */

document.addEventListener("DOMContentLoaded", async () => {

    const user = await verificarLogin();
    if (!user) return;

    const spanData = document.getElementById("dataHoraGerada");
    if (spanData) {
        spanData.textContent = new Date().toLocaleString("pt-BR");
    }

    await carregarClientes();

    document.getElementById("btnBuscar").onclick = buscarItensCliente;

    // ❌ removido botão imprimir (PDF já cuida disso)
});

/* ------------------------ CARREGAR CLIENTES ------------------------ */

async function carregarClientes() {

    await verificarLogin();

    const sel = document.getElementById("clienteSelect");
    sel.innerHTML = `<option value="">Carregando...</option>`;

    const { data, error } = await supabase
        .from("clientes")
        .select("id, razao_social")
        .order("razao_social");

    if (error) {
        console.error("Erro ao carregar clientes:", error);
        sel.innerHTML = `<option value="">Erro ao carregar</option>`;
        return;
    }

    sel.innerHTML = `<option value="">Selecione...</option>`;

    data.forEach(c => {
        const op = document.createElement("option");
        op.value = c.id;
        op.textContent = c.razao_social;
        sel.appendChild(op);
    });
}

/* ------------------------ BUSCAR ITENS DO CLIENTE ------------------------ */

async function buscarItensCliente() {

    await verificarLogin();

    const clienteId = document.getElementById("clienteSelect").value;
    const tbody = document.getElementById("tbodyResultados");
    const totalEl = document.getElementById("totalQuantidade");
    const spanClienteNome = document.getElementById("clienteNome");

    tbody.innerHTML = "";
    totalEl.textContent = "0";
    spanClienteNome.textContent = "";

    if (!clienteId) {
        tbody.innerHTML = `<tr><td colspan="4">Selecione um cliente.</td></tr>`;
        return;
    }

    const { data: cliente } = await supabase
        .from("clientes")
        .select("razao_social")
        .eq("id", clienteId)
        .single();

    spanClienteNome.textContent = cliente?.razao_social || "";

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
            quantidade,
            data_entrega,
            pedido_id,
            produtos(codigo)
        `)
        .in("pedido_id", pedidos.map(p => p.id));

    if (!itens?.length) {
        tbody.innerHTML = `<tr><td colspan="4">Nenhum item encontrado.</td></tr>`;
        return;
    }

    /* ================================
       ORDENAR: MAIS ANTIGA → MAIS NOVA
    ================================= */
    itens.sort((a, b) => parseISO(a.data_entrega) - parseISO(b.data_entrega));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let total = 0;

    itens.forEach(item => {

        const pedido = pedidos.find(p => p.id === item.pedido_id);
        const dataEntrega = parseISO(item.data_entrega);

        const tr = document.createElement("tr");

        // ✅ MESMA REGRA DO FILTRO POR PRODUTO
        if (dataEntrega && dataEntrega < hoje) {
            tr.classList.add("vencido");
        }

        tr.innerHTML = `
            <td>${pedido?.numero_pedido || ""}</td>
            <td>${formatarDataBR(item.data_entrega)}</td>
            <td>${item.produtos?.codigo || ""}</td>
            <td>${formatarQuantidade(item.quantidade)}</td>
        `;

        tbody.appendChild(tr);

        total += Number(item.quantidade);
    });

    totalEl.textContent = formatarQuantidade(total);
}
