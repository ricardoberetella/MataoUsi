import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidos();
});

/* ============================= */
/*       CARREGAR PEDIDOS        */
/* ============================= */

async function carregarPedidos() {
    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, data_pedido, total, clientes(razao_social)")
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    tbody.innerHTML = "";

    data.forEach(pedido => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${pedido.numero_pedido}</td>
            <td>${pedido.clientes.razao_social}</td>
            <td>${formatarData(pedido.data_pedido)}</td>
            <td>${formatarMoeda(pedido.total)}</td>

            <td class="acoes">
                <button class="btn-editar" onclick="editarPedido(${pedido.id})">Editar</button>
                <button class="btn-excluir" onclick="excluirPedido(${pedido.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/* ============================= */
/*       EXCLUIR PEDIDO          */
/* ============================= */

window.excluirPedido = async function(id) {

    const confirmar = confirm("Tem certeza que deseja EXCLUIR este pedido?\n\nEssa ação remove também todos os itens.");

    if (!confirmar) return;

    // Exclui itens primeiro
    await supabase
        .from("pedidos_itens")
        .delete()
        .eq("pedido_id", id);

    // Exclui o pedido
    const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir pedido.");
        console.log(error);
        return;
    }

    alert("Pedido excluído com sucesso!");
    carregarPedidos();
};


/* ============================= */
/*       EDITAR PEDIDO           */
/* ============================= */

window.editarPedido = function(id) {
    window.location.href = `pedidos_editar.html?id=${id}`;
};


/* ============================= */
/*     FORMATAÇÕES AUXILIARES    */
/* ============================= */

function formatarData(dataISO) {
    const partes = dataISO.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
