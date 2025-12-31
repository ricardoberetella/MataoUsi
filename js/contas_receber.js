// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL + EDITAR PROFISSIONAL
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", carregarLancamentos);

    document.getElementById("btnGerarPDF")
        ?.addEventListener("click", gerarPDF);

    criarModalEdicao();
    atualizarDataHoraPDF();
    carregarLancamentos();
});

// ======================================================
// FORMATADORES (SEM BUG DE DATA)
// ======================================================
function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function isoParaBR(dataISO) {
    if (!dataISO) return "";
    const [y, m, d] = dataISO.split("-");
    return `${d}/${m}/${y}`;
}

function brParaISO(dataBR) {
    if (!dataBR) return null;
    const [d, m, y] = dataBR.split("/");
    return `${y}-${m}-${d}`;
}

// ======================================================
// CARREGAR LANÇAMENTOS
// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoAte = document.getElementById("filtroVencimento")?.value || "";

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>Nenhum lançamento</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    data.forEach(l => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");
        if (l.status === "VENCIDO") tr.classList.add("vencido");

        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${isoParaBR(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar"
                    data-id="${l.id}"
                    data-descricao="${l.descricao || ""}"
                    data-valor="${l.valor || 0}"
                    data-vencimento="${l.data_vencimento || ""}"
                    data-status="${l.status}">
                    Editar
                </button>
                <button class="btn-vermelho btn-pagar" data-id="${l.id}">
                    Pagar
                </button>
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

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {

            if (btn.dataset.status === "PAGO") {
                alert("Lançamento PAGO não pode ser editado.");
                return;
            }

            abrirModalEdicao({
                id: btn.dataset.id,
                descricao: btn.dataset.descricao,
                valor: btn.dataset.valor,
                vencimento: isoParaBR(btn.dataset.vencimento)
            });
        });
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.addEventListener("click", () => {
            alert("Pagar ID: " + btn.dataset.id);
        });
    });
}

// ======================================================
// MODAL DE EDIÇÃO (BONITO E SEGURO)
// ======================================================
function criarModalEdicao() {
    const modal = document.createElement("div");
    modal.id = "modalEditar";
    modal.style.display = "none";
    modal.innerHTML = `
        <div class="modal-conteudo">
            <h3>Editar Lançamento</h3>

            <label>NF / Origem</label>
            <input id="editDescricao">

            <label>Valor</label>
            <input id="editValor" type="number" step="0.01">

            <label>Vencimento</label>
            <input id="editVencimento" placeholder="dd/mm/aaaa">

            <div class="modal-acoes">
                <button id="salvarEdicao" class="btn-verde">Salvar</button>
                <button id="cancelarEdicao" class="btn-vermelho">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

let editandoId = null;

function abrirModalEdicao(dados) {
    editandoId = dados.id;

    document.getElementById("editDescricao").value = dados.descricao;
    document.getElementById("editValor").value = dados.valor;
    document.getElementById("editVencimento").value = dados.vencimento;

    const modal = document.getElementById("modalEditar");
    modal.style.display = "flex";

    document.getElementById("cancelarEdicao").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("salvarEdicao").onclick = salvarEdicao;
}

async function salvarEdicao() {
    const descricao = document.getElementById("editDescricao").value;
    const valor = document.getElementById("editValor").value;
    const vencimentoBR = document.getElementById("editVencimento").value;

    const vencimentoISO = brParaISO(vencimentoBR);

    const { error } = await supabase
        .from("contas_receber")
        .update({
            descricao,
            valor: Number(valor),
            data_vencimento: vencimentoISO
        })
        .eq("id", editandoId);

    if (error) {
        alert("Erro ao salvar edição");
        console.error(error);
        return;
    }

    document.getElementById("modalEditar").style.display = "none";
    carregarLancamentos();
}

// ======================================================
// PDF
// ======================================================
function gerarPDF() {
    document.body.classList.add("modo-pdf");

    html2pdf()
        .from(document.getElementById("areaPdf"))
        .set({
            margin: 10,
            filename: "contas_a_receber.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 1 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .save()
        .then(() => document.body.classList.remove("modo-pdf"));
}

// ======================================================
// DATA / HORA PDF
// ======================================================
function atualizarDataHoraPDF() {
    const el = document.getElementById("dataHoraPdf");
    if (!el) return;

    const agora = new Date();
    el.innerText =
        agora.toLocaleDateString("pt-BR") +
        " " +
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
}
