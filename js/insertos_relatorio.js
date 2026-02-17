import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.endsWith("insertos_lista.html")) carregarInsertos();
    
    // Vincula o evento de salvar se estiver na página de novo inserto
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        btnSalvar.onclick = salvarNovoInserto;
    }
});

// --- FUNÇÃO PARA GRAVAR O PRIMEIRO INSERTO ---
async function salvarNovoInserto() {
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const qtdInicial = parseInt(document.getElementById("ins_quantidade").value) || 0;

    if (!descricao) {
        alert("Por favor, preencha a descrição.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('insertos')
            .insert([
                { 
                    descricao: descricao, 
                    marca: marca, 
                    quantidade: qtdInicial // Nome exato da coluna na sua imagem
                }
            ]);

        if (error) throw error;

        alert("Inserto cadastrado com sucesso!");
        window.location.href = "insertos_lista.html";
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: " + error.message);
    }
}

// --- LISTAGEM ---
async function carregarInsertos() {
    const { data, error } = await supabase
        .from('insertos')
        .select('*')
        .order('descricao');

    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    if (error) {
        console.error("Erro ao carregar:", error);
        return;
    }

    tbody.innerHTML = data.map(ins => `
        <tr>
            <td>${ins.descricao}</td>
            <td>${ins.marca || '-'}</td>
            <td><b>${ins.quantidade}</b> un</td>
            <td style="text-align: center;">
                <button class="btn-mini btn-entrada" onclick="window.abrirModal('${ins.id}', 'entrada')">Entrada</button>
                <button class="btn-mini btn-saida" onclick="window.abrirModal('${ins.id}', 'saida')">Baixa</button>
            </td>
        </tr>
    `).join('');
}

// --- MOVIMENTAÇÃO (AJUSTADO PARA COLUNA 'QUANTIDADE') ---
window.abrirModal = (id, tipo) => {
    document.getElementById("modalMovimentacao").style.display = "flex";
    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? "Registrar Entrada" : "Registrar Baixa";
    document.getElementById("mov_data").value = new Date().toISOString().split('T')[0];
};

window.confirmarMovimento = async () => {
    const id = document.getElementById("modalId").value;
    const tipo = document.getElementById("modalTipo").value;
    const qtdMov = parseInt(document.getElementById("mov_qtd").value);
    const dataMov = document.getElementById("mov_data").value;
    const obs = document.getElementById("mov_obs").value;

    if (!qtdMov || qtdMov <= 0) return alert("Informe uma quantidade válida.");

    try {
        // 1. Busca saldo atual
        const { data: ins } = await supabase.from('insertos').select('quantidade').eq('id', id).single();
        
        // 2. Calcula novo saldo
        let novaQtd = tipo === 'entrada' ? ins.quantidade + qtdMov : ins.quantidade - qtdMov;
        if (novaQtd < 0) return alert("Estoque insuficiente!");

        // 3. Grava Movimentação
        await supabase.from('insertos_movimentacoes').insert([{
            inserto_id: id,
            tipo: tipo,
            quantidade: qtdMov,
            data: dataMov,
            observacao: obs
        }]);

        // 4. Atualiza saldo principal
        const { error } = await supabase.from('insertos').update({ quantidade: novaQtd }).eq('id', id);

        if (!error) {
            alert("Movimentação registrada!");
            location.reload();
        }
    } catch (error) {
        alert("Erro na operação.");
    }
};
