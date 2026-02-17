import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // Vincula o botão de salvar novo inserto
    const btnSalvarNovo = document.getElementById("btnSalvarInserto");
    if (btnSalvarNovo) {
        btnSalvarNovo.onclick = salvarNovoInserto;
    }

    if (path.includes("insertos_lista.html")) {
        carregarInsertos();
    }
});

// --- FUNÇÃO PARA SALVAR NOVO INSERTO ---
async function salvarNovoInserto() {
    // Captura os elementos do DOM
    const elDesc = document.getElementById("ins_descricao");
    const elMarca = document.getElementById("ins_marca");
    const elQtd = document.getElementById("ins_quantidade");

    // Verifica se os elementos existem para evitar o erro de 'null'
    if (!elDesc || !elMarca || !elQtd) {
        console.error("Erro: Um ou mais campos de entrada não foram encontrados no HTML.");
        alert("Erro técnico: Campos do formulário não encontrados.");
        return;
    }

    const descricao = elDesc.value.trim();
    const marca = elMarca.value.trim();
    const quantidade = parseInt(elQtd.value) || 0;

    if (!descricao) {
        alert("Por favor, preencha a Descrição do Inserto.");
        return;
    }

    try {
        const { error } = await supabase
            .from('insertos')
            .insert([{ 
                descricao: descricao, 
                marca: marca, 
                quantidade: quantidade 
            }]);

        if (error) throw error;

        alert("Inserto cadastrado com sucesso!");
        window.location.href = "insertos_lista.html";
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: " + error.message);
    }
}

// --- FUNÇÕES DO MODAL (ENTRADA/BAIXA) ---
window.abrirModalMov = (id, tipo) => {
    const modal = document.getElementById("modalMovimentacao");
    if (!modal) return;

    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? "Registrar Entrada" : "Registrar Baixa";
    document.getElementById("mov_data").value = new Date().toISOString().split('T')[0];
    
    modal.style.display = "flex";
};

// Corrige o erro 'fecharModal is not defined'
window.fecharModalMov = () => {
    const modal = document.getElementById("modalMovimentacao");
    if (modal) modal.style.display = "none";
};

window.confirmarMovimento = async () => {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtdMov = parseInt(document.getElementById("mov_qtd").value);
    const dataMov = document.getElementById("mov_data").value;
    const obs = document.getElementById("mov_obs").value;

    if (!qtdMov || qtdMov <= 0) return alert("Informe uma quantidade válida.");

    try {
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('quantidade')
            .eq('id', id)
            .single();

        if (errFetch) throw errFetch;

        let novaQtd = tipo === 'entrada' ? Number(ins.quantidade) + qtdMov : Number(ins.quantidade) - qtdMov;
        if (novaQtd < 0) return alert("Estoque insuficiente!");

        await supabase.from('insertos_movimentacoes').insert([{
            inserto_id: id,
            tipo: tipo,
            quantidade: qtdMov,
            data: dataMov,
            observacao: obs
        }]);

        await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);

        alert("Operação realizada!");
        location.reload();
    } catch (error) {
        alert("Erro: " + error.message);
    }
};

// --- LISTAGEM ---
async function carregarInsertos() {
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    const { data, error } = await supabase.from('insertos').select('*').order('descricao');
    if (error) return;

    tbody.innerHTML = data.map(ins => `
        <tr>
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td><b style="color: #38bdf8;">${ins.quantidade} un</b></td>
            <td style="text-align: center;">
                <button class="btn-mini btn-entrada" onclick="window.abrirModalMov('${ins.id}', 'entrada')">Entrada</button>
                <button class="btn-mini btn-saida" onclick="window.abrirModalMov('${ins.id}', 'saida')">Baixa</button>
            </td>
        </tr>
    `).join('');
}
