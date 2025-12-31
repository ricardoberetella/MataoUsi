// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL FINAL
// EDITAR + LANÇAMENTO MANUAL
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

let editandoId = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", carregarLancamentos);

    document.getElementById("btnGerarPDF")
        ?.addEventListener("click", gerarPDF);

    document.getElementById("btnLancamentoManual")
        ?.addEventListener("click", abrirModalNovo);

    criarModal();
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

    let query = supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar dados</td></tr>";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    data.forEach(l => {
        total += Number(l.valor || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.descricao}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${isoParaBR(l.data_vencimento)}</td>
            <td>${l.status}</td>
            <td style="display:flex; gap:6px; justify-content:center">
                <button class="btn-azul btn-editar"
                    data-id="${l.id}"
                    data-descricao="${l.descricao}"
                    data-valor="${l.valor}"
                    data-vencimento="${l.data_vencimento}"
                    data-status="${l.status}">
                    Editar
                </button>
                <button class="btn-vermelho">Pagar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    bindEditar();
}

// ======================================================
// EDITAR
// ======================================================
function bindEditar() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.status === "PAGO") {
                alert("Lançamento PAGO não pode ser editado.");
                return;
            }

            editandoId = btn.dataset.id;
            abrirModal(
                "Editar Lançamento",
                btn.dataset.descricao,
                btn.dataset.valor,
                isoParaBR(btn.dataset.vencimento),
                salvarEdicao
            );
        };
    });
}

// ======================================================
// MODAL ÚNICO (EDITAR / NOVO)
// ======================================================
function criarModal() {
    const style = document.createElement("style");
    style.innerHTML = `
        #modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.7);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        #modal .box {
            background: #0f172a;
            padding: 20px;
            border-radius: 12px;
            width: 320px;
            color: #fff;
        }
        #modal input {
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 6px;
            border: none;
        }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "modal";
    modal.innerHTML = `
        <div class="box">
            <h3 id="modalTitulo"></h3>
            <input id="mDescricao" placeholder="NF / Origem">
            <input id="mValor" type="number" step="0.01">
            <input id="mVencimento" placeholder="dd/mm/aaaa">
            <div style="display:flex; justify-content:flex-end; gap:10px">
                <button id="mCancelar" class="btn-vermelho">Cancelar</button>
                <button id="mSalvar" class="btn-verde">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("mCancelar").onclick = () => {
        modal.style.display = "none";
    };
}

function abrirModal(titulo, desc, valor, venc, acaoSalvar) {
    document.getElementById("modalTitulo").innerText = titulo;
    document.getElementById("mDescricao").value = desc || "";
    document.getElementById("mValor").value = valor || "";
    document.getElementById("mVencimento").value = venc || "";

    document.getElementById("mSalvar").onclick = acaoSalvar;
    document.getElementById("modal").style.display = "flex";
}

// ======================================================
// SALVAR EDIÇÃO
// ======================================================
async function salvarEdicao() {
    const descricao = mDescricao.value;
    const valor = mValor.value;
    const vencimento = brParaISO(mVencimento.value);

    await supabase
        .from("contas_receber")
        .update({ descricao, valor, data_vencimento: vencimento })
        .eq("id", editandoId);

    modal.style.display = "none";
    carregarLancamentos();
}

// ======================================================
// LANÇAMENTO MANUAL
// ======================================================
function abrirModalNovo() {
    editandoId = null;
    abrirModal(
        "Novo Lançamento",
        "",
        "",
        "",
        salvarNovo
    );
}

async function salvarNovo() {
    const descricao = mDescricao.value;
    const valor = mValor.value;
    const vencimento = brParaISO(mVencimento.value);

    await supabase.from("contas_receber").insert({
        descricao,
        valor,
        data_vencimento: vencimento,
        status: "ABERTO"
    });

    modal.style.display = "none";
    carregarLancamentos();
}

// ======================================================
function gerarPDF() {}
function atualizarDataHoraPDF() {}
