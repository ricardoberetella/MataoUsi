import { supabase, verificarLogin } from "./auth.js";

let nfId = null;
let boletoEditandoId = null;

function tipoSelecionado() {
    return document.querySelector("input[name='tipo_nf']:checked").value;
}

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    nfId = new URLSearchParams(window.location.search).get("id");
    if (!nfId) return alert("NF não encontrada");

    await carregarBoletos();

    btnNovoBoleto.onclick = abrirModalNovo;
    btnCancelarBoleto.onclick = fecharModal;
    btnSalvarBoleto.onclick = salvarBoleto;
});

function abrirModalNovo() {
    boletoEditandoId = null;
    boletoOrigem.value = "";
    boletoValor.value = "";
    boletoVencimento.value = "";

    document.querySelector("input[value='NF']").checked = true;
    modalBoleto.style.display = "flex";
}

function fecharModal() {
    modalBoleto.style.display = "none";
}

async function salvarBoleto() {
    const payload = {
        nota_fiscal_id: nfId,
        tipo_nf: tipoSelecionado(),
        origem: boletoOrigem.value || null,
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
                <td>${b.tipo_nf === 'NF' ? 'Com NF' : 'Sem NF'}</td>
                <td>${b.origem || "—"}</td>
                <td>R$ ${Number(b.valor).toFixed(2)}</td>
                <td>${new Date(b.data_vencimento).toLocaleDateString("pt-BR")}</td>
                <td>
                    <button class="btn-azul" onclick="editarBoleto(${b.id})">Editar</button>
                    <button class="btn-vermelho" onclick="excluirBoleto(${b.id})">Excluir</button>
                </td>
            </tr>`;
    });
}

window.editarBoleto = async function (id) {
    const { data } = await supabase.from("boletos").select("*").eq("id", id).single();
    boletoEditandoId = id;

    boletoOrigem.value = data.origem || "";
    boletoValor.value = data.valor;
    boletoVencimento.value = data.data_vencimento;

    document.querySelector(`input[value='${data.tipo_nf}']`).checked = true;
    modalBoleto.style.display = "flex";
};

window.excluirBoleto = async function (id) {
    if (!confirm("Excluir boleto?")) return;
    await supabase.from("boletos").delete().eq("id", id);
    carregarBoletos();
};
