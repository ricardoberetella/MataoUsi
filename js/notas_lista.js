import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    const role = user.user_metadata?.role || "viewer";
    if (role === "viewer") {
        const btnNovaNF = document.getElementById("btnNovaNF");
        if (btnNovaNF) btnNovaNF.style.display = "none";
    }

    carregarNotas();

    // Exposição global das funções
    window.abrirModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'block';
        document.getElementById('resFaturamento').style.display = 'none';
    };
    window.fecharModalFaturamento = () => {
        document.getElementById('modalFaturamento').style.display = 'none';
    };
    window.calcularFaturamento = calcularFaturamento;
});

async function calcularFaturamento() {
    const mes = document.getElementById("fatMes").value;
    const ano = document.getElementById("fatAno").value;
    const tipo = document.getElementById("fatTipo").value;
    const resDiv = document.getElementById("resFaturamento");
    const valorTotalTxt = document.getElementById("valorTotal");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando...";

    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes}-${ultimoDia}`;

    try {
        // 1. Pega as NFs do mês
        let queryNF = supabase.from("notas_fiscais").select("numero_nf").gte("data_nf", dataInicio).lte("data_nf", dataFim);
        
        if (tipo === "com_nf") queryNF = queryNF.not("numero_nf", "eq", "Sem NF");
        else if (tipo === "sem_nf") queryNF = queryNF.eq("numero_nf", "Sem NF");

        const { data: notas, error: errNF } = await queryNF;
        if (errNF) throw errNF;

        if (!notas || notas.length === 0) {
            valorTotalTxt.innerText = "R$ 0,00 (Nenhuma NF)";
            return;
        }

        // Criar lista de busca limpa
        const listaNumeros = notas.map(n => String(n.numero_nf).trim().toUpperCase());
        console.log("Números de NF encontrados no mês:", listaNumeros);

        // 2. Busca no Financeiro (contas_receber)
        const { data: financeiro, error: errFin } = await supabase.from("contas_receber").select("descricao, valor");
        if (errFin) throw errFin;

        // 3. Soma Cruzada
        let total = 0;
        financeiro.forEach(item => {
            const desc = item.descricao ? String(item.descricao).toUpperCase() : "";
            
            const pertence = listaNumeros.some(num => {
                if (num === "SEM NF") return desc === "SEM NF";
                // Verifica se o número da nota está contido na descrição (ex: "BOLETO NF 123")
                return desc.includes(num);
            });

            if (pertence) {
                total += parseFloat(item.valor) || 0;
            }
        });

        valorTotalTxt.innerText = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    } catch (err) {
        console.error("Erro Crítico:", err);
        valorTotalTxt.innerText = "Erro: Verifique o Console (F12)";
    }
}

// Funções de listagem (Mantidas conforme original)
async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>`;
    const { data } = await supabase.from("notas_fiscais").select(`id, numero_nf, data_nf, clientes(razao_social)`).order("data_nf", { ascending: false });
    if (!data) return;
    tbody.innerHTML = "";
    data.forEach(nf => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${nf.numero_nf}</td><td>${nf.clientes?.razao_social ?? "-"}</td><td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone:"UTC"})}</td><td><button class="btn-secundario" onclick="verNF(${nf.id})">Ver</button></td>`;
        tbody.appendChild(tr);
    });
}

window.verNF = (id) => { window.location.href = `notas_ver.html?id=${id}`; };
