var supabase = window.supabaseClient;
const tabela = document.getElementById("listaPagar");
const modalNovo = document.getElementById("modalNovoPagar");
const modalEditar = document.getElementById("modalEditarPagar");

function moeda(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBR(data) { if (!data) return "-"; const p = data.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; }
function fecharModais() { modalNovo.style.display = "none"; modalEditar.style.display = "none"; }

async function carregarBancos() {
    const { data } = await supabase.from("bancos").select("id, nome").order("nome");
    ["novoBanco", "editBanco"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = data.map(b => `<option value="${b.id}">${b.nome}</option>`).join("");
    });
}

async function carregarContas() {
    const { data, error } = await supabase.from("contas_pagar").select("*, bancos(nome)").order("vencimento", { ascending: false });
    if (error) return console.error(error);
    tabela.innerHTML = "";
    data.forEach(l => {
        const tr = document.createElement("tr");
        const ePago = l.status === 'PAGO';
        tr.innerHTML = `
            <td>${dataBR(l.vencimento)}</td>
            <td>${l.bancos?.nome || "-"}</td>
            <td>${l.descricao}</td>
            <td>-</td>
            <td style="color:#ef4444; font-weight:bold">${moeda(l.valor)}</td>
            <td style="font-weight:bold; color: ${ePago ? '#22c55e' : '#f39c12'}">${l.status}</td>
            <td>
                ${!ePago ? `<button onclick="marcarPago('${l.id}')" class="btn btn-verde">Pagar</button>` : `<span style="color:#22c55e; margin-right:10px;">✓ Pago</span>`}
                <button onclick="abrirEditar('${l.id}')" class="btn btn-amarelo">Editar</button>
                <button onclick="excluirConta('${l.id}')" class="btn btn-vermelho">Excluir</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

async function abrirEditar(id) {
    const { data } = await supabase.from("contas_pagar").select("*").eq("id", id).single();
    if (data) {
        document.getElementById("editId").value = data.id;
        document.getElementById("editDescricao").value = data.descricao;
        document.getElementById("editValor").value = data.valor;
        document.getElementById("editVencimento").value = data.vencimento;
        document.getElementById("editBanco").value = data.banco_id;
        document.getElementById("editStatus").value = data.status;
        modalEditar.style.display = "flex";
    }
}

async function atualizarConta() {
    const id = document.getElementById("editId").value;
    const dados = {
        descricao: document.getElementById("editDescricao").value,
        valor: parseFloat(document.getElementById("editValor").value),
        vencimento: document.getElementById("editVencimento").value,
        banco_id: document.getElementById("editBanco").value,
        status: document.getElementById("editStatus").value
    };
    await supabase.from("contas_pagar").update(dados).eq("id", id);
    fecharModais();
    carregarContas();
}

async function excluirConta(id) {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
        await supabase.from("contas_pagar").delete().eq("id", id);
        carregarContas();
    }
}

async function marcarPago(id) {
    await supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id);
    carregarContas();
}

document.getElementById("btnNovoPagar").onclick = () => modalNovo.style.display = "flex";
document.getElementById("btnSalvarNovoPagar").onclick = async () => {
    const item = {
        descricao: document.getElementById("novoDescricao").value,
        valor: parseFloat(document.getElementById("novoValor").value.replace(",", ".")),
        vencimento: document.getElementById("novoVencimento").value,
        banco_id: document.getElementById("novoBanco").value,
        status: "ABERTO"
    };
    await supabase.from("contas_pagar").insert([item]);
    fecharModais();
    carregarContas();
};

document.getElementById("btnAtualizarPagar").onclick = atualizarConta;
window.onclick = (e) => { if (e.target.className === "modal") fecharModais(); };
window.marcarPago = marcarPago; window.abrirEditar = abrirEditar; window.excluirConta = excluirConta;

carregarBancos(); carregarContas();
