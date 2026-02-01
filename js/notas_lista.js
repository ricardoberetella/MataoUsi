import { supabase, verificarLogin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await verificarLogin();
    if (!user) return;

    carregarNotas();

    // Vinculação Global
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
    const valorTotalTxt = document.getElementById("valorTotal");
    const resDiv = document.getElementById("resFaturamento");

    resDiv.style.display = "block";
    valorTotalTxt.innerText = "Calculando...";

    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;

    try {
        // 1. Buscar Notas Fiscais
        let queryNF = supabase.from("notas_fiscais").select("numero_nf").gte("data_nf", dataInicio).lte("data_nf", dataFim);
        
        if (tipo === "com_nf") queryNF = queryNF.not("numero_nf", "eq", "Sem NF");
        else if (tipo === "sem_nf") queryNF = queryNF.eq("numero_nf", "Sem NF");

        const { data: notas, error: errNF } = await queryNF;
        if (errNF) throw errNF;

        if (!notas || notas.length === 0) {
            valorTotalTxt.innerText = "R$ 0,00";
            return;
        }

        // Criar lista de números e remover zeros à esquerda para comparação flexível
        const listaNumeros = notas.map(n => n.numero_nf.toString().replace(/^0+/, '').trim().toUpperCase());

        // 2. Buscar Contas a Receber (Pegamos tudo para cruzar no JS)
        const { data: contas, error: errFin } = await supabase.from("contas_receber").select("descricao, valor");
        if (errFin) throw errFin;

        // 3. Soma com Cruzamento Inteligente
        let total = 0;
        contas.forEach(conta => {
            const desc = (conta.descricao || "").toUpperCase();
            
            const match = listaNumeros.some(num => {
                if (num === "SEM NF") return desc.includes("SEM NF");
                // Verifica se o número da NF (sem zeros) aparece na descrição
                return desc.includes(num);
            });

            if (match) {
                total += parseFloat(conta.valor) || 0;
            }
        });

        valorTotalTxt.innerHTML = `<strong style="color: #10b981;">${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>`;

    } catch (err) {
        console.error(err);
        valorTotalTxt.innerText = "Erro na conexão.";
    }
}

async function carregarNotas() {
    const tbody = document.getElementById("listaNotas");
    if (!tbody) return;
    const { data } = await supabase.from("notas_fiscais").select(`id, numero_nf, data_nf, clientes(razao_social)`).order("data_nf", { ascending: false });
    
    tbody.innerHTML = "";
    if (data) {
        data.forEach(nf => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nf.numero_nf}</td>
                <td>${nf.clientes?.razao_social ?? "-"}</td>
                <td>${new Date(nf.data_nf).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</td>
                <td><button class="btn-secundario" onclick="window.location.href='notas_ver.html?id=${nf.id}'">Ver</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}
