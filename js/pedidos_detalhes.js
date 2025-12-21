import { supabase, verificarLogin } from "./auth.js";

// 🔐 BLOQUEIA ACESSO SEM LOGIN
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    iniciar();
});

// ================================================
// PEGAR ID da URL
// ================================================
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
    alert("ID do pedido não informado.");
    window.location.href = "pedidos_lista.html";
}

// ELEMENTOS
const dadosContainer = document.getElementById("dadosPedido");
const tbodyItens = document.getElementById("tbodyItens");

// ================================================
// INICIAR
// ================================================
async function iniciar() {
    await carregarPedido();
}

/* ============================================================
   CARREGAR DADOS DO PEDIDO
============================================================ */
async function carregarPedido() {

    const { data: pedido, error } = await supabase
        .from("pedidos")
        .select(`
            id,
            numero_pedido,
            data_pedido,
            total,
            clientes ( razao_social )
        `)
        .eq("id", id)
        .single();

    if (error || !pedido) {
        alert("Erro ao carregar pedido.");
        console.error(error);
        return;
    }

    const clienteNome = pedido.clientes?.razao_social ?? "—";
    const dataPed = pedido.data_pedido
        ? new Date(pedido.data_pedido).toLocaleDateString("pt-BR")
        : "—";

    dadosContainer.innerHTML = `
        <p><strong>Número do Pedido:</strong> ${pedido.numero_pedido}</p>
        <p><strong>Cliente:</strong> ${clienteNome}</p>
        <p><strong>Data do Pedido:</strong> ${dataPed}</p>
        <p><strong>Total:</strong> R$ ${Number(pedido.total).toFixed(2)}</p>
    `;

    await carregarItens();
}

/* ============================================================
   CARREGAR ITENS DO PEDIDO
============================================================ */
async function carregarItens() {

    const { data: itens, error } = await supabase
        .from("pedidos_itens")
        .select(`
            quantidade,
            valor_unitario,
            data_entrega,
            produtos ( codigo, descricao )
        `)
        .eq("pedido_id", id);

    if (error) {
        alert("Erro ao carregar itens.");
        console.error(error);
        return;
    }

    tbodyItens.innerHTML = "";

    itens.forEach(item => {

        const subtotal = item.quantidade * item.valor_unitario;
        const dataEntrega = item.data_entrega
            ? new Date(item.data_entrega).toLocaleDateString("pt-BR")
            : "—";

        tbodyItens.innerHTML += `
            <tr>
                <td>${item.produtos.codigo} - ${item.produtos.descricao}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${Number(item.valor_unitario).toFixed(2)}</td>
                <td>${dataEntrega}</td>
                <td>R$ ${subtotal.toFixed(2)}</td>
            </tr>
        `;
    });
}
