import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // Se estiver na lista de insertos, carrega a tabela
    if (path.includes("insertos_lista.html")) {
        carregarInsertos();
    }

    // Vincula o botão de salvar cadastro novo
    const btnSalvarNovo = document.getElementById("btnSalvarInserto");
    if (btnSalvarNovo) btnSalvarNovo.onclick = salvarNovoInserto;
});

// --- 1. FUNÇÕES DO MODAL (ENTRADA/BAIXA) ---
window.abrirModalMov = (id, tipo) => {
    console.log("Abrindo modal:", tipo, "para ID:", id);
    const modal = document.getElementById("modalMovimentacao");
    if (!modal) return alert("Erro: Modal de movimentação não encontrado no HTML.");

    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? "Registrar Entrada" : "Registrar Baixa";
    document.getElementById("mov_data").value = new Date().toISOString().split('T')[0];
    
    modal.style.display = "flex";
};

window.fecharModalMov = () => {
    document.getElementById("modalMovimentacao").style.display = "none";
};

window.confirmarMovimento = async () => {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtdMov = parseInt(document.getElementById("mov_qtd").value);
    const dataMov = document.getElementById("mov_data").value;
    const obs = document.getElementById("mov_obs").value;

    if (!qtdMov || qtdMov <= 0) return alert("Informe uma quantidade válida.");

    try {
        // Busca saldo atual (Coluna 'quantidade')
        const { data: ins, error: errFetch } = await supabase
            .from('insertos')
            .select('quantidade')
            .eq('id', id)
            .single();

        if (errFetch) throw errFetch;

        // Calcula novo saldo
        let novaQtd = tipo === 'entrada' ? Number(ins.quantidade) + qtdMov : Number(ins.quantidade) - qtdMov;
        if (novaQtd < 0) return alert("Estoque insuficiente!");

        // Grava na tabela de movimentações
        const { error: errMov } = await supabase.from('insertos_movimentacoes').insert([{
            inserto_id: id,
            tipo: tipo,
            quantidade: qtdMov,
            data: dataMov,
            observacao: obs
        }]);
        if (errMov) throw errMov;

        // Atualiza tabela principal
        const { error: errUpd } = await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);
        if (errUpd) throw errUpd;

        alert("Operação realizada!");
        location.reload();
    } catch (error) {
        alert("Erro: " + error.message);
    }
};

// --- 2. FUNÇÕES DE EDIÇÃO E EXCLUSÃO (DA LISTA PRINCIPAL) ---
window.excluirInsertoPrincipal = async (id) => {
    if (!confirm("Aviso: Isso excluirá o inserto e todo o seu histórico. Confirmar?")) return;
    try {
        const { error } = await supabase.from('insertos').delete().eq('id', id);
        if (error) throw error;
        alert("Inserto removido!");
        carregarInsertos();
    } catch (error) {
        alert("Erro ao excluir: " + error.message);
    }
};

// --- 3. CARREGAR TABELA ---
async function carregarInsertos() {
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    const { data, error } = await supabase
        .from('insertos')
        .select('*')
        .order('descricao');

    if (error) return console.error(error);

    tbody.innerHTML = data.map(ins => `
        <tr>
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td><b style="color: #38bdf8;">${ins.quantidade} un</b></td>
            <td style="text-align: center;">
                <button class="btn-mini btn-entrada" onclick="window.abrirModalMov('${ins.id}', 'entrada')">Entrada</button>
                <button class="btn-mini btn-saida" onclick="window.abrirModalMov('${ins.id}', 'saida')">Baixa</button>
                <button class="btn-mini btn-del" onclick="window.excluirInsertoPrincipal('${ins.id}')" style="background:#dc3545; margin-left:5px;">Excluir</button>
            </td>
        </tr>
    `).join('');
}

// --- 4. CADASTRO NOVO ---
async function salvarNovoInserto() {
    const desc = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const qtd = parseInt(document.getElementById("ins_quantidade").value) || 0;

    if (!desc) return alert("Preencha a descrição!");

    try {
        const { error } = await supabase.from('insertos').insert([{ 
            descricao: desc, marca: marca, quantidade: qtd 
        }]);
        if (error) throw error;
        alert("Salvo!");
        window.location.href = "insertos_lista.html";
    } catch (error) {
        alert("Erro: " + error.message);
    }
}
