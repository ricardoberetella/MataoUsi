import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidos();
    document.getElementById("btnFiltrar").addEventListener("click", carregarPedidos);
});

async function carregarPedidos() {
    const numero = document.getElementById("f_numero").value.trim();
    const cliente = document.getElementById("f_cliente").value.trim();
    const tipo = document.getElementById("f_tipo").value.trim();
    const data = document.getElementById("f_data").value;

    let query = supabase.from("pedidos")
        .select(`
            id,
            numero_documento,
            tipo_documento,
            data_pedido,
            total,
            clientes ( razao_social )
        `)
        .order("id", { ascending: false });

    if (numero) query = query.ilike("numero_documento", `%${numero}%`);
    if (cliente) query = query.ilike("clientes.razao_social", `%${cliente}%`);
    if (tipo) query = query.ilike("tipo_documento", `%${tipo}%`);
    if (data) query = query.eq("data_pedido", data);

    const { data: pedidos, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    montarTabela(pedidos);
}

function montarTabela(pedidos) {
    const tbody = document.getElementById("listaPedidos");
    tbody.innerHTML = "";

    pedidos.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.numero_documento}</td>
      <td>${p.clientes?.razao_social || "-"}</td>
      <td>${formatarData(p.data_pedido)}</td>
      <td>R$ ${Number(p.total).toFixed(2)}</td>
      <td>
        <button class="btn-ver" onclick="verPedido(${p.id})">Ver</button>
      </td>
    `;

        tbody.appendChild(tr);
    });
}

function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
}

window.verPedido = (id) => {
    window.location.href = `pedido_itens.html?id=${id}`;
};
