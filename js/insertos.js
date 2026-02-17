import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Identifica a página atual
    const path = window.location.pathname;

    // 2. Vincula o botão de salvar (Página: Cadastrar Novo Inserto)
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        console.log("Botão de cadastro detectado.");
        btnSalvar.onclick = salvarNovoInserto;
    }

    // 3. Carrega a lista se estiver na página correta
    if (path.includes("insertos_lista.html")) {
        carregarInsertos();
    }
});

// --- FUNÇÃO PARA GRAVAR O PRIMEIRO INSERTO ---
async function salvarNovoInserto() {
    // Captura os dados dos inputs (IDs devem ser estes no HTML)
    const descricao = document.getElementById("ins_descricao")?.value;
    const marca = document.getElementById("ins_marca")?.value;
    const qtdInput = document.getElementById("ins_quantidade")?.value;
    const quantidade = parseInt(qtdInput) || 0;

    if (!descricao) {
        alert("Por favor, preencha a Descrição do Inserto.");
        return;
    }

    try {
        console.log("Iniciando gravação no Supabase...");
        
        // Insere na tabela 'insertos' usando a coluna 'quantidade'
        const { data, error } = await supabase
            .from('insertos')
            .insert([
                { 
                    descricao: descricao, 
                    marca: marca, 
                    quantidade: quantidade 
                }
            ])
            .select();

        if (error) throw error;

        alert("Inserto cadastrado com sucesso!");
        // Redireciona para a lista após salvar
        window.location.href = "insertos_lista.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: " + error.message);
    }
}

// --- FUNÇÃO PARA LISTAR OS INSERTOS ---
async function carregarInsertos() {
    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('insertos')
            .select('*')
            .order('descricao', { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum inserto encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(ins => `
            <tr>
                <td>${ins.descricao}</td>
                <td>${ins.marca || '-'}</td>
                <td style="color: #38bdf8; font-weight: bold;">${ins.quantidade} un</td>
                <td style="text-align: center;">
                    <button class="btn-mini btn-entrada" onclick="window.abrirModal('${ins.id}', 'entrada')">Entrada</button>
                    <button class="btn-mini btn-saida" onclick="window.abrirModal('${ins.id}', 'saida')">Baixa</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Erro na listagem:", error);
    }
}
