const supabase = window.supabaseClient;

const tabela = document.getElementById("listaPagar");

const btnNovoPagar = document.getElementById("btnNovoPagar");
const btnNfEntrada = document.getElementById("btnNfEntrada");
const btnTransferir = document.getElementById("btnTransferir");

const modalNovoPagar = document.getElementById("modalNovoPagar");
const modalNfEntrada = document.getElementById("modalNfEntrada");
const modalTransferencia = document.getElementById("modalTransferencia");

const btnCancelarNovoPagar = document.getElementById("btnCancelarNovoPagar");
const btnSalvarNovoPagar = document.getElementById("btnSalvarNovoPagar");

const btnCancelarNfEntrada = document.getElementById("btnCancelarNfEntrada");
const btnSalvarNfEntrada = document.getElementById("btnSalvarNfEntrada");

const btnCancelarTransferencia = document.getElementById("btnCancelarTransferencia");
const btnSalvarTransferencia = document.getElementById("btnSalvarTransferencia");

const novoBanco = document.getElementById("novoBanco");
const novoDescricao = document.getElementById("novoDescricao");
const novoValor = document.getElementById("novoValor");
const novoVencimento = document.getElementById("novoVencimento");

const nfBanco = document.getElementById("nfBanco");
const nfDescricao = document.getElementById("nfDescricao");
const nfValor = document.getElementById("nfValor");
const nfVencimento = document.getElementById("nfVencimento");

const transferBancoOrigem = document.getElementById("transferBancoOrigem");
const transferBancoDestino = document.getElementById("transferBancoDestino");
const transferDescricao = document.getElementById("transferDescricao");
const transferValor = document.getElementById("transferValor");
const transferData = document.getElementById("transferData");

const BANCOS_NOVO_LANCAMENTO = ["SICOOB", "CAIXA FEDERAL"];
const BANCOS_TRANSFERENCIA = ["SICOOB", "CAIXA", "CAIXA FEDERAL"];

function moeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function dataBR(data) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function moedaParaNumero(valor) {
  if (!valor) return 0;
  return Number(String(valor).replace(/\./g, "").replace(",", "."));
}

function hojeISO() {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const d = String(hoje.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizar(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function bancoPermitido(nomeBanco, permitidos) {
  const nome = normalizar(nomeBanco);
  return permitidos.some((item) => nome === normalizar(item));
}

function abrirModal(modal) {
  if (modal) modal.style.display = "flex";
}

function fecharModal(modal) {
  if (modal) modal.style.display = "none";
}

function limparNovoLancamento() {
  if (novoBanco) novoBanco.value = "";
  if (novoDescricao) novoDescricao.value = "";
  if (novoValor) novoValor.value = "";
  if (novoVencimento) novoVencimento.value = hojeISO();
}

function limparNfEntrada() {
  if (nfBanco) nfBanco.value = "";
  if (nfDescricao) nfDescricao.value = "NF Entrada";
  if (nfValor) nfValor.value = "";
  if (nfVencimento) nfVencimento.value = hojeISO();
}

function limparTransferencia() {
  if (transferBancoOrigem) transferBancoOrigem.value = "";
  if (transferBancoDestino) transferBancoDestino.value = "";
  if (transferDescricao) transferDescricao.value = "Transferência entre bancos";
  if (transferValor) transferValor.value = "";
  if (transferData) transferData.value = hojeISO();
}

async function carregarBancos() {
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const bancos = data || [];

  if (novoBanco) {
    novoBanco.innerHTML = `<option value="">Selecione</option>`;
    bancos
      .filter((b) => bancoPermitido(b.nome, BANCOS_NOVO_LANCAMENTO))
      .forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.nome;
        novoBanco.appendChild(opt);
      });
  }

  if (nfBanco) {
    nfBanco.innerHTML = `<option value="">Selecione</option>`;
    bancos
      .filter((b) => bancoPermitido(b.nome, BANCOS_NOVO_LANCAMENTO))
      .forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.nome;
        nfBanco.appendChild(opt);
      });
  }

  if (transferBancoOrigem) {
    transferBancoOrigem.innerHTML = `<option value="">Selecione</option>`;
    bancos
      .filter((b) => bancoPermitido(b.nome, BANCOS_TRANSFERENCIA))
      .forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.nome;
        transferBancoOrigem.appendChild(opt);
      });
  }

  if (transferBancoDestino) {
    transferBancoDestino.innerHTML = `<option value="">Selecione</option>`;
    bancos
      .filter((b) => bancoPermitido(b.nome, BANCOS_TRANSFERENCIA))
      .forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.nome;
        transferBancoDestino.appendChild(opt);
      });
  }
}

async function carregarContas() {
  const { data, error } = await supabase
    .from("contas_pagar")
    .select("*, bancos(nome)")
    .order("vencimento", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  tabela.innerHTML = "";

  if (!data || data.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:#94a3b8;">
          Nenhum lançamento encontrado
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((l) => {
    let entrada = "-";
    let saida = "-";

    if (l.tipo === "ENTRADA") {
      entrada = `<span class="valor-entrada">${moeda(l.valor)}</span>`;
    } else {
      saida = `<span class="valor-saida">${moeda(l.valor)}</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dataBR(l.vencimento)}</td>
      <td>${l.bancos?.nome || "-"}</td>
      <td>${l.descricao || "-"}</td>
      <td>${entrada}</td>
      <td>${saida}</td>
      <td>${l.status || "-"}</td>
      <td>
        ${
          l.status !== "PAGO"
            ? `<button onclick="marcarPago(${l.id})" class="btn btn-verde">Pagar</button>`
            : `<span style="color:#22c55e;font-weight:bold;">Pago</span>`
        }
      </td>
    `;
    tabela.appendChild(tr);
  });
}

async function salvarNovoLancamento() {
  const banco_id = novoBanco?.value || "";
  const descricao = novoDescricao?.value?.trim() || "";
  const valor = moedaParaNumero(novoValor?.value);
  const vencimento = novoVencimento?.value || "";

  if (!banco_id || !descricao || !valor || !vencimento) {
    alert("Preencha banco, descrição, valor e vencimento.");
    return;
  }

  const { error } = await supabase.from("contas_pagar").insert([{
    banco_id,
    descricao,
    valor,
    vencimento,
    status: "ABERTO",
    tipo: "SAIDA"
  }]);

  if (error) {
    console.error(error);
    alert("Erro ao salvar lançamento.");
    return;
  }

  fecharModal(modalNovoPagar);
  limparNovoLancamento();
  await carregarContas();
}

async function salvarNfEntrada() {
  const banco_id = nfBanco?.value || "";
  const descricao = nfDescricao?.value?.trim() || "NF Entrada";
  const valor = moedaParaNumero(nfValor?.value);
  const vencimento = nfVencimento?.value || "";

  if (!banco_id || !descricao || !valor || !vencimento) {
    alert("Preencha banco, descrição, valor e data.");
    return;
  }

  const { error } = await supabase.from("contas_pagar").insert([{
    banco_id,
    descricao,
    valor,
    vencimento,
    status: "ABERTO",
    tipo: "ENTRADA"
  }]);

  if (error) {
    console.error(error);
    alert("Erro ao salvar NF Entrada.");
    return;
  }

  fecharModal(modalNfEntrada);
  limparNfEntrada();
  await carregarContas();
}

async function salvarTransferencia() {
  const bancoOrigem = transferBancoOrigem?.value || "";
  const bancoDestino = transferBancoDestino?.value || "";
  const descricao = transferDescricao?.value?.trim() || "Transferência entre bancos";
  const valor = moedaParaNumero(transferValor?.value);
  const vencimento = transferData?.value || "";

  if (!bancoOrigem || !bancoDestino || !valor || !vencimento) {
    alert("Preencha origem, destino, valor e data.");
    return;
  }

  if (bancoOrigem === bancoDestino) {
    alert("Origem e destino não podem ser iguais.");
    return;
  }

  const { error } = await supabase.from("contas_pagar").insert([
    {
      banco_id: bancoOrigem,
      descricao: `${descricao} - saída`,
      valor,
      vencimento,
      status: "PAGO",
      tipo: "SAIDA"
    },
    {
      banco_id: bancoDestino,
      descricao: `${descricao} - entrada`,
      valor,
      vencimento,
      status: "PAGO",
      tipo: "ENTRADA"
    }
  ]);

  if (error) {
    console.error(error);
    alert("Erro ao salvar transferência.");
    return;
  }

  fecharModal(modalTransferencia);
  limparTransferencia();
  await carregarContas();
}

async function marcarPago(id) {
  const { error } = await supabase
    .from("contas_pagar")
    .update({ status: "PAGO" })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await carregarContas();
}

window.marcarPago = marcarPago;

if (btnNovoPagar) {
  btnNovoPagar.onclick = () => {
    limparNovoLancamento();
    abrirModal(modalNovoPagar);
  };
}

if (btnNfEntrada) {
  btnNfEntrada.onclick = () => {
    limparNfEntrada();
    abrirModal(modalNfEntrada);
  };
}

if (btnTransferir) {
  btnTransferir.onclick = () => {
    limparTransferencia();
    abrirModal(modalTransferencia);
  };
}

if (btnCancelarNovoPagar) {
  btnCancelarNovoPagar.onclick = () => fecharModal(modalNovoPagar);
}

if (btnCancelarNfEntrada) {
  btnCancelarNfEntrada.onclick = () => fecharModal(modalNfEntrada);
}

if (btnCancelarTransferencia) {
  btnCancelarTransferencia.onclick = () => fecharModal(modalTransferencia);
}

if (btnSalvarNovoPagar) {
  btnSalvarNovoPagar.onclick = salvarNovoLancamento;
}

if (btnSalvarNfEntrada) {
  btnSalvarNfEntrada.onclick = salvarNfEntrada;
}

if (btnSalvarTransferencia) {
  btnSalvarTransferencia.onclick = salvarTransferencia;
}

if (modalNovoPagar) {
  modalNovoPagar.addEventListener("click", (e) => {
    if (e.target === modalNovoPagar) fecharModal(modalNovoPagar);
  });
}

if (modalNfEntrada) {
  modalNfEntrada.addEventListener("click", (e) => {
    if (e.target === modalNfEntrada) fecharModal(modalNfEntrada);
  });
}

if (modalTransferencia) {
  modalTransferencia.addEventListener("click", (e) => {
    if (e.target === modalTransferencia) fecharModal(modalTransferencia);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharModal(modalNovoPagar);
    fecharModal(modalNfEntrada);
    fecharModal(modalTransferencia);
  }
});

async function init() {
  if (!supabase) {
    console.error("window.supabaseClient não encontrado");
    return;
  }

  await carregarBancos();
  limparNovoLancamento();
  limparNfEntrada();
  limparTransferencia();
  await carregarContas();
}

init();
