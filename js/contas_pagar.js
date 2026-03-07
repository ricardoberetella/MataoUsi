import { supabase } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Vincula os cliques aos botões
    const btnNovo = document.getElementById("btnNovoPagar");
    if (btnNovo) btnNovo.onclick = abrirModalPagar;

    const btnTransferir = document.getElementById("btnTransferir");
    if (btnTransferir) btnTransferir.onclick = realizarTransferencia;

    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar) btnSalvar.onclick = salvarLancamento;
});

// ESTA FUNÇÃO BUSCA OS BANCOS NO SUPABASE
async function carregarSelectBancos() {
    const select = document.getElementById("m_banco");
    if (!select) return;

    try {
        const { data: bancos, error } = await supabase.from("bancos").select("*").order("nome");
        
        if (error) throw error;

        if (bancos) {
            // Preenche o select com os nomes: CAIXA FEDERAL, APLICAÇÃO, SICOOB
            select.innerHTML = '<option value="">Selecione o Banco...</option>' + 
                bancos.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
            console.log("Bancos carregados com sucesso!");
        }
    } catch (err) {
        console.error("Erro ao carregar bancos:", err.message);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function abrirModalPagar() {
    const modal = document.getElementById("modalLancamento");
    if (modal) {
        // PRIMEIRO CARREGA, DEPOIS MOSTRA
        await carregarSelectBancos(); 
        modal.style.display = "flex";
    }
}

async function realizarTransferencia() {
    // Busca bancos para a transferência entre contas
    const { data: bancos } = await supabase.from("bancos").select("*").order("nome");
    if (!bancos) return alert("Nenhum banco encontrado.");

    const lista = bancos.map((b, i) => `${i + 1} - ${b.nome} (Saldo: R$ ${b.saldo})`).join('\n');
    const de = prompt("Selecione o número da ORIGEM:\n" + lista);
    const para = prompt("Selecione o número do DESTINO:\n" + lista);
    const valor = prompt("Valor da transferência:");

    if (de && para && valor) {
        const bOrigem = bancos[parseInt(de)-1];
        const bDestino = bancos[parseInt(para)-1];
        const vNum = parseFloat(valor.replace(',', '.'));

        await supabase.from("bancos").update({ saldo: bOrigem.saldo - vNum }).eq("id", bOrigem.id);
        await supabase.from("bancos").update({ saldo: bDestino.saldo + vNum }).eq("id", bDestino.id);
        alert("Transferência realizada!");
    }
}

async function salvarLancamento() {
    const desc = document.getElementById("m_descricao").value;
    const valor = parseFloat(document.getElementById("m_valor").value.replace(',', '.'));
    const data = document.getElementById("m_data").value;
    const bancoId = document.getElementById("m_banco").value;

    if (!desc || !valor || !data || !bancoId) {
        alert("Preencha todos os campos, incluindo o Banco!");
        return;
    }

    const { error } = await supabase.from("contas_pagar").insert([
        { descricao: desc, valor: valor, vencimento: data, banco_id: bancoId, status: "ABERTO" }
    ]);

    if (!error) {
        alert("Lançamento salvo!");
        document.getElementById("modalLancamento").style.display = "none";
    } else {
        alert("Erro: " + error.message);
    }
}
