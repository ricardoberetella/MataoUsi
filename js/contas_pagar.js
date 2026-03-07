import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Configuração de cliques com proteção contra elementos inexistentes
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModal;

    const btnFechar = document.getElementById("btnFecharModal");
    if (btnFechar) btnFechar.onclick = () => {
        document.getElementById("modalLancamento").style.display = "none";
    };

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarDados;

    const btnFiltrar = document.getElementById("btnFiltrar");
    if (btnFiltrar) btnFiltrar.onclick = carregarDados;

    const btnTransferir = document.getElementById("btnTransferir");
    if (btnTransferir) btnTransferir.onclick = realizarTransferencia;

    carregarDados();
});

// Busca bancos e remove a "APLICAÇÃO"
async function carregarBancosNoSelect() {
    const select = document.getElementById("m_banco");
    if (!select) return;

    const { data: bancos, error } = await supabase.from("bancos").select("*").order("nome");

    if (error) {
        console.error("Erro Supabase:", error.message);
        return;
    }

    if (bancos) {
        // Filtra para remover a APLICAÇÃO do seletor
        const filtrados = bancos.filter(b => b.nome !== "APLICAÇÃO");
        
        select.innerHTML = '<option value="">Selecione o Banco...</option>' + 
            filtrados.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        
        console.log("Bancos carregados (Aplicação removida).");
    }
}

async function abrirModal() {
    const modal = document.getElementById("modalLancamento");
    if (modal) {
        await carregarBancosNoSelect(); // Carrega os bancos ANTES de mostrar
        modal.style.display = "flex";
    }
}

async function carregarDados() {
    const lista = document.getElementById("listaPagar");
    const cards = document.getElementById("cardsBancos");

    // Carrega Cards de Saldo
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    if (cards && bancos) {
        cards.innerHTML = bancos.map(b => `
            <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; flex: 1;">
                <div class="label-futuro" style="font-size: 0.6rem;">${b.nome}</div>
                <div style="color: white; font-weight: bold;">R$ ${b.saldo.toFixed(2)}</div>
            </div>
        `).join('');
    }

    // Carrega Tabela
    const { data: contas } = await supabase.from("contas_pagar").select("*, bancos(nome)").order("vencimento");
    if (lista && contas) {
        lista.innerHTML = contas.map(c => `
            <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 12px;">${c.descricao}</td>
                <td>${c.bancos?.nome || '---'}</td>
                <td>R$ ${c.valor.toFixed(2)}</td>
                <td>${new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                <td><span style="color: ${c.status === 'PAGO' ? '#10b981' : '#facc15'}">${c.status}</span></td>
                <td>${c.status !== 'PAGO' ? `<button onclick="baixar('${c.id}', ${c.valor}, '${c.banco_id}')" class="btn-acao" style="background:#38bdf8; font-size:10px;">Pagar</button>` : '✅'}</td>
            </tr>
        `).join('');
    }
}

async function salvarDados() {
    const desc = document.getElementById("m_descricao").value;
    const valor = document.getElementById("m_valor").value.replace(',', '.');
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    if (!desc || isNaN(parseFloat(valor)) || !data || !bancoId) return alert("Preencha tudo!");

    const { error } = await supabase.from("contas_pagar").insert([{
        descricao: desc, valor: parseFloat(valor), vencimento: data, banco_id: bancoId, status: "ABERTO"
    }]);

    if (!error) {
        document.getElementById("modalLancamento").style.display = "none";
        carregarDados();
    }
}

async function realizarTransferencia() {
    const { data: bancos } = await supabase.from("bancos").select("*");
    const lista = bancos.map((b, i) => `${i + 1} - ${b.nome} (R$ ${b.saldo})`).join('\n');
    const de = prompt("Origem:\n" + lista);
    const para = prompt("Destino:\n" + lista);
    const valor = prompt("Valor:");

    if (de && para && valor) {
        const bDe = bancos[parseInt(de)-1];
        const bPara = bancos[parseInt(para)-1];
        const vNum = parseFloat(valor.replace(',', '.'));

        await supabase.from("bancos").update({ saldo: bDe.saldo - vNum }).eq("id", bDe.id);
        await supabase.from("bancos").update({ saldo: bPara.saldo + vNum }).eq("id", bPara.id);
        alert("Transferência concluída!");
        carregarDados();
    }
}

window.baixar = async (id, valor, bancoId) => {
    const { data: b } = await supabase.from("bancos").select("saldo").eq("id", bancoId).single();
    await supabase.from("contas_pagar").update({ status: 'PAGO' }).eq("id", id);
    await supabase.from("bancos").update({ saldo: b.saldo - valor }).eq("id", bancoId);
    carregarDados();
};
