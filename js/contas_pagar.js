import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Vinculação dos botões com verificação de existência para evitar erro de NULL
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModal;

    const btnFechar = document.getElementById("btnFecharModal");
    if (btnFechar) btnFechar.onclick = () => {
        document.getElementById("modalLancamento").style.display = "none";
    };

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarDados;

    atualizarTela();
});

async function carregarBancosNoSelect() {
    const select = document.getElementById("m_banco");
    if (!select) return;

    // Busca os bancos no Supabase
    const { data: bancos, error } = await supabase.from("bancos").select("*").order("nome");

    if (error) {
        console.error("Erro ao buscar bancos:", error.message);
        return;
    }

    if (bancos) {
        // Limpa o select e adiciona a opção padrão
        select.innerHTML = '<option value="">Selecione o Banco...</option>';
        
        // Filtra para NÃO incluir "APLICAÇÃO"
        const bancosFiltrados = bancos.filter(b => b.nome !== "APLICAÇÃO");

        bancosFiltrados.forEach(banco => {
            const option = document.createElement("option");
            option.value = banco.id;
            option.textContent = banco.nome;
            select.appendChild(option);
        });
        
        console.log("Seletor atualizado com " + bancosFiltrados.length + " bancos.");
    }
}

async function abrirModal() {
    const modal = document.getElementById("modalLancamento");
    if (modal) {
        // Força o carregamento dos bancos antes de mostrar a janela
        await carregarBancosNoSelect();
        modal.style.display = "flex";
    }
}

async function atualizarTela() {
    // Lógica para preencher a tabela 'listaPagar' e 'cardsBancos'
    // Adicione verificações 'if' para evitar o erro de 'properties of null' do seu print
}

async function salvarDados() {
    const desc = document.getElementById("m_descricao").value;
    const valor = document.getElementById("m_valor").value.replace(',', '.');
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    if (!desc || !valor || !data || !bancoId) {
        alert("Preencha todos os campos e escolha um banco!");
        return;
    }

    const { error } = await supabase.from("contas_pagar").insert([
        { descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancoId, status: "ABERTO" }
    ]);

    if (!error) {
        document.getElementById("modalLancamento").style.display = "none";
        atualizarTela();
    }
}
