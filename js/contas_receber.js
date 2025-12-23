// ===============================================
// CONTAS_RECEBER.JS — ESTÁVEL (PROMPT)
// ===============================================

import { supabase, verificarLogin } from "./auth.js";

let roleUsuario = "viewer";
let registros = [];

// ===============================================
function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    return dataISO.split("T")[0].split("-").reverse().join("/");
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return "—";
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    roleUsuario = user.user_metadata?.role || "viewer";

    document.getElementById("btnFiltrar")?.addEventListener("click", renderizarTabela);

    const btnManual = document.getElementById("btnNovoManual");
    if (btnManual && roleUsuario === "admin") {
        btnManual.onclick = lancamentoManual;
    }

    await carregarBoletos();
    renderizarTabela();
});

// ===============================================
// CARREGAR BOLETOS
// ===============================================
async function carregarBoletos() {
    const { data, error } = await supabase
        .from("boletos")
        .select("id, origem, valor, data_vencimento, status")
        .order("data_vencimento", { ascending: true });

    if (error) {
        alert("Erro ao carregar contas a receber");
        registros = [];
        return;
    }

    registros = data || [];
}

// ===============================================
function renderizarTabela() {
    const tbody = document.getElementById("listaReceber");
    if (!tbody) return;

    tbody.innerHTML = "";

    const statusFiltro = document.getElementById("filtroStatus")?.value || "";
    const vencimentoFiltro = document.getElementById("filtroVencimento")?.value || "";

    let total = 0;
    const hoje = new Date().toISOString().split("T")[0];

    registros.forEach(r => {
        let statusCalc = r.status || "ABERTO";

        if (statusCalc === "ABERTO" && r.data_vencimento < hoje) {
            statusCalc = "VENCIDO";
        }

        if (statusFiltro && statusFiltro !== "Todos" && statusFiltro !== statusCalc) return;
        if (vencimentoFiltro && r.data_vencimento > vencimentoFiltro) return;

        total += Number(r.valor || 0);

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center">${r.origem || "—"}</td>
                <td style="text-align:center">${formatarMoeda(r.valor)}</td>
                <td style="text-align:center">${formatarDataBR(r.data_vencimento)}</td>
                <td style="text-align:center">${statusCalc}</td>
                <td style="text-align:center">${renderizarAcoes(r)}</td>
            </tr>
        `;
    });

    const totalSpan = document.getElementById("totalReceber");
    if (totalSpan) totalSpan.textContent = formatarMoeda(total);
}

// ===============================================
function renderizarAcoes(r) {
    if (roleUsuario !== "admin") return "—";

    if (r.status === "ABERTO") {
        return `<button class="btn-verde" onclick="marcarPago(${r.id})">Pagar</button>`;
    }

    if (r.status === "PAGO") {
        return `<button class="btn-azul" onclick="reabrir(${r.id})">Reabrir</button>`;
    }

    return "—";
}

// ===============================================
window.marcarPago = async id => {
    if (!confirm("Marcar como pago?")) return;

    await supabase.from("boletos")
        .update({ status: "PAGO" })
        .eq("id", id);

    await carregarBoletos();
    renderizarTabela();
};

window.reabrir = async id => {
    if (!confirm("Reabrir este lançamento?")) return;

    await supabase.from("boletos")
        .update({ status: "ABERTO" })
        .eq("id", id);

    await carregarBoletos();
    renderizarTabela();
};

// ===============================================
// LANÇAMENTO MANUAL (PROMPT — ESTÁVEL)
// ===============================================
async function lancamentoManual() {
    if (roleUsuario !== "admin") return;

    const origem = prompt("Origem (ex: 6231A, NF-ANTIGA-2022):");
    const valorStr = prompt("Valor (ex: 15890.50):");
    const dataBR = prompt("Vencimento (DD/MM/AAAA):");

    if (!valorStr || !dataBR) {
        alert("Valor e vencimento são obrigatórios");
        return;
    }

    // ===== CONVERTE DATA BR → ISO (SEM -1 DIA)
    const partes = dataBR.split("/");
    if (partes.length !== 3) {
        alert("Data inválida. Use DD/MM/AAAA");
        return;
    }

    const dataISO = `${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`;

    const { error } = await supabase.from("boletos").insert({
        origem: origem || null,
        valor: Number(valorStr.replace(",", ".")),
        data_vencimento: dataISO,
        status: "ABERTO"
    });

    if (error) {
        alert("Erro ao lançar manualmente");
        return;
    }

    await carregarBoletos();
    renderizarTabela();
}
