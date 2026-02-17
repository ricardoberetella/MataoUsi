import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Verifica se estamos na página de cadastro para ativar o botão salvar
    const btnSalvar = document.getElementById("btnSalvarInserto");
    if (btnSalvar) {
        btnSalvar.onclick = salvarNovoInserto;
    }

    // Se estiver na lista, carrega os dados
    if (window.location.pathname.includes("insertos_lista.html")) {
        carregarInsertos();
    }
});

// --- FUNÇÃO PARA SALVAR O PRIMEIRO INSERTO (CORRIGIDA) ---
async function salvarNovoInserto() {
    console.log("Tentando salvar novo inserto...");

    // Captura os IDs conforme os campos do seu formulário
    const descricao = document.getElementById("ins_descricao").value;
    const marca = document.getElementById("ins_marca").value;
    const qtdStr = document.getElementById("ins_quantidade").value;
    const quantidade = parseInt(qtdStr) || 0;

    if (!descricao || descricao.trim() === "") {
        alert("A descrição é obrigatória!");
        return;
    }

    try {
        // Desativar botão para evitar múltiplos cliques
        const btn = document.getElementById("btnSalvarInserto");
        btn.disabled = true;
        btn.innerText = "Salvando...";

        const { data, error } = await supabase
            .from('insertos')
            .insert([
                { 
                    descricao: descricao, 
                    marca: marca, 
                    quantidade: quantidade // Nome exato da coluna na sua imagem do Supabase
                }
            ])
            .select();

        if (error) throw error;

        alert("Inserto cadastrado com sucesso!");
        window.location.href = "insertos_lista.html";

    } catch (error) {
        console.error("Erro detalhado:", error);
        alert("Erro ao salvar no banco: " + error.message);
    } finally {
        const btn = document.getElementById("btnSalvarInserto");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Salvar Inserto";
        }
    }
}

// --- FUNÇÃO DE LISTAGEM ---
async function carregarInsertos() {
    const { data, error } = await supabase
        .from('insertos')
        .select('*')
        .order('descricao', { ascending: true });

    const tbody = document.getElementById("corpoTabelaInsertos");
    if (!tbody) return;

    if (error) {
        console.error("Erro ao buscar dados:", error);
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
