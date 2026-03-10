const supabase = window.supabaseClient;
const tabela = document.getElementById("listaPagar");

// Modais
const modalNovo = document.getElementById("modalNovoPagar");
const modalTransfer = document.getElementById("modalTransferencia");
const modalNF = document.getElementById("modalNfEntrada");

// --- UTILITÁRIOS ---
function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(data) {
    if (!data) return "-";
    const partes = data.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// --- CARREGAMENTO ---

async function carregarBancos() {
    const { data } = await supabase.from("bancos").select("id, nome");
    const selects = ["novoBanco", "nfBanco", "transferBancoOrigem", "transferBancoDestino"];
    
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join("");
        }
    });
}

async function carregarContas() {
    // Note que usamos banco_id conforme sua imagem da tabela contas_pagar
    const { data, error } = await supabase
        .from("contas_pagar")
        .select("*, bancos(nome)")
        .order("vencimento", { ascending: false });

    if (error) return console.error("Erro ao carregar contas:", error);

    tabela.innerHTML = "";
    data.forEach(l => {
        const tr = document.createElement("tr");
        const valorFormatado = moeda(l.valor);
        
        // Na sua tabela o status vem como "ABERTO" ou "PAGO"
        tr.innerHTML = `
            <td>${dataBR(l.vencimento)}</td>
            <td>${l.bancos?.nome || "Não definido"}</td>
            <td>${l.descricao}</td>
            <td>-</td> 
            <td class="valor-saida">${valorFormatado}</td>
            <td><span style="color: ${l.status === 'PAGO' ? '#22c55e' : '#f39c12'}">${l.status}</span></td>
            <td>
                ${l.status !== "PAGO" 
                    ? `<button onclick="marcarPago('${l.id}')" class="btn btn-verde">Pagar</button>` 
                    : `<span>✅</span>`}
            </td>
        `;
        tabela.appendChild(tr);
    });
}

// --- FUNÇÕES DE SALVAMENTO ---

async function salvarNovoPagar() {
    const novoItem = {
        descricao: document.getElementById("novoDescricao").value,
        valor: parseFloat(document.getElementById("novoValor").value.replace(",", ".")),
        vencimento: document.getElementById("novoVencimento").value,
        banco_id: document.getElementById("novoBanco").value,
        status: "ABERTO"
    };

    const { error } = await supabase.from("contas_pagar").insert([novoItem]);
    if (error) {
        alert("Erro ao salvar lançamento");
    } else {
        modalNovo.style.display = "none";
        carregarContas();
    }
}

async function salvarTransferencia() {
    const origem_id = document.getElementById("transferBancoOrigem").value;
    const destino_id = document.getElementById("transferBancoDestino").value;
    const valor = parseFloat(document.getElementById("transferValor").value.replace(",", "."));
    const data = document.getElementById("transferData").value;

    if(origem_id === destino_id) return alert("Os bancos devem ser diferentes!");

    const { error } = await supabase.from("transferencias_bancarias").insert([{
        origem_id, destino_id, valor, data_transferencia: data
    }]);

    if (error) alert("Erro na transferência");
    else {
        modalTransfer.style.display = "none";
        alert("Transferência realizada com sucesso!");
    }
}

// --- LOGICA DE PAGAMENTO ---
async function marcarPago(id) {
    const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO" })
        .eq("id", id);

    if (!error) carregarContas();
}

// --- EVENTOS ---
document.getElementById("btnNovoPagar").onclick = () => modalNovo.style.display = "flex";
document.getElementById("btnTransferir").onclick = () => modalTransfer.style.display = "flex";
document.getElementById("btnNfEntrada").onclick = () => modalNF.style.display = "flex";

document.getElementById("btnCancelarNovoPagar").onclick = () => modalNovo.style.display = "none";
document.getElementById("btnSalvarNovoPagar").onclick = salvarNovoPagar;
document.getElementById("btnSalvarTransferencia").onclick = salvarTransferencia;
document.getElementById("btnCancelarTransferencia").onclick = () => modalTransfer.style.display = "none";

// Inicialização
window.marcarPago = marcarPago;
carregarBancos();
carregarContas();
