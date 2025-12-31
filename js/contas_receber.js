// ======================================================
// CONTAS_RECEBER.JS — ESTÁVEL FINAL
// ======================================================

import { supabase, verificarLogin } from "./auth.js";

let editandoId = null;

// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    document.getElementById("btnFiltrar")?.addEventListener("click", carregarLancamentos);
    document.getElementById("btnGerarPDF")?.addEventListener("click", gerarPDF);

    // 🔥 BOTÃO LANÇAMENTO MANUAL (CORRIGIDO)
    document.querySelector(".btn-verde")?.addEventListener("click", abrirNovo);

    criarModal();
    carregarLancamentos();
});

// ======================================================
function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function isoParaBR(d) {
    if (!d) return "";
    const [y,m,dd] = d.split("-");
    return `${dd}/${m}/${y}`;
}

function brParaISO(d) {
    if (!d) return null;
    const [dd,m,y] = d.split("/");
    return `${y}-${m}-${dd}`;
}

// ======================================================
async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    totalEl.innerText = "R$ 0,00";

    const { data, error } = await supabase
        .from("contas_receber")
        .select("id, descricao, valor, data_vencimento, status")
        .order("data_vencimento");

    if (error) {
        console.error(error);
        tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar</td></tr>";
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
                <button class="btn-azul editar"
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
function bindEditar() {
    document.querySelectorAll(".editar").forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.status === "PAGO") {
                alert("Lançamento pago não pode ser editado");
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
// MODAL
// ======================================================
function criarModal() {
    const modal = document.createElement("div");
    modal.id = "modal";
    modal.style = `
        position:fixed; inset:0; background:rgba(0,0,0,.7);
        display:none; align-items:center; justify-content:center; z-index:9999
    `;

    modal.innerHTML = `
        <div style="background:#0f172a;padding:20px;border-radius:12px;width:320px;color:#fff">
            <h3 id="tituloModal"></h3>
            <input id="campoDesc" placeholder="NF / Origem" style="width:100%;margin-bottom:8px">
            <input id="campoValor" type="number" step="0.01" style="width:100%;margin-bottom:8px">
            <input id="campoVenc" placeholder="dd/mm/aaaa" style="width:100%;margin-bottom:12px">
            <div style="display:flex;justify-content:flex-end;gap:8px">
                <button id="cancelar" class="btn-vermelho">Cancelar</button>
                <button id="salvar" class="btn-verde">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("cancelar").onclick = () => modal.style.display = "none";
}

// ======================================================
function abrirModal(titulo, desc, valor, venc, acao) {
    document.getElementById("tituloModal").innerText = titulo;
    document.getElementById("campoDesc").value = desc || "";
    document.getElementById("campoValor").value = valor || "";
    document.getElementById("campoVenc").value = venc || "";

    document.getElementById("salvar").onclick = acao;
    document.getElementById("modal").style.display = "flex";
}

// ======================================================
function abrirNovo() {
    editandoId = null;
    abrirModal("Novo Lançamento", "", "", "", salvarNovo);
}

// ======================================================
async function salvarNovo() {
    await supabase.from("contas_receber").insert({
        descricao: campoDesc.value,
        valor: campoValor.value,
        data_vencimento: brParaISO(campoVenc.value),
        status: "ABERTO"
    });

    modal.style.display = "none";
    carregarLancamentos();
}

// ======================================================
async function salvarEdicao() {
    await supabase
        .from("contas_receber")
        .update({
            descricao: campoDesc.value,
            valor: campoValor.value,
            data_vencimento: brParaISO(campoVenc.value)
        })
        .eq("id", editandoId);

    modal.style.display = "none";
    carregarLancamentos();
}

// ======================================================
function gerarPDF() {}
