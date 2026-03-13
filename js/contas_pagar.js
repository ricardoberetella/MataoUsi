// Removemos o import que causava erro ("obterRole") para garantir que a página carregue
const _supabase = supabase;

let globalLock = false;
let roleUsuario = "viewer"; // Padrão por segurança

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));

function usuarioEhAdmin() {
  return roleUsuario === "admin";
}

// Esconde os botões e colunas se não for admin
function aplicarPermissoesUI() {
  const acoesTopo = document.getElementById("containerAcoesTopo");
  const thAcoes = document.getElementById("thAcoes");

  if (!usuarioEhAdmin()) {
    if (acoesTopo) acoesTopo.style.display = 'none';
    if (thAcoes) thAcoes.style.display = 'none';
  } else {
    if (acoesTopo) acoesTopo.style.display = 'flex';
    if (thAcoes) thAcoes.style.display = 'table-cell';
  }
}

function travarBotoesTabela(travar) {
  document.querySelectorAll(".btn-tabela").forEach((b) => {
    b.disabled = travar;
    b.style.opacity = travar ? "0.3" : "1";
    b.style.pointerEvents = travar ? "none" : "auto";
  });
}

function preencherFiltroAno() {
  const selectAno = document.getElementById("filtroAno");
  if (!selectAno) return;
  const anoAtual = new Date().getFullYear();
  let options = "";
  for (let ano = anoAtual - 3; ano <= anoAtual + 3; ano++) {
    options += `<option value="${ano}">${ano}</option>`;
  }
  selectAno.innerHTML = options;
}

function definirFiltroMesAtual() {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const filtroMes = document.getElementById("filtroMes");
  const filtroAno = document.getElementById("filtroAno");
  if (filtroMes) filtroMes.value = String(mesAtual);
  if (filtroAno) filtroAno.value = String(anoAtual);
}

window.limparFiltroMesAno = () => {
  definirFiltroMesAtual();
  carregarTudo();
};

function obterPeriodoFiltro() {
  const filtroMes = document.getElementById("filtroMes");
  const filtroAno = document.getElementById("filtroAno");
  const mes = Number(filtroMes?.value || new Date().getMonth() + 1);
  const ano = Number(filtroAno?.value || new Date().getFullYear());
  const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFim = `${proximoAno}-${String(proximoMes).padStart(2, "0")}-01`;
  return { dataInicio, dataFim };
}

function isTransferencia(item) {
  return (item?.descricao || "").startsWith("[TRANSFERÊNCIA]");
}

async function atualizarSaldoBanco(bancoId, valorDif) {
  const { data, error } = await _supabase.from("bancos").select("saldo").eq("id", bancoId).single();
  if (error || !data) return false;
  const novoSaldo = Number((Number(data.saldo || 0) + Number(valorDif || 0)).toFixed(2));
  const { error: updateError } = await _supabase.from("bancos").update({ saldo: novoSaldo }).eq("id", bancoId);
  return !updateError;
}

window.baixarPagamento = async (id) => {
  if (!usuarioEhAdmin() || globalLock) return;
  globalLock = true; travarBotoesTabela(true);
  try {
    const { data: item } = await _supabase.from("contas_pagar").select("*").eq("id", id).single();
    if (!item || isTransferencia(item) || item.status !== "PENDENTE") return;
    const { data: ok } = await _supabase.from("contas_pagar").update({ status: "PAGO" }).eq("id", id).eq("status", "PENDENTE").select("id");
    if (ok?.length === 1) await atualizarSaldoBanco(item.banco_id, Number(item.valor));
  } finally { globalLock = false; travarBotoesTabela(false); carregarTudo(); }
};

window.estornarPagamento = async (id) => {
  if (!usuarioEhAdmin() || globalLock) return;
  globalLock = true; travarBotoesTabela(true);
  try {
    const { data: item } = await _supabase.from("contas_pagar").select("*").eq("id", id).single();
    if (!item || isTransferencia(item) || item.status !== "PAGO") return;
    const { data: ok } = await _supabase.from("contas_pagar").update({ status: "PENDENTE" }).eq("id", id).eq("status", "PAGO").select("id");
    if (ok?.length === 1) await atualizarSaldoBanco(item.banco_id, Number(item.valor) * -1);
  } finally { globalLock = false; travarBotoesTabela(false); carregarTudo(); }
};

async function carregarTudo() {
  const { dataInicio, dataFim } = obterPeriodoFiltro();
  aplicarPermissoesUI();

  const { data: bancos } = await _supabase.from("bancos").select("*").order("nome", { ascending: true });
  if (bancos) {
    bancos.forEach((b) => {
      let id = b.nome === "SICOOB" ? "resumoSicoob" : b.nome === "CAIXA FEDERAL" ? "resumoCaixa" : "resumoAplicacao";
      const el = document.getElementById(id);
      if (el) el.innerText = fmt(b.saldo);
    });
    const campoBanco = document.getElementById("campoBanco");
    if (campoBanco) campoBanco.innerHTML = bancos.map((b) => `<option value="${b.id}">${b.nome}</option>`).join("");
  }

  const { data: rcb } = await _supabase.from("contas_receber").select("valor").eq("status", "ABERTO");
  if (rcb) document.getElementById("resumoReceber").innerText = fmt(rcb.reduce((acc, c) => acc + Number(c.valor || 0), 0));

  const { data: pnd } = await _supabase.from("contas_pagar").select("valor").eq("status", "PENDENTE").gte("vencimento", dataInicio).lt("vencimento", dataFim);
  if (pnd) document.getElementById("resumoPagar").innerText = fmt(pnd.reduce((acc, c) => acc + Math.abs(Number(c.valor || 0)), 0));

  const { data: lista } = await _supabase.from("contas_pagar").select("*, bancos(nome)").gte("vencimento", dataInicio).lt("vencimento", dataFim).order("vencimento", { ascending: false });

  const listaFinanceiro = document.getElementById("listaFinanceiro");
  if (!listaFinanceiro) return;

  listaFinanceiro.innerHTML = (lista || [])
    .map((item) => {
      const transferencia = isTransferencia(item);
      let colAcoes = "";
      
      if (usuarioEhAdmin()) {
        colAcoes = `
          <td style="text-align:center;">
            ${transferencia ? `<span style="color:#94a3b8;">—</span>` : item.status === "PENDENTE" 
              ? `<button onclick="baixarPagamento('${item.id}')" class="btn-tabela btn-pagar">Pagar</button>` 
              : `<button onclick="estornarPagamento('${item.id}')" class="btn-tabela btn-estornar">Estornar</button>`}
            ${transferencia ? "" : `<button onclick="editarRegistro('${item.id}')" class="btn-tabela btn-editar">✎</button>`}
            ${transferencia ? "" : `<button onclick="excluirRegistro('${item.id}')" class="btn-tabela btn-excluir">🗑</button>`}
          </td>`;
      }

      return `
        <tr>
          <td>${new Date(item.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${item.bancos?.nome || "--"}</td>
          <td>${item.descricao || ""}</td>
          <td style="color: ${Number(item.valor) < 0 ? "#ef4444" : "#22c55e"}">${fmt(item.valor)}</td>
          <td style="font-weight:bold; color: ${item.status === "PENDENTE" ? "#f59e0b" : "#38bdf8"}">${item.status}</td>
          ${colAcoes}
        </tr>`;
    }).join("");
}

// Funções de Modal e Escrita
window.abrirModal = (t) => { if(!usuarioEhAdmin()) return; document.getElementById("modalFinanceiro").style.display = "block"; };
window.fecharModais = () => document.getElementById("modalFinanceiro").style.display = "none";
window.abrirModalTransferencia = () => { if(!usuarioEhAdmin()) return; document.getElementById("modalTransferencia").style.display = "block"; };
window.fecharModalTransferencia = () => document.getElementById("modalTransferencia").style.display = "none";

async function iniciarPagina() {
  try {
      // Tenta ler a role salva pelo login ou usa viewer
      roleUsuario = localStorage.getItem('userRole') || "viewer";
  } catch (e) {
      console.warn("Erro ao ler permissões");
  }

  preencherFiltroAno();
  definirFiltroMesAtual();
  carregarTudo();
}

document.addEventListener("DOMContentLoaded", iniciarPagina);
