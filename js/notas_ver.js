import { supabase, verificarLogin } from "./auth.js";

let nfId = null;

// ===============================
// FORMATAR DATA
// ===============================
function formatarDataBR(data) {
    return data ? new Date(data).toLocaleDateString("pt-BR") : "—";
}

// ===============================
// INICIAR
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = new URLSearchParams(window.location.search).get("id");
    if (!nfId) return alert("NF não encontrada");

    await carregarDadosNF();
    await carregarItensNF();
    await carregarBoletos();
});

// ===============================
// DADOS NF
// ===============================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    document.getElementById("nfNumero").textContent = data.numero_nf;
    document.getElementById("nfData").textContent = formatarDataBR(data.data_nf);
    document.getElementById("nfCliente").textContent = data.clientes?.razao_social || "—";
}

// ===============================
// ITENS NF
// ===============================
async function carregarItensNF() {
    const tbody = document.getElementById("listaItens");

    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">Nenhum item</td></tr>`;
        return;
    }

    data.forEach(i => {
        tbody.innerHTML += `
            <tr>
                <td>${i.produto_id}</td>
                <td style="text-align:right">${i.quantidade}</td>
            </tr>
        `;
    });
}

// ===============================
// LISTAR BOLETOS
// ===============================
async function carregarBoletos() {
    const tbody = document.getElementById("listaBoletos");

    const { data, error } = await supabase
        .from("boletos")
        .select("*")
        .eq("nota_fiscal_id", nfId)
        .order("data_vencimento");

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar boletos</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Nenhum boleto cadastrado</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.origem || "—"}</td>
                <td>${b.tipo_nf}</td>
                <td style="text-align:right">R$ ${Number(b.valor).toFixed(2)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td style="text-align:center">
                    <button class="btn-azul" disabled>Editar</button>
                    <button class="btn-vermelho" disabled>Excluir</button>
                </td>
            </tr>
        `;
    });
}
