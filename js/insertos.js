import { supabase } from "./auth.js";

// Inicializa as funções ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    // Verifica se existe a tabela de listagem na página atual
    if (document.getElementById("corpoTabelaInsertos")) {
        carregarInsertos();
    }

    // Verifica se existe o botão de salvar (página de cadastro)
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", salvarNovoInserto);
    }
});

// --- LISTAGEM DE INSERTOS ---
async function carregarInsertos() {
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('insertos')
            .select('*')
            .order('descricao', { ascending: true });

        if (error) throw error;

        tbody.innerHTML = data.map(ins => {
            // Define se a quantidade está baixa para aplicar o estilo vermelho
            const classeQtd = ins.quantidade <= 2 ? 'badge-qtd qtd-baixa' : 'badge-qtd';
            
            return `
                <tr>
                    <td style="font-weight: bold;">${ins.descricao}</td>
                    <td>${ins.marca || '-'}</td>
                    <td><span class="${classeQtd}">${ins.quantidade}</span></td>
                    <td style="text-align: center;">
                        <button class="btn-tabela btn-entrada" onclick="window.abrirModal('${ins.id}', 'entrada', '${ins.descricao}')">↑ Entrada</button>
                        <button class="btn-tabela btn-saida" onclick="window.abrirModal('${ins.id}', 'saida', '${ins.descricao}')">↓ Saída</button>
                        <button class="btn-tabela btn-excluir" onclick="window.excluirInserto('${ins.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar insertos:", error.message);
    }
}

// --- CADASTRO DE NOVO INSERTO ---
async function salvarNovoInserto() {
    // Sincronizado com os IDs do HTML corrigido
    const descricao = document.getElementById("ins_descricao")?.value;
    const marca = document.getElementById("ins_marca")?.value;
    const quantidade = parseInt(document.getElementById("ins_quantidade")?.value) || 0;

    if (!descricao) {
        alert("Por favor, preencha a descrição do inserto.");
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
        alert("Erro ao salvar inserto: " + error.message);
    }
}

// --- FUNÇÕES DO MODAL (ENTRADA/SAÍDA) ---

// Torna as funções globais para serem chamadas pelo onclick do HTML
window.abrirModal = (id, tipo, descricao) => {
    const modal = document.getElementById("modalMovimentacao");
    if (!modal) return;

    document.getElementById("modalId").value = id;
    document.getElementById("modalTipo").value = tipo;
    document.getElementById("modalTitulo").innerText = tipo === 'entrada' ? `Entrada: ${descricao}` : `Saída: ${descricao}`;
    
    // Define a data de hoje como padrão
    document.getElementById("mov_data").value = new Date().toISOString().split('T')[0];
    document.getElementById("mov_qtd").value = 1;
    document.getElementById("mov_obs").value = "";
    
    modal.style.display = "flex";
};

// Corrige o erro de "função não definida" ao cancelar
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

    if (!qtdMov || qtdMov <= 0) {
        alert("Informe uma quantidade válida.");
        return;
    }

    try {
        // 1. Busca saldo atual
        const { data: ins, error: errBusca } = await supabase
            .from('insertos')
            .select('quantidade')
            .eq('id', id)
            .single();

        if (errBusca) throw errBusca;

        // 2. Calcula novo saldo
        const novaQtd = tipo === 'entrada' ? ins.quantidade + qtdMov : ins.quantidade - qtdMov;

        if (novaQtd < 0) {
            alert("Erro: Saldo insuficiente para realizar esta saída.");
            return;
        }

        // 3. Atualiza a tabela principal de insertos
        const { error: errUpdate } = await supabase
            .from('insertos')
            .update({ quantidade: novaQtd })
            .eq('id', id);

        if (errUpdate) throw errUpdate;

        // 4. Registra no histórico para os relatórios
        const { error: errHist } = await supabase
            .from('insertos_movimentacoes')
            .insert([{
                inserto_id: id,
                tipo: tipo,
                quantidade: qtdMov,
                data: dataMov,
                observacao: obs
            }]);

        if (errHist) throw errHist;

        window.fecharModalMov();
        carregarInsertos(); // Recarrega a lista para mostrar a nova quantidade
    } catch (error) {
        console.error("Erro na movimentação:", error);
        alert("Ocorreu um erro ao processar: " + error.message);
    }
};

window.excluirInserto = async (id) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este inserto?")) return;

    try {
        const { error } = await supabase.from('insertos').delete().eq('id', id);
        if (error) throw error;
        carregarInsertos();
    } catch (error) {
        alert("Erro ao excluir: " + error.message);
    }
};
