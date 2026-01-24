import { supabase, verificarLogin } from "./auth.js";

let editandoId = null;
let roleUsuario = "viewer"; 

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", carregarLancamentos);
    document.getElementById("btnGerarPDF")?.addEventListener("click", gerarPDF);

    if (roleUsuario !== "viewer") {
        document.getElementById("btnNovoManual")?.addEventListener("click", abrirModalNovo);
    } else {
        document.getElementById("btnNovoManual")?.remove();
    }

    document.getElementById("btnCancelarManual")?.addEventListener("click", fecharModal);
    document.getElementById("btnSalvarManual")?.addEventListener("click", salvarManual);

    atualizarDataHoraPDF();
    carregarLancamentos();
});

function formatarValor(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso) {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function carregarLancamentos() {
    const tbody = document.getElementById("listaReceber");
    const totalEl = document.getElementById("totalReceber");

    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    
    const statusFiltro = document.getElementById("filtroStatus").value;
    const vencimentoAte = document.getElementById("filtroVencimento").value;

    let query = supabase
        .from("contas_receber")
        .select("*")
        .order("data_vencimento", { ascending: true });

    if (vencimentoAte) query = query.lte("data_vencimento", vencimentoAte);

    const { data, error } = await query;
    if (error) {
        tbody.innerHTML = "<tr><td colspan='5'>Erro</td></tr>";
        return;
    }

    const hoje = hojeISO();
    let lista = data || [];

    // LÓGICA DE FILTRO ATUALIZADA
    if (statusFiltro === "PAGO") {
        lista = lista.filter(l => l.status === "PAGO");
    } else if (statusFiltro === "VENCIDO") {
        lista = lista.filter(l => l.status !== "PAGO" && l.data_vencimento < hoje);
    } else if (statusFiltro === "ABERTO") {
        // Agora o filtro "Aberto" mostra tudo que não está pago (Vencidos + A Vencer)
        lista = lista.filter(l => l.status !== "PAGO");
    }

    tbody.innerHTML = "";
    let total = 0;

    lista.forEach(l => {
        total += Number(l.valor || 0);
        const pago = l.status === "PAGO";
        const vencido = !pago && l.data_vencimento < hoje;

        let acoesHTML = "-";
        if (roleUsuario !== "viewer") {
            acoesHTML = `
                <button class="btn-azul btn-editar" data-id="${l.id}">Editar</button>
                ${pago 
                    ? `<button class="btn-cinza btn-reverter" data-id="${l.id}">Reverter</button>` 
                    : `<button class="btn-pagar" data-id="${l.id}">Pagar</button>`}
            `;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.descricao || "-"}</td>
            <td>${formatarValor(l.valor)}</td>
            <td>${formatarData(l.data_vencimento)}</td>
            <td>${vencido ? "VENCIDO" : l.status}</td>
            <td class="td-acoes">${acoesHTML}</td>
        `;

        if (vencido) {
            tr.querySelectorAll("td").forEach((td, i) => {
                if (i < 4) {
                    td.style.color = "#ff3b3b";
                    td.style.fontWeight = "700";
                }
            });
        }
        tbody.appendChild(tr);
    });

    totalEl.innerText = formatarValor(total);
    if (roleUsuario !== "viewer") bindAcoes();
}

function bindAcoes() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.onclick = async () => {
            const { data } = await supabase.from("contas_receber").select("*").eq("id", btn.dataset.id).single();
            if (!data) return;
            editandoId = data.id;
            document.getElementById("tituloModal").innerText = "Editar Lançamento";
            document.getElementById("origemManual").value = data.descricao || "";
            document.getElementById("valorManual").value = data.valor || "";
            document.getElementById("vencimentoManual").value = data.data_vencimento || "";
            abrirModal();
        };
    });

    document.querySelectorAll(".btn-pagar").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Confirmar pagamento?")) return;
            await supabase.from("contas_receber").update({ status: "PAGO", data_pagamento: hojeISO() }).eq("id", btn.dataset.id);
            carregarLancamentos();
        };
    });

    document.querySelectorAll(".btn-reverter").forEach(btn => {
        btn.onclick = async () => {
            if (!confirm("Reverter pagamento?")) return;
            await supabase.from("contas_receber").update({ status: "ABERTO", data_pagamento: null }).eq("id", btn.dataset.id);
            carregarLancamentos();
        };
    });
}

function abrirModalNovo() {
    editandoId = null;
    document.getElementById("tituloModal").innerText = "Novo Lançamento Manual";
    document.getElementById("origemManual").value = "";
    document.getElementById("valorManual").value = "";
    document.getElementById("vencimentoManual").value = "";
    abrirModal();
}

function abrirModal() { document.getElementById("modalManual").classList.add("ativo"); }
function fecharModal() { document.getElementById("modalManual").classList.remove("ativo"); }

async function salvarManual() {
    const descricao = document.getElementById("origemManual").value.trim();
    const valor = Number(document.getElementById("valorManual").value);
    const venc = document.getElementById("vencimentoManual").value;

    if (!descricao || !valor || !venc) return alert("Preencha todos os campos");

    if (editandoId) {
        await supabase.from("contas_receber").update({ descricao, valor, data_vencimento: venc }).eq("id", editandoId);
    } else {
        await supabase.from("contas_receber").insert({ descricao, valor, data_vencimento: venc, status: "ABERTO" });
    }
    fecharModal();
    carregarLancamentos();
}

function gerarPDF() {
    document.body.classList.add("modo-pdf");
    html2pdf().from(document.getElementById("areaPdf")).save().then(() => document.body.classList.remove("modo-pdf"));
}

function atualizarDataHoraPDF() {
    const el = document.getElementById("dataHoraPdf");
    if (el) el.innerText = new Date().toLocaleString("pt-BR");
}
