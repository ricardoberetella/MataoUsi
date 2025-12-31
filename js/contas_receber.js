// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL + EDITAR + PAGAR + REABRIR
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

let editandoId = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")?.addEventListener("click", carregarLancamentos);
    document.getElementById("btnGerarPDF")?.addEventListener("click", gerarPDF);
    document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalNovo);
    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModal);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarModal);

    atualizarDataHoraPDF();
    carregarLancamentos();
});

// ======================================================
// FORMATADORES (SEM TIMEZONE)
// ======================================================
function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function isoParaBR(iso) {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ======================================================
// CARREGAR LANÇAMENTOS
// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("ERRO:", error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    data.forEach(l => {
        total += Number(l.valor || 0);

        const pago = l.status === "PAGO";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.descricao}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${isoParaBR(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td class="td-acoes">
                <button class="btn-azul btn-editar" data-id="${l.id}" ${pago ? "disabled" : ""}>Editar</button>
                <button class="btn-vermelho btn-pagar" data-id="${l.id}" ${pago ? "disabled" : ""}>Pagar</button>
                ${pago ? `<button class="btn-amarelo btn-reabrir" data-id="${l.id}">Reabrir</button>` : ""}
            </td>
        `;
        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindAcoes();
}

// ======================================================
// AÇÕES
// ======================================================
function bindAcoes() {

    // EDITAR
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.onclick = () => abrirModalEditar(btn.dataset.id);
    });

    // PAGAR
    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Confirmar pagamento?")) return;

            const { error } = await supabase
                .from("contas_receber")
                .update({
                    status: "PAGO",
                    data_pagamento: hojeISO()
                })
                .eq("id", btn.dataset.id);

            if (error) return alert("Erro ao pagar");
            carregarLancamentos();
        };
    });

    // 🔄 REABRIR
    document.querySelectorAll(".btn-reabrir").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Reabrir este boleto? Ele voltará para ABERTO.")) return;

            const { error } = await supabase
                .from("contas_receber")
                .update({
                    status: "ABERTO",
                    data_pagamento: null
                })
                .eq("id", btn.dataset.id);

            if (error) {
                console.error(error);
                alert("Erro ao reabrir");
                return;
            }

            carregarLancamentos();
        };
    });
}

// ======================================================
// MODAL
// ======================================================
function abrirModalNovo() {
    editandoId = null;
    document.getElementById("tituloModal").innerText = "Novo Lançamento";
    document.getElementById("origemManual").value = "";
    document.getElementById("valorManual").value = "";
    document.getElementById("vencimentoManual").value = "";
    document.getElementById("modalManual").classList.add("ativo");
}

async function abrirModalEditar(id) {
    const { data } = await supabase
        .from("contas_receber")
        .select("*")
        .eq("id", id)
        .single();

    if (data.status === "PAGO") {
        alert("Pagamento já realizado. Use REABRIR.");
        return;
    }

    editandoId = id;
    document.getElementById("tituloModal").innerText = `Editar #${id}`;
    document.getElementById("origemManual").value = data.descricao;
    document.getElementById("valorManual").value = data.valor;
    document.getElementById("vencimentoManual").value = data.data_vencimento;
    document.getElementById("modalManual").classList.add("ativo");
}

function fecharModal() {
    document.getElementById("modalManual").classList.remove("ativo");
}

async function salvarModal() {
    const descricao = origemManual.value.trim();
    const valor = Number(valorManual.value);
    const venc = vencimentoManual.value;

    if (!descricao || !venc || valor <= 0) {
        alert("Preencha corretamente");
        return;
    }

    if (!editandoId) {
        await supabase.from("contas_receber").insert([{
            origem_tipo: "BOLETO",
            descricao,
            valor,
            data_vencimento: venc,
            status: "ABERTO"
        }]);
    } else {
        await supabase.from("contas_receber")
            .update({ descricao, valor, data_vencimento: venc })
            .eq("id", editandoId);
    }

    fecharModal();
    carregarLancamentos();
}

// ======================================================
function gerarPDF() {
    document.body.classList.add("modo-pdf");
    html2pdf().from(areaPdf).save().then(() => {
        document.body.classList.remove("modo-pdf");
    });
}

function atualizarDataHoraPDF() {
    const el = document.getElementById("dataHoraPdf");
    if (!el) return;
    const d = new Date();
    el.innerText = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
