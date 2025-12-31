// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL + EDITAR FUNCIONAL
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
// FORMATADORES
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
        btn.onclick = () => {

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
        };
    });
}

// ======================================================
// MODAL (CSS + HTML + JS)
// ======================================================
let editandoId = null;

function criarModalEdicao() {
    const style = document.createElement("style");
    style.innerHTML = `
        #modalEditar {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.65);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        #modalEditar .box {
            background: #0f172a;
            padding: 20px;
            border-radius: 12px;
            width: 320px;
            color: #fff;
            box-shadow: 0 0 20px rgba(56,189,248,.6);
        }
        #modalEditar input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border-radius: 6px;
            border: none;
        }
        #modalEditar .acoes {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "modalEditar";
    modal.innerHTML = `
        <div class="box">
            <h3>Editar Lançamento</h3>

            <input id="editDescricao" placeholder="NF / Origem">
            <input id="editValor" type="number" step="0.01">
            <input id="editVencimento" placeholder="dd/mm/aaaa">

            <div class="acoes">
                <button id="cancelarEdicao" class="btn-vermelho">Cancelar</button>
                <button id="salvarEdicao" class="btn-verde">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("cancelarEdicao").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("salvarEdicao").onclick = salvarEdicao;
}

function abrirModalEdicao(dados) {
    editandoId = dados.id;

    document.getElementById("editDescricao").value = dados.descricao;
    document.getElementById("editValor").value = dados.valor;
    document.getElementById("editVencimento").value = dados.vencimento;

    document.getElementById("modalEditar").style.display = "flex";
}

async function salvarEdicao() {
    const descricao = document.getElementById("editDescricao").value;
    const valor = document.getElementById("editValor").value;
    const vencimento = brParaISO(
        document.getElementById("editVencimento").value
    );

    const { error } = await supabase
        .from("contas_receber")
        .update({
            descricao,
            valor: Number(valor),
            data_vencimento: vencimento
        })
        .eq("id", editandoId);

    if (error) {
        alert("Erro ao salvar");
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
    html2pdf().from(document.getElementById("areaPdf")).save()
        .then(() => document.body.classList.remove("modo-pdf"));
}

// ======================================================
function atualizarDataHoraPDF() {}
