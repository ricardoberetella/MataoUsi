import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Vinculação com proteção contra NULL
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModal;

    const btnFechar = document.getElementById("btnFecharModal");
    if (btnFechar) btnFechar.onclick = () => document.getElementById("modalLancamento").style.display = "none";

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarDados;

    const btnTransferir = document.getElementById("btnTransferir");
    if (btnTransferir) btnTransferir.onclick = realizarTransferencia;

    atualizarTela();
});

async function carregarBancosNoSelect() {
    const select = document.getElementById("m_banco");
    if (!select) return;

    // Busca direta na sua tabela 'bancos'
    const { data: bancos, error } = await supabase.from("bancos").select("*").order("nome");

    if (error) {
        console.error("Erro Supabase:", error.message);
        return;
    }

    if (bancos) {
        select.innerHTML = '<option value="">Selecione o Banco...</option>';
        bancos.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = b.nome;
            select.appendChild(opt);
        });
        console.log("Bancos carregados no seletor.");
    }
}

async function abrirModal() {
    const modal = document.getElementById("modalLancamento");
    if (modal) {
        await carregarBancosNoSelect(); // Carrega antes de mostrar
        modal.style.display = "flex";
    }
}

async function atualizarTela() {
    // Proteção para não tentar escrever em tabelas que não existem na tela
    const lista = document.getElementById("listaPagar");
    const cards = document.getElementById("cardsBancos");

    const { data: contas } = await supabase.from("contas_pagar").select("*, bancos(nome)");
    if (lista && contas) {
        lista.innerHTML = contas.map(c => `
            <tr>
                <td>${c.descricao}</td>
                <td>${c.bancos?.nome || '---'}</td>
                <td>R$ ${c.valor}</td>
                <td>${c.vencimento}</td>
                <td>${c.status}</td>
            </tr>
        `).join('');
    }
}

async function salvarDados() {
    const desc = document.getElementById("m_descricao").value;
    const valor = document.getElementById("m_valor").value.replace(',', '.');
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    if (!desc || !valor || !data || !bancoId) return alert("Preencha tudo!");

    const { error } = await supabase.from("contas_pagar").insert([
        { descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancoId, status: "ABERTO" }
    ]);

    if (!error) {
        document.getElementById("modalLancamento").style.display = "none";
        atualizarTela();
    }
}

async function realizarTransferencia() {
    // Lógica de prompt simplificada
}
