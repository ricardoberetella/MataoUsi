import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let boletoEditandoId = null;

// ===============================
function formatarDataBR(dataISO) {
    return dataISO ? new Date(dataISO).toLocaleDateString("pt-BR") : "—";
}

// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = new URLSearchParams(window.location.search).get("id");
    if (!nfId) return alert("NF não encontrada");

    await carregarDadosNF();
    await carregarItensNF();
    await carregarBaixas();
    await carregarBoletos();

    document.getElementById("btnNovoBoleto").onclick = abrirModalNovo;
    document.getElementById("btnCancelarBoleto").onclick = fecharModal;
    document.getElementById("btnSalvarBoleto").onclick = salvarBoleto;
});

// ===============================
async function carregarDadosNF() {
    const { data } = await supabase
        .from("notas_fiscais")
        .select("numero_nf, data_nf, clientes(razao_social)")
        .eq("id", nfId)
        .single();

    nfNumero.textContent = data.numero_nf;
    nfData.textContent = formatarDataBR(data.data_nf);
    nfCliente.textContent = data.clientes?.razao_social || "—";
}

// ===============================
async function carregarItensNF() {
    const { data } = await supabase
        .from("notas_fiscais_itens")
        .select("produto_id, quantidade")
        .eq("nf_id", nfId);

    listaItens.innerHTML = "";
    data?.forEach(i => {
        listaItens.innerHTML += `
            <tr>
                <td>${i.produto_id}</td>
                <td>${i.quantidade}</td>
            </tr>`;
    });
}

// ===============================
async function carregarBaixas() {
    const { data } = await supabase
        .from("notas_pedidos_baixas")
        .select("pedido_id, produto_id, quantidade_baixada")
        .eq("nf_id", nfId);

    listaBaixas.innerHTML = "";
    data?.forEach(b => {
        listaBaixas.innerHTML += `
            <tr>
                <td>${b.pedido_id}</td>
                <td>${b.produto_id}</td>
                <td>${b.quantidade_baixada}</td>
                <td>Baixado</td>
            </tr>`;
    });
}

// ===============================
async function carregarBoletos() {
    const { data } = await supabase
        .from("boletos")
        .select("*")
        .eq("nota_fiscal_id", nfId)
        .order("data_vencimento");

    listaBoletos.innerHTML = "";

    data?.forEach(b => {
        listaBoletos.innerHTML += `
            <tr>
                <td>${b.origem || "—"}</td>
                <td>${b.tipo_nf}</td>
                <td>R$ ${Number(b.valor).toFixed(2)}</td>
                <td>${formatarDataBR(b.data_vencimento)}</td>
                <td>
                    <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                    <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

// ===============================
function abrirModalNovo() {
    boletoEditandoId = null;
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

// ===============================
async function salvarBoleto() {
    const payload = {
        nota_fiscal_id: nfId,
        origem: boletoOrigem.value || null,
        tipo_nf: "NF",
        valor: Number(boletoValor.value),
        data_vencimento: boletoVencimento.value
    };

    const resp = boletoEditandoId
        ? await supabase.from("boletos").update(payload).eq("id", boletoEditandoId)
        : await supabase.from("boletos").insert(payload);

    if (resp.error) {
        alert("Erro ao salvar boleto");
        console.error(resp.error);
        return;
    }

    fecharModal();
    carregarBoletos();
}

// ===============================
window.excluirBoleto = async function (id) {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};

window.editarBoleto = async function (id) {
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    boletoEditandoId = id;
    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento;
    modalBoleto.style.display = "flex";
};
